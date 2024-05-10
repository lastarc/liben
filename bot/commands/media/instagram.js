const { SlashCommandBuilder } = require('discord.js');
const { ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { execSync } = require('child_process');
const fs = require('node:fs');
const S3 = require('../../s3');
const crypto = require('crypto');
const EmbedProxyClient = require('../../embed-proxy-client');
const { onCommandFail } = require('../../blame');

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
if (!S3_BUCKET_NAME) throw new Error('No bucket name provided');

const S3_PUBLIC_BUCKET_URL = process.env.S3_PUBLIC_BUCKET_URL;
if (!S3_PUBLIC_BUCKET_URL) throw new Error('No public bucket URL provided');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('instagram')
		.setDescription('Displays an embedded Instagram video.')
		.addStringOption(option => option.setName('url')
			.setDescription('The Instagram video URL.')
			.setRequired(true))
		.addBooleanOption(option => option.setName('force')
			.setDescription('Re-download?')),
	async execute(interaction) {
		const videoUrl = interaction.options.getString('url');
		const force = interaction.options.getBoolean('force') || false;
		console.log({ videoUrl, force });

		const replyMsg = await interaction.reply('Processing Instagram link...');

		// hash the videoUrl
		const hash = crypto
			.createHash('sha256')
			.update(videoUrl)
			.digest('hex')
			.slice(0, 16);

		let vurl = '', vwidth = 0, vheight = 0;

		// check if the video is already downloaded
		const data = await S3.send(new ListObjectsV2Command({
			Bucket: S3_BUCKET_NAME, Prefix: `instagram/${hash}-`,
		}));

		console.log(data);

		if (data.KeyCount !== 0 && force) {
			console.log('Existing video with `force`, deleting');
			await S3.send(new DeleteObjectCommand({
				Bucket: S3_BUCKET_NAME,
				Key: data.Contents[0].Key,
			}));
		}

		if (data.KeyCount === 0 || force) {
			// download the video
			execSync('mkdir -p tmp/instagram');
			try {
				execSync(`yt-dlp --cookies ./cookies.txt -f bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best -S vcodec:h264 -o ./tmp/instagram/${hash}.mp4 ` + videoUrl, {
					stdio: 'inherit',
				});
			} catch (e) {
				console.error(e);
				await replyMsg.edit('Error downloading video');
				await onCommandFail(interaction.client, interaction.channelId);
				return;
			}

			// get width and height
			let width = 0, height = 0;
			try {
				const res = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height,codec_name -of json ./tmp/instagram/${hash}.mp4`).toString();
				console.log(res);
				const stream = JSON.parse(res).streams[0];
				width = stream.width;
				height = stream.height;
			} catch (e) {
				console.error(e);
				await replyMsg.edit('No video found in URL');
				return;
			}

			// upload the video
			await S3.send(new PutObjectCommand({
				Bucket: S3_BUCKET_NAME,
				Key: `instagram/${hash}-${width}x${height}.mp4`,
				Body: fs.createReadStream(`./tmp/instagram/${hash}.mp4`),
			}));

			// delete the video
			execSync(`rm -f ./tmp/instagram/${hash}.mp4`);

			vurl = `${S3_PUBLIC_BUCKET_URL}/instagram/${hash}-${width}x${height}.mp4`;
			vwidth = width;
			vheight = height;
		} else {
			// get width and height from the first file
			const res = data.Contents[0].Key;
			console.log(res);
			// eslint-disable-next-line no-unused-vars
			const [_, width, height] = res.match(/instagram\/.*-(\d+)x(\d+)\.mp4/);

			vurl = `${S3_PUBLIC_BUCKET_URL}/${res}`;
			vwidth = width;
			vheight = height;
		}

		console.log(vurl, vwidth, vheight);
		const embeddableUrl = await EmbedProxyClient.add(vurl, parseInt(vwidth, 10), parseInt(vheight, 10));
		await replyMsg.edit(`${embeddableUrl}`);
	},
};
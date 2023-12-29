const { SlashCommandBuilder } = require('discord.js');
const { ListObjectsV2Command, PutObjectCommand } = require('@aws-sdk/client-s3');
const { execSync } = require('child_process');
const fs = require('node:fs');
const S3 = require('../../s3');
const crypto = require('crypto');

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
if (!S3_BUCKET_NAME) throw new Error('No bucket name provided');

const S3_PUBLIC_BUCKET_URL = process.env.S3_PUBLIC_BUCKET_URL;
if (!S3_PUBLIC_BUCKET_URL) throw new Error('No public bucket URL provided');

const EMBED_PROXY_URL = process.env.EMBED_PROXY_URL;
if (!EMBED_PROXY_URL) throw new Error('No embed proxy URL provided');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tiktok')
		.setDescription('Displays an embedded TikTok video.')
		.addStringOption(option => option.setName('url')
			.setDescription('The TikTok video URL.')
			.setRequired(true)), async execute(interaction) {
		const videoUrl = interaction.options.getString('url');

		const replyMsg = await interaction.reply('Processing TikTok link...');

		// hash the videoUrl
		const hash = crypto
			.createHash('sha256')
			.update(videoUrl)
			.digest('hex')
			.slice(0, 16);

		let vurl = '', vwidth = 0, vheight = 0;

		// check if the video is already downloaded
		const data = await S3.send(new ListObjectsV2Command({
			Bucket: S3_BUCKET_NAME, Prefix: `tiktok/${hash}-`,
		}));

		console.log(data);

		if (data.KeyCount === 0) {
			// download the video
			execSync('mkdir -p tmp/tiktok');
			try {
				execSync(`yt-dlp -q -f bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best -o ./tmp/tiktok/${hash}.mp4 ` + videoUrl, {
					stdio: 'inherit',
				});
			} catch (e) {
				console.error(e);
				await replyMsg.edit('Error downloading video');
				return;
			}

			// get width and height
			const res = '' + execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of json ./tmp/tiktok/${hash}.mp4`);
			console.log(res);
			const { width, height } = JSON.parse(res).streams[0];

			// upload the video
			await S3.send(new PutObjectCommand({
				Bucket: S3_BUCKET_NAME,
				Key: `tiktok/${hash}-${width}x${height}.mp4`,
				Body: fs.createReadStream(`./tmp/tiktok/${hash}.mp4`),
			}));

			// delete the video
			execSync(`rm -f ./tmp/tiktok/${hash}.mp4`);

			vurl = `${S3_PUBLIC_BUCKET_URL}/tiktok/${hash}-${width}x${height}.mp4`;
			vwidth = width;
			vheight = height;
		} else {
			// get width and height from the first file
			const res = data.Contents[0].Key;
			console.log(res);
			// eslint-disable-next-line no-unused-vars
			const [_, width, height] = res.match(/tiktok\/.*-(\d+)x(\d+)\.mp4/);

			vurl = `${S3_PUBLIC_BUCKET_URL}/${res}`;
			vwidth = width;
			vheight = height;
		}

		console.log(vurl, vwidth, vheight);
		const embeddableUrl = `${EMBED_PROXY_URL}/?src=${vurl}&width=${vwidth}&height=${vheight}`;
		await replyMsg.edit(`Done ${embeddableUrl}`);
	},
};
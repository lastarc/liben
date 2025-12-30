import {
  SlashCommandBuilder,
  type CacheType,
  type Interaction,
} from "discord.js";
import { execSync } from "child_process";
import S3 from "../../s3";
import crypto from "crypto";
import EmbedProxyClient from "../../embed-proxy-client";
import { onCommandFail } from "../../blame";
import configStore from "../../config-store";
import { file } from "bun";

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
if (!S3_BUCKET_NAME) throw new Error("No bucket name provided");

const S3_PUBLIC_BUCKET_URL = process.env.S3_PUBLIC_BUCKET_URL;
if (!S3_PUBLIC_BUCKET_URL) throw new Error("No public bucket URL provided");

export const matcher =
  /https:\/\/(?:m|www|vm|vt)?\.?tiktok\.com\/((?:.*\b(?:(?:usr|v|embed|user|video)\/|\?shareId=|&item_id=)(\d+))|\w+)/gim;

export default {
  data: new SlashCommandBuilder()
    .setName("tiktok")
    .setDescription("Displays an embedded TikTok video.")
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("The TikTok video URL.")
        .setRequired(true),
    )
    .addBooleanOption((option) =>
      option.setName("force").setDescription("Re-download?"),
    ),
  async execute(interaction: Interaction<CacheType>) {
    if (!interaction.isChatInputCommand()) return;
    const videoUrlRaw = interaction.options.getString("url", true);
    const force = interaction.options.getBoolean("force") || false;
    console.log({ videoUrlRaw, force });

    if (configStore.getOr("tiktok.enabled", "true") !== "true") {
      return;
    }

    const match = videoUrlRaw.match(matcher);
    const videoUrl = match?.[0];
    if (!videoUrl) {
      await interaction.reply("Invalid url");
      return;
    }

    const replyMsg = await interaction.reply("Processing TikTok link...");

    // hash the videoUrl
    const hash = crypto
      .createHash("sha256")
      .update(videoUrl)
      .digest("hex")
      .slice(0, 16);

    let vurl = "",
      vwidth = 0,
      vheight = 0;

    // check if the video is already downloaded
    const data = await S3.list({
      prefix: `tiktok/${hash}-`,
    });
    const existing = data.contents?.at(0);

    console.log(data);

    if (existing && force) {
      console.log("Existing video with `force`, deleting");
      await S3.delete(existing.key);
    }

    if (!existing || force) {
      // download the video
      execSync("mkdir -p tmp/tiktok");
      let ytdlpLogs = "";
      try {
        ytdlpLogs = execSync(
          `yt-dlp --cookies ./cookies.txt -f bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best -S vcodec:h264 -o ./tmp/tiktok/${hash}.mp4 ${videoUrl} 2>&1`,
          {
            encoding: "utf-8",
          },
        );
      } catch (e) {
        console.error(e);
        const errorLogs =
          e instanceof Error && "stdout" in e
            ? (e as any).stdout + "\n" + (e as any).stderr
            : ytdlpLogs;
        await replyMsg.edit("Error downloading video");
        await onCommandFail(interaction, e, errorLogs);
        return;
      }

      // get width and height
      let width = 0,
        height = 0;
      let ffprobeLogs = "";
      try {
        ffprobeLogs = execSync(
          `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,codec_name -of json ./tmp/tiktok/${hash}.mp4 2>&1`,
          { encoding: "utf-8" },
        );
        console.log(ffprobeLogs);
        const stream = JSON.parse(ffprobeLogs).streams[0];
        width = stream.width;
        height = stream.height;
      } catch (e) {
        console.error(e);
        const errorLogs =
          e instanceof Error && "stdout" in e
            ? (e as any).stdout + "\n" + (e as any).stderr
            : ffprobeLogs;
        await replyMsg.edit("No video found in URL");
        await onCommandFail(
          interaction,
          e,
          `yt-dlp logs:\n${ytdlpLogs}\n\nffprobe logs:\n${errorLogs}`,
        );
        return;
      }

      // upload the video
      await S3.write(
        `tiktok/${hash}-${width}x${height}.mp4`,
        file(`./tmp/tiktok/${hash}.mp4`),
      );

      // delete the video
      execSync(`rm -f ./tmp/tiktok/${hash}.mp4`);

      vurl = `${S3_PUBLIC_BUCKET_URL}/tiktok/${hash}-${width}x${height}.mp4`;
      vwidth = width;
      vheight = height;
    } else {
      // get width and height from the first file
      const res = existing.key;
      console.log(res);

      const match = res.match(/tiktok\/.*-(\d+)x(\d+)\.mp4/);
      if (!match || !match[1] || !match[2]) {
        throw new Error("File name format match failed");
      }

      vurl = `${S3_PUBLIC_BUCKET_URL}/${res}`;
      vwidth = parseInt(match[1], 10);
      vheight = parseInt(match[2], 10);
    }

    console.log(vurl, vwidth, vheight);
    const embeddableUrl = await EmbedProxyClient.add(vurl, vwidth, vheight);
    await replyMsg.edit(`${embeddableUrl}`);
  },
};

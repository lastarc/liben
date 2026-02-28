import { execSync } from "child_process";
import { file, sleep } from "bun";
import type {
  CacheType,
  ChatInputCommandInteraction,
  InteractionResponse,
  Message,
} from "discord.js";
import S3 from "../s3";
import { onCommandFail } from "../blame";

const S3_PUBLIC_BUCKET_URL = process.env.S3_PUBLIC_BUCKET_URL;
if (!S3_PUBLIC_BUCKET_URL) throw new Error("No public bucket URL provided");

async function withRetry<T>(
  fn: () => T,
  maxAttempts = 3,
  delayMs = 3000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return fn();
    } catch (e) {
      lastError = e;
      if (attempt < maxAttempts) {
        const jitteredDelay = delayMs + delayMs * 0.2 * Math.random();
        await sleep(jitteredDelay);
      }
    }
  }
  throw lastError;
}

export interface PipelineOptions {
  platform: string;
  hash: string;
  videoUrl: string;
  force: boolean;
  replyMsg: InteractionResponse | Message;
  interaction: ChatInputCommandInteraction<CacheType>;
}

export async function runMediaPipeline(
  opts: PipelineOptions,
): Promise<{ vurl: string; vwidth: number; vheight: number } | null> {
  const { platform, hash, videoUrl, force, replyMsg, interaction } = opts;

  const data = await S3.list({ prefix: `${platform}/${hash}-` });
  const existing = data.contents?.at(0);

  if (existing && force) {
    console.log("Existing video with `force`, deleting");
    await S3.delete(existing.key);
  }

  if (!existing || force) {
    execSync(`mkdir -p tmp/${platform}`);

    let ytdlpLogs = "";
    try {
      ytdlpLogs = await withRetry(() =>
        execSync(
          `yt-dlp --cookies ./cookies.txt -f bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best -S vcodec:h264 -o ./tmp/${platform}/${hash}.mp4 ${videoUrl} 2>&1`,
          { encoding: "utf-8" },
        ),
      );
    } catch (e) {
      console.error(e);
      const errorLogs =
        e instanceof Error && "stdout" in e
          ? (e as any).stdout + "\n" + (e as any).stderr
          : ytdlpLogs;
      await replyMsg.edit("Error downloading video");
      await onCommandFail(interaction, e, errorLogs);
      return null;
    }

    let width = 0,
      height = 0;
    let ffprobeLogs = "";
    try {
      ffprobeLogs = execSync(
        `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,codec_name -of json ./tmp/${platform}/${hash}.mp4 2>&1`,
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
      return null;
    }

    await S3.write(
      `${platform}/${hash}-${width}x${height}.mp4`,
      file(`./tmp/${platform}/${hash}.mp4`),
    );
    execSync(`rm -f ./tmp/${platform}/${hash}.mp4`);

    const vurl = `${S3_PUBLIC_BUCKET_URL}/${platform}/${hash}-${width}x${height}.mp4`;
    return { vurl, vwidth: width, vheight: height };
  } else {
    const res = existing.key;
    console.log(res);

    const match = res.match(new RegExp(`${platform}\\/.*-(\\d+)x(\\d+)\\.mp4`));
    if (!match || !match[1] || !match[2]) {
      throw new Error("File name format match failed");
    }

    const vurl = `${S3_PUBLIC_BUCKET_URL}/${res}`;
    return {
      vurl,
      vwidth: parseInt(match[1], 10),
      vheight: parseInt(match[2], 10),
    };
  }
}

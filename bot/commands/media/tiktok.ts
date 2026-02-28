import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  type CacheType,
  type Interaction,
} from "discord.js";
import crypto from "crypto";
import EmbedProxyClient from "../../embed-proxy-client";
import configStore from "../../config-store";
import { runMediaPipeline } from "../../lib/pipeline";

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

    const isOwner =
      interaction instanceof ChatInputCommandInteraction &&
      interaction.user.id === process.env.OWNER_ID;

    if (!isOwner && configStore.getOr("tiktok.enabled", "true") !== "true") {
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

    const result = await runMediaPipeline({
      platform: "tiktok",
      hash,
      videoUrl,
      force,
      replyMsg,
      interaction,
    });
    if (!result) return;

    const { vurl, vwidth, vheight } = result;
    console.log(vurl, vwidth, vheight);
    const embeddableUrl = await EmbedProxyClient.add(vurl, vwidth, vheight);
    await replyMsg.edit(`${embeddableUrl}`);
  },
};

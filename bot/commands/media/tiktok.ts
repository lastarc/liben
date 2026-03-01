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
import { getLogger } from "../../logger";

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

    const log = getLogger(["bot", "command"]).with({
      command: interaction.commandName,
      userId: interaction.user.id,
      user: interaction.user.tag,
      guildId: interaction.guildId ?? "dm",
      guild: interaction.guild?.name ?? "dm",
      channelId: interaction.channelId,
    });

    log.info("command invoked", { videoUrl: videoUrlRaw, force });

    const isOwner =
      interaction instanceof ChatInputCommandInteraction &&
      interaction.user.id === process.env.OWNER_ID;

    if (!isOwner && configStore.getOr("tiktok.enabled", "true") !== "true") {
      log.warn("command disabled, ignoring");
      return;
    }

    if (isOwner && configStore.getOr("tiktok.enabled", "true") !== "true") {
      log.info("owner bypass active");
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
      log,
    });
    if (!result) return;

    const { vurl, vwidth, vheight } = result;
    log.info("embed ready", { vurl, vwidth, vheight });
    const embeddableUrl = await EmbedProxyClient.add(vurl, vwidth, vheight);
    await replyMsg.edit(`${embeddableUrl}`);
  },
};

import {
  SlashCommandBuilder,
  type CacheType,
  type ChatInputCommandInteraction,
  type Interaction,
} from "discord.js";
import crypto from "crypto";
import EmbedProxyClient from "../../embed-proxy-client";
import configStore from "../../config-store";
import { runMediaPipeline } from "../../lib/pipeline";
import { getLogger } from "../../logger";

export default {
  data: new SlashCommandBuilder()
    .setName("download")
    .setDescription("Downloads and embeds a video from any supported URL.")
    .addStringOption((option) =>
      option.setName("url").setDescription("The video URL.").setRequired(true),
    )
    .addBooleanOption((option) =>
      option.setName("force").setDescription("Re-download?"),
    ),
  async execute(interaction: Interaction<CacheType>) {
    if (!interaction.isChatInputCommand()) return;

    const log = getLogger(["bot", "command"]).with({
      command: interaction.commandName,
      userId: interaction.user.id,
      user: interaction.user.tag,
      guildId: interaction.guildId ?? "dm",
      guild: interaction.guild?.name ?? "dm",
      channelId: interaction.channelId,
    });

    const isOwner = interaction.user.id === process.env.OWNER_ID;

    if (!isOwner && configStore.getOr("download.enabled", "true") !== "true") {
      log.warn("command disabled, ignoring");
      await interaction.reply({
        content: "This command is disabled.",
        ephemeral: true,
      });
      return;
    }

    if (isOwner && configStore.getOr("download.enabled", "true") !== "true") {
      log.info("owner bypass active");
    }

    const videoUrl = interaction.options.getString("url", true);
    const force = interaction.options.getBoolean("force") || false;
    log.info("command invoked", { videoUrl, force });

    const hash = crypto
      .createHash("sha256")
      .update(videoUrl)
      .digest("hex")
      .slice(0, 16);

    const replyMsg = await interaction.reply("Processing download...");

    const result = await runMediaPipeline({
      platform: "download",
      hash,
      videoUrl,
      force,
      replyMsg,
      interaction: interaction as ChatInputCommandInteraction<CacheType>,
      log,
    });
    if (!result) return;

    const { vurl, vwidth, vheight } = result;
    log.info("embed ready", { vurl, vwidth, vheight });
    const embeddableUrl = await EmbedProxyClient.add(vurl, vwidth, vheight);
    await replyMsg.edit(`${embeddableUrl}`);
  },
};

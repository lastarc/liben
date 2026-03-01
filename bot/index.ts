import { getLogger } from "./logger";
import { Client, Events, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { onCommandFail } from "./blame";
import commands from "./commands";
import S3 from "./s3";
import { matcher as instagramUrlMatcher } from "./commands/media/instagram";
import { matcher as tiktokUrlMatcher } from "./commands/media/tiktok";

dotenv.config();

const logger = getLogger(["bot"]);

try {
  const data = await S3.list({
    maxKeys: 10,
  });

  logger.info("S3 accessible", { objects: data.contents?.length ?? 0 });
} catch (e) {
  logger.error("S3 connection failed", { error: e });
}

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) throw new Error("No discord token provided");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  logger.info("bot ready", { tag: readyClient.user.tag });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const commandName = interaction.commandName;
  const u = interaction.user;
  const guildId = interaction.guildId ?? "dm";
  const guild = interaction.guild?.name ?? "dm";
  const channelId = interaction.channelId;
  logger.info("command received", { command: commandName, userId: u.id, user: u.tag, guildId, guild, channelId });

  const command = commands.get(commandName);

  if (!command) {
    logger.warn("unknown command", { command: commandName });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error("command execution failed", { error, command: commandName });
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
    await onCommandFail(interaction, error);
  }
});

client.on(Events.MessageCreate, async (message) => {
  let msgRef = null;

  try {
    msgRef = await message.fetchReference();
  } catch {
    // do nothing
  }

  let content = message.content;
  let force = null;

  if (content.toLocaleLowerCase().trim() === "liben redo" && msgRef) {
    content = msgRef.content;
    force = true;

    message = msgRef;
  }

  const tiktokVideoUrlMatch = content.match(tiktokUrlMatcher);

  const instagramVideoUrlMatch = content.match(instagramUrlMatcher);

  switch (true) {
    case tiktokVideoUrlMatch !== null:
      logger.info("auto-triggered from message", {
        userId: message.author.id,
        user: message.author.tag,
        guildId: message.guildId ?? "dm",
        channelId: message.channelId,
        url: tiktokVideoUrlMatch[0],
        platform: "tiktok",
      });
      return client.emit(Events.InteractionCreate, {
        ...message,
        isChatInputCommand: () => true,
        commandName: "tiktok",
        options: {
          getString: () => tiktokVideoUrlMatch[0],
          getBoolean: () => force,
          data: [],
        },
        reply: message.reply.bind(message),
        guild: message.guild,
        channel: message.channel,
        user: message.author,
      } as any);
    case instagramVideoUrlMatch !== null:
      logger.info("auto-triggered from message", {
        userId: message.author.id,
        user: message.author.tag,
        guildId: message.guildId ?? "dm",
        channelId: message.channelId,
        url: instagramVideoUrlMatch[0],
        platform: "instagram",
      });
      return client.emit(Events.InteractionCreate, {
        ...message,
        isChatInputCommand: () => true,
        commandName: "instagram",
        options: {
          getString: () => instagramVideoUrlMatch[0],
          getBoolean: () => force,
          data: [],
        },
        reply: message.reply.bind(message),
        guild: message.guild,
        channel: message.channel,
        user: message.author,
      } as any);
    default:
      return;
  }
});

process.once("SIGINT", async () => {
  logger.info("shutting down");
  client.destroy();
});

client.login(DISCORD_TOKEN);

import { Client, Events, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { onCommandFail } from "./blame";
import commands from "./commands";
import S3 from "./s3";
import { matcher as instagramUrlMatcher } from "./commands/media/instagram";
import { matcher as tiktokUrlMatcher } from "./commands/media/tiktok";

dotenv.config();

try {
  const data = await S3.list({
    maxKeys: 10,
  });

  console.log(
    `S3 List Objects successful: ${data.contents?.length} object(s) (capped at 10)`,
  );
} catch (e) {
  console.error("Failed to connect to S3", e);
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
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  console.log(interaction.commandName);

  const command = commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
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

process.on("SIGINT", async () => {
  console.log("Exiting...");
  client.destroy();
});

client.login(DISCORD_TOKEN);

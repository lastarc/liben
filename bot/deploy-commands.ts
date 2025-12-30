import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
import commands from "./commands";

dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) throw new Error("No discord token provided");

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
if (!DISCORD_CLIENT_ID) throw new Error("No discord client ID provided");

const rest = new REST().setToken(DISCORD_TOKEN);
const commandsData = commands.map((command) => command.data.toJSON());

(async () => {
  try {
    console.log(
      `Started refreshing ${commandsData.length} application (/) commands.`,
    );

    const data = (await rest.put(
      Routes.applicationCommands(DISCORD_CLIENT_ID),
      {
        body: commandsData,
      },
    )) as any;

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`,
    );
  } catch (error) {
    console.error(error);
  }
})();

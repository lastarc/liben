import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
import { getLogger } from "./logger";
import commands from "./commands";

dotenv.config();

const logger = getLogger(["bot"]);

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) throw new Error("No discord token provided");

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
if (!DISCORD_CLIENT_ID) throw new Error("No discord client ID provided");

const rest = new REST().setToken(DISCORD_TOKEN);
const commandsData = commands.map((command) => command.data.toJSON());

(async () => {
  try {
    logger.info("refreshing commands", { count: commandsData.length });

    const data = (await rest.put(
      Routes.applicationCommands(DISCORD_CLIENT_ID),
      {
        body: commandsData,
      },
    )) as any;

    logger.info("commands reloaded", { count: data.length });
  } catch (error) {
    logger.error("deploy failed", { error });
  }
})();

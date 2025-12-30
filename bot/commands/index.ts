import {
  Collection,
  SlashCommandBuilder,
  type Interaction,
  type CacheType,
} from "discord.js";
import path from "path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const commands = new Collection<
  string,
  {
    data: SlashCommandBuilder;
    // eslint-disable-next-line no-unused-vars
    execute: (interaction: Interaction<CacheType>) => Promise<void>;
  }
>();

const foldersPath = path.dirname(fileURLToPath(import.meta.url));
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  if (folder === "index.ts") continue;
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".ts"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = (await import(filePath)).default;
    if ("data" in command && "execute" in command) {
      commands.set(command.data.name, command);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
      );
    }
  }
}

export default commands;

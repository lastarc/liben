import {
  MessageFlags,
  SlashCommandBuilder,
  type CacheType,
  type Interaction,
} from "discord.js";
import configStore from "../../config-store";

export default {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Bot configuration")
    .addStringOption((option) =>
      option.setName("key").setDescription("Config key"),
    )
    .addStringOption((option) =>
      option.setName("value").setDescription("Config value"),
    ),
  async execute(interaction: Interaction<CacheType>) {
    if (interaction.user.id !== process.env.OWNER_ID) {
      if (interaction.isRepliable()) {
        await interaction.reply({
          content: "You do not have permission to run this command.",
          flags: MessageFlags.Ephemeral,
        });
      }
      return;
    }
    if (!interaction.isChatInputCommand()) return;
    const key = interaction.options.getString("key");
    const value = interaction.options.getString("value");

    if (!key) {
      // list
      const keys = configStore.list();
      await interaction.reply({
        content: `The keys in the config store are: \`${JSON.stringify(keys)}\``,
        flags: MessageFlags.Ephemeral,
      });
    } else if (!value) {
      // get
      const value = configStore.get(key);
      await interaction.reply({
        content: `The value of \`${key}\` is: \`${value}\``,
        flags: MessageFlags.Ephemeral,
      });
    } else if (value === "undefined") {
      // delete
      configStore.delete(key);
      await interaction.reply({
        content: `Deleted \`${key}\`.`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      // set
      configStore.set(key, value);
      await interaction.reply({
        content: `Set \`${key}\` to \`${value}\`.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

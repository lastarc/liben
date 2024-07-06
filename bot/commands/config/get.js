const { SlashCommandBuilder } = require('discord.js');
const configStore = require('../../config-store');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cfg-get')
		.setDescription('Gets a key from the config store.')
		.addStringOption(option => option.setName('key')
			.setDescription('The key to get.')
			.setRequired(true)),
	async execute(interaction) {
		if (interaction.user.id !== process.env.OWNER_ID) {
			await interaction.reply({ content: 'You do not have permission to run this command.', ephemeral: true });
			return;
		}
		await interaction.reply(`The value of \`${interaction.options.getString('key')}\` is: \`${configStore.get(interaction.options.getString('key'))}\``, { ephemeral: true });
	},
};

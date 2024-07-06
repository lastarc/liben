const { SlashCommandBuilder } = require('discord.js');
const configStore = require('../../config-store');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cfg-set')
		.setDescription('Sets a key in the config store.')
		.addStringOption(option => option.setName('key')
			.setDescription('The key to set.')
			.setRequired(true))
		.addStringOption(option => option.setName('value')
			.setDescription('The value to set.')
			.setRequired(true)),
	async execute(interaction) {
		if (interaction.user.id !== process.env.OWNER_ID) {
			await interaction.reply({ content: 'You do not have permission to run this command.', ephemeral: true });
			return;
		}
		configStore.set(interaction.options.getString('key'), interaction.options.getString('value'));
		await interaction.reply(`Set \`${interaction.options.getString('key')}\` to \`${interaction.options.getString('value')}\`.`, { ephemeral: true });
	},
};

const { SlashCommandBuilder } = require('discord.js');
const configStore = require('../../config-store');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cfg-delete')
		.setDescription('Deletes a key from the config store.')
		.addStringOption(option => option.setName('key')
			.setDescription('The key to delete.')
			.setRequired(true)),
	async execute(interaction) {
		if (interaction.user.id !== process.env.OWNER_ID) {
			await interaction.reply({ content: 'You do not have permission to run this command.', ephemeral: true });
			return;
		}
		configStore.delete(interaction.options.getString('key'));
		await interaction.reply(`Deleted \`${interaction.options.getString('key')}\`.`, { ephemeral: true });
	},
};

const { SlashCommandBuilder } = require('discord.js');
const configStore = require('../../config-store');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cfg-list')
		.setDescription('Lists all the keys in the config store.'),
	async execute(interaction) {
		if (interaction.user.id !== process.env.OWNER_ID) {
			await interaction.reply({ content: 'You do not have permission to run this command.', ephemeral: true });
			return;
		}
		await interaction.reply(`The keys in the config store are: \`${JSON.stringify(configStore.list())}\``, { ephemeral: true });
	},
};

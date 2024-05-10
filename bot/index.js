const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const dotenv = require('dotenv');
const path = require('node:path');
const fs = require('node:fs');
const { onCommandFail } = require('./blame');

dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) throw new Error('No discord token provided');

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
	console.log(interaction.commandName);
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
		await onCommandFail(client, interaction.channelId);
	}
});

client.on(Events.MessageCreate, async message => {
	let msgRef = null;

	try {
		msgRef = await message.fetchReference();
	} catch (e) {
		// do nothing
	}

	let content = message.content;
	let force = null;

	if (content.toLocaleLowerCase().trim() === 'liben redo' && msgRef) {
		content = msgRef.content;
		force = true;

		message = msgRef;
	}

	const tiktokVideoUrlMatch = content.match(/https:\/\/(?:m|www|vm|vt)?\.?tiktok\.com\/((?:.*\b(?:(?:usr|v|embed|user|video)\/|\?shareId=|&item_id=)(\d+))|\w+)/gim);

	const instagramVideoUrlMatch = content.match(/https:\/\/www\.instagram\.com\/reel\/[a-zA-Z0-9_-]+\/?/gim);

	switch (true) {
	case tiktokVideoUrlMatch !== null:
		return client.emit(Events.InteractionCreate, {
			isChatInputCommand: () => true, client: client, channelId: message.channelId, commandName: 'tiktok', options: {
				getString: () => tiktokVideoUrlMatch[0],
				getBoolean: () => force,
			}, reply: message.reply.bind(message),
		});
	case instagramVideoUrlMatch !== null:
		return client.emit(Events.InteractionCreate, {
			isChatInputCommand: () => true, client: client, channelId: message.channelId, commandName: 'instagram', options: {
				getString: () => instagramVideoUrlMatch[0],
				getBoolean: () => force,
			}, reply: message.reply.bind(message),
		});
	default:
		return;
	}
});

client.login(DISCORD_TOKEN);

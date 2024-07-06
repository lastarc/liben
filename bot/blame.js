const configStore = require('./config-store');

/**
 * @param client {import('discord.js').Client}
 * @param channelId {import('discord.js').Message['id']}
 */
const onCommandFail = async (client, channelId) => {
	if (configStore.getOr('blame.enabled', 'false') !== 'true') return;

	const WHO_TO_BLAME = process.env.WHO_TO_BLAME;
	if (!WHO_TO_BLAME) return;
	const HEHE_EMOJI = process.env.HEHE_EMOJI || '';

	const channel = await client.channels.cache.get(channelId);
	if (!channel) return;
	await channel.send(`${WHO_TO_BLAME} is to blame ${HEHE_EMOJI}`);
};

module.exports = { onCommandFail };

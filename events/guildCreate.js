const { Events } = require('discord.js');
const { Logger } = require('../util/Logger.js');
const { FileManager } = require('../util/FileManager.js');
const { logChannelId } = require('../config.json');

module.exports = {
	name: Events.GuildCreate,
	async execute(guild) {
		const guildDetails = await getGuildDetails(guild);

		const logChannel = await guild.client.channels.fetch(logChannelId);
		const logger = new Logger(logChannel);

		const fileManager = new FileManager();
		await fileManager.createGuildFiles(guild.id);

		logger.logMessage(`Bot joined a new guild: \n\`\`\`${guildDetails}\`\`\``);
	},
};

async function getGuildDetails(guild) {
	const name = guild.name;
	const id = guild.id;
	const ownerId = guild.ownerId;
	const ownerName = (await guild.client.users.fetch(ownerId)).displayName;

	return `Guild Name: ${name}\nGuild ID: ${id}\nGuild Owner Name: ${ownerName}\nGuild Owner ID: ${ownerId}`;
}

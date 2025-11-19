const { Events } = require('discord.js');
const { Logger } = require('../util/Logger.js');
const { FileManager } = require('../util/FileManager.js');
const { logChannelId } = require('../config.json');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		await startup(client);

		const logChannel = await client.channels.fetch(logChannelId);
		const logger = new Logger(logChannel);
		logger.logMessage('Bot is ready');
	},
};

async function startup(client) {
	const fileManager = new FileManager();
	await fileManager.createDataFolder();
	await client.guilds.cache.forEach((guild) => {
		fileManager.createGuildFiles(guild.id);
	});
}

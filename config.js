const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');
let fileConfig = {};
try {
	if (fs.existsSync(configPath)) {
		fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
	}
} catch (e) {
	// If config.json exists but is malformed, surface the error
	throw new Error(`Failed to parse config.json: ${e.message}`);
}

function pickEnvOrFile(envKey, fileKey, fallback = '') {
	if (process.env[envKey] !== undefined && process.env[envKey] !== '') {
		return process.env[envKey];
	}
	if (Object.prototype.hasOwnProperty.call(fileConfig, fileKey)) {
		return fileConfig[fileKey];
	}
	return fallback;
}

const config = {
	discordToken: pickEnvOrFile('DISCORD_TOKEN', 'discordToken', ''),
	guildId: pickEnvOrFile('GUILD_ID', 'guildId', ''),
	clientId: pickEnvOrFile('CLIENT_ID', 'clientId', ''),
	logChannelId: pickEnvOrFile('LOG_CHANNEL_ID', 'logChannelId', '')
};

module.exports = config;

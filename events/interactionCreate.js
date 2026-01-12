const { Events, MessageFlags } = require('discord.js');
const { Logger } = require('../util/Logger.js');
const { logChannelId } = require('../config.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
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
			const logChannel = await interaction.client.channels.fetch(logChannelId);
			const logger = new Logger(logChannel);
			logger.logMessage('A command encountered an error!');
			logger.logMessage(`Interaction: \n\`\`\`\n${interaction.toString()}\n\`\`\``);
			logger.logMessage(`Error: \n\`\`\`\n${error}\n\`\`\``);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({
					content: 'There was an error while executing this command!',
					flags: MessageFlags.Ephemeral
				});
			} else {
				await interaction.reply({
					content: 'There was an error while executing this command!',
					flags: MessageFlags.Ephemeral
				});
			}
		}
	}
};

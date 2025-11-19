const { Events } = require('discord.js');

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		if (message.cleanContent.startsWith('!loadorder')) {
			message.channel.send(
				'The use of `!loadorder` is deprecated and has been replaced with `/loadorder`',
			);
		}
	},
};

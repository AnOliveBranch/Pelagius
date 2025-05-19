const { SlashCommandBuilder } = require('discord.js');
const { GuildManager } = require('../util/GuildManager.js');
const { RemoteManager } = require('../util/RemoteManager.js');
const { Logger } = require('../util/Logger.js');
const { logChannelId } = require('../config.json');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('loadorder')
		.setDescription('Command to validate your loadorder')
		.setDMPermission(false)
		.addAttachmentOption((option) =>
			option.setName('file').setDescription('Your loadorder.txt file to compare').setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName('guide')
				.setDescription('Guide to validate loadorder against (use `/guides` to list guides)'),
		),
	async execute(interaction) {
		await interaction.deferReply();
		const logChannel = await interaction.client.channels.fetch(logChannelId);
		const logger = new Logger(logChannel);
		const guild = interaction.guild;
		const guildManager = new GuildManager(guild);
		await guildManager.init();

		const guides = guildManager.getGuides();
		const defaultGuide = guildManager.getDefaultGuide();

		const guide = interaction.options.getString('guide') ?? defaultGuide;

		if (!guides.includes(guide)) {
			await interaction.editReply({
				content: `The guide \`${guide}\` does not exist in this server`,
			});
			return;
		}

		const enabled = guildManager.getEnabled(guide);
		const masterLoadorder = (await guildManager.getLoadorder(guide)).toLowerCase().split(/\r?\n/);

		if (masterLoadorder.length === 1 && masterLoadorder[0] === '') {
			await interaction.editReply({
				content: `The loadorder file for \`${guide}\` has not been set`,
			});
			return;
		}

		if (!enabled) {
			await interaction.editReply({
				content: `Loadorder validation is disabled for guide \`${guide}\``,
			});
			return;
		}

		const userLoadorderFile = interaction.options.getAttachment('file');

		if (userLoadorderFile.name !== 'loadorder.txt') {
			await interaction.editReply({
				content: 'The file must be named loadorder.txt',
			});
			return;
		}

		if (userLoadorderFile.contentType !== 'text/plain; charset=utf-8') {
			await interaction.editReply({
				content: 'The file must be the right filetype',
			});
			return;
		}

		const reasons = JSON.parse((await guildManager.getReasons(guide)).toLowerCase());
		const skips = (await guildManager.getSkips(guide)).toLowerCase().split(/\r?\n/);

		const remoteManager = new RemoteManager(logger);
		const userLoadorder = (await remoteManager.fetch(userLoadorderFile.url))
			.toLowerCase()
			.split(/\r?\n/);

		const result = compare(masterLoadorder, userLoadorder, reasons, skips);

		if (result === '') {
			await interaction.editReply(`${interaction.user} Your loadorder has no issues!`);
		} else {
			const buf = Buffer.from(result, 'utf8');
			const attachment = new AttachmentBuilder(buf, { name: 'differences.txt' });
			await interaction.editReply({ content: `${interaction.user} Here\'s what you need to fix:`, files: [attachment] });
		}
	},
};

function compare(master, user, reasons, skips) {
	let response = '';

	let temp = 'Your loadorder is missing: \n';
	master.forEach((line) => {
		if (line.trim() === '') {
			return;
		}

		if (!user.includes(line)) {
			if (!skips.includes(line)) {
				temp += line;

				if (Object.prototype.hasOwnProperty.call(reasons, line)) {
					temp += reasons[line];
				}

				temp += '\n';
			}
		}
	});

	if (temp !== 'Your loadorder is missing: \n') {
		response = temp;
	}

	temp = '\nYour loadorder should not have: \n';

	user.forEach((line) => {
		if (line.trim() === '') {
			return;
		}

		if (!master.includes(line)) {
			if (!skips.includes(line)) {
				temp += line;

				if (Object.prototype.hasOwnProperty.call(reasons, line)) {
					temp += reasons[line];
				}

				temp += '\n';
			}
		}
	});

	if (temp !== '\nYour loadorder should not have: \n') {
		response += temp;
	}

	return response;
}

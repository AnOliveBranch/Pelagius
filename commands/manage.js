const { MessageFlags, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { GuildManager } = require('../util/GuildManager.js');
const { RemoteManager } = require('../util/RemoteManager.js');
const { Logger } = require('../util/Logger.js');
const { logChannelId } = require('../config.js');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('manage')
		.setDescription('Manage your loadorder guides')
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addSubcommandGroup((group) =>
			group
				.setName('guide')
				.setDescription('Manage list of guides')
				.addSubcommand((subcommand) =>
					subcommand
						.setName('add')
						.setDescription('Adds a guide to the list of guides')
						.addStringOption((option) =>
							option.setName('guide').setDescription('The guide to add').setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('remove')
						.setDescription('Removes a guide from the list of guides')
						.addStringOption((option) =>
							option.setName('guide').setDescription('The guide to remove').setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('default')
						.setDescription('Sets a guide as the default')
						.addStringOption((option) =>
							option
								.setName('guide')
								.setDescription('The guide to set as default')
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('rename')
						.setDescription('Renames an existing guide')
						.addStringOption((option) =>
							option
								.setName('oldname')
								.setDescription('The current name of the guide')
								.setRequired(true)
						)
						.addStringOption((option) =>
							option
								.setName('newname')
								.setDescription('The new name of the guide')
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('enabled')
						.setDescription('Sets if validation is enabled or not')
						.addBooleanOption((option) =>
							option
								.setName('enabled')
								.setDescription('Whether to enable or disable')
								.setRequired(true)
						)
						.addStringOption((option) =>
							option
								.setName('guide')
								.setDescription('The guide to set enabled or not')
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand.setName('list').setDescription('Lists the guides')
				)
		)
		.addSubcommandGroup((group) =>
			group
				.setName('file')
				.setDescription('Manages guide files')
				.addSubcommand((subcommand) =>
					subcommand
						.setName('upload')
						.setDescription('Uploads a new file')
						.addAttachmentOption((option) =>
							option.setName('file').setDescription('The file to upload').setRequired(true)
						)
						.addStringOption((option) =>
							option
								.setName('filetype')
								.setDescription('The type of file being uploaded')
								.setRequired(true)
								.setChoices(
									{ name: 'Loadorder', value: 'loadorder' },
									{ name: 'Reasons', value: 'reasons' },
									{ name: 'Skips', value: 'skips' }
								)
						)
						.addStringOption((option) =>
							option.setName('guide').setDescription('The guide to update the file for')
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('retrieve')
						.setDescription('Retrieves a file')
						.addStringOption((option) =>
							option
								.setName('filetype')
								.setDescription('The type of file being retrieved')
								.setRequired(true)
								.setChoices(
									{ name: 'Loadorder', value: 'loadorder' },
									{ name: 'Reasons', value: 'reasons' },
									{ name: 'Skips', value: 'skips' }
								)
						)
						.addStringOption((option) =>
							option.setName('guide').setDescription('The guide to retrieve the file for')
						)
				)
		),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const guild = interaction.guild;
		const guildManager = new GuildManager(guild);
		await guildManager.init();

		const guides = guildManager.getGuides();
		const defaultGuide = guildManager.getDefaultGuide();

		const subcommandGroup = interaction.options.getSubcommandGroup();
		const subcommand = interaction.options.getSubcommand();

		if (subcommandGroup === 'guide') {
			const guideOption = interaction.options.getString('guide');
			if (subcommand === 'add') {
				if (guides.includes(guideOption)) {
					await interaction.editReply({
						content: `\`${guideOption}\` is already in the list of guides`
					});
					return;
				}

				await guildManager.addGuide(guideOption);
				await interaction.editReply({
					content: `\`${guideOption}\` has been added to the list of guides`
				});
			} else if (subcommand === 'remove') {
				if (!guides.includes(guideOption)) {
					await interaction.editReply({
						content: `\`${guideOption}\` is not in the list of guides`
					});
					return;
				}

				if (defaultGuide === guideOption) {
					await interaction.editReply({
						content: `\`${guideOption}\` is the default guide, it cannot be removed`
					});
					return;
				}

				await guildManager.removeGuide(guideOption);
				await interaction.editReply({
					content: `\`${guideOption}\` has been removed from the list of guides`
				});
			} else if (subcommand === 'default') {
				if (!guides.includes(guideOption)) {
					await interaction.editReply({
						content: `\`${guideOption}\` is not in the list of guides`
					});
					return;
				}

				if (defaultGuide === guideOption) {
					await interaction.editReply({
						content: `\`${guideOption}\` is already the default guide`
					});
					return;
				}

				await guildManager.setDefaultGuide(guideOption);
				await interaction.editReply({
					content: `\`${guideOption}\` has been set as the default guide`
				});
			} else if (subcommand === 'rename') {
				const oldName = interaction.options.getString('oldname');
				const newName = interaction.options.getString('newname');

				if (!guides.includes(oldName)) {
					await interaction.editReply({
						content: `\`${oldName}\` is not in the list of guides`
					});
					return;
				}

				if (guides.includes(newName)) {
					await interaction.editReply({
						content: `\`${newName}\` is already in the list of guides`
					});
					return;
				}

				await guildManager.renameGuide(oldName, newName);
				if (defaultGuide === oldName) {
					await guildManager.setDefaultGuide(newName);
				}
				await interaction.editReply({
					content: `\`${oldName}\` has been renamed to \`${newName}\``
				});
			} else if (subcommand === 'enabled') {
				const enabledOption = interaction.options.getBoolean('enabled');

				if (!guides.includes(guideOption)) {
					await interaction.editReply({
						content: `\`${guideOption}\` is not in the list of guides`
					});
					return;
				}

				const guideEnabled = guildManager.getEnabled(guideOption);
				if (guideEnabled === enabledOption) {
					await interaction.editReply({
						content: `Validation for \`${guideOption}\` is already ${
							enabledOption ? 'en' : 'dis'
						}abled`
					});
					return;
				}

				await guildManager.setEnabled(guideOption, enabledOption);
				await interaction.editReply({
					content: `Validation for \`${guideOption}\` has been ${enabledOption ? 'en' : 'dis'}abled`
				});
			} else if (subcommand === 'list') {
				const guideList = guides.map(
					(guide) => `${guide} - Enabled: ${guildManager.getEnabled(guide)}`
				);
				const guideResponse = `Available guides: \n\`\`\`\n${guideList.join(
					'\n'
				)}\n\`\`\`\nDefault guide: \`${defaultGuide}\``;

				await interaction.editReply({
					content: guideResponse
				});
			}
		} else if (subcommandGroup === 'file') {
			const guide = interaction.options.getString('guide') ?? defaultGuide;
			const type = interaction.options.getString('filetype');

			if (!guides.includes(guide)) {
				await interaction.editReply({
					content: `The guide \`${guide}\` does not exist in this server`
				});
				return;
			}

			if (subcommand === 'upload') {
				const uploadedFile = interaction.options.getAttachment('file');
				const logChannel = await interaction.client.channels.fetch(logChannelId);
				const logger = new Logger(logChannel);
				const remoteManager = new RemoteManager(logger);
				const fileContents = await remoteManager.fetch(uploadedFile.url);
				const fileName =
					type === 'reasons'
						? 'reasons.json'
						: type === 'loadorder'
						? 'loadorder.txt'
						: 'skips.txt';

				if (type === 'reasons') {
					try {
						JSON.parse(fileContents);
					} catch {
						await interaction.editReply({ content: 'Invalid JSON provided' });
						return;
					}
				}

				await guildManager.setFile(guide, fileContents, fileName);
				await interaction.editReply({ content: `The ${type} file has been updated` });
			} else if (subcommand === 'retrieve') {
				let attachment;
				if (type === 'loadorder') {
					const fileContents = await guildManager.getLoadorder(guide);
					const buf = Buffer.from(fileContents, 'utf8');
					attachment = new AttachmentBuilder(buf, { name: 'loadorder.txt' });
				} else if (type === 'reasons') {
					const fileContents = await guildManager.getReasons(guide);
					const buf = Buffer.from(fileContents, 'utf8');
					attachment = new AttachmentBuilder(buf, { name: 'reasons.json' });
				} else if (type === 'skips') {
					const fileContents = await guildManager.getSkips(guide);
					const buf = Buffer.from(fileContents, 'utf8');
					attachment = new AttachmentBuilder(buf, { name: 'skips.txt' });
				}

				await interaction.editReply({
					content: `Here is the current ${type} file for \`${guide}\``,
					files: [attachment]
				});
			}
		}
	}
};

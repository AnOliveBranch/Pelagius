const fsPromises = require('node:fs/promises');
const path = require('node:path');

class FileManager {
	async createDataFolder() {
		const dataFolder = path.join(__dirname, '..', 'data');
		try {
			await fsPromises.access(dataFolder);
		} catch {
			await fsPromises.mkdir(dataFolder);
		}
	}

	async createGuildFiles(guildId) {
		const dataFolder = path.join(__dirname, '..', 'data', guildId);
		const dataFile = path.join(dataFolder, 'settings.json');
		const defaultGuideFolder = path.join(__dirname, '..', 'data', guildId, 'default');

		try {
			await fsPromises.access(dataFolder);
		} catch {
			await fsPromises.mkdir(dataFolder);
		}

		try {
			await fsPromises.access(dataFile);
		} catch {
			await fsPromises.writeFile(dataFile, JSON.stringify(getDefaultSettings()));
		}

		try {
			await fsPromises.access(defaultGuideFolder);
		} catch {
			await fsPromises.mkdir(defaultGuideFolder);
		}
	}

	async createGuideFolder(guildId, guideName) {
		const dataFolder = path.join(__dirname, '..', 'data', guildId);
		const guideFolder = path.join(__dirname, '..', 'data', guildId, guideName);

		try {
			await fsPromises.access(dataFolder);
		} catch {
			await fsPromises.mkdir(dataFolder);
		}

		try {
			await fsPromises.access(guideFolder);
		} catch {
			await fsPromises.mkdir(guideFolder);
		}
	}

	async deleteGuideFolder(guildId, guideName) {
		const guideFolder = path.join(__dirname, '..', 'data', guildId, guideName);
		await fsPromises.rm(guideFolder, { recursive: true, force: true });
	}

	async renameGuideFolder(guildId, oldName, newName) {
		const oldGuideFolder = path.join(__dirname, '..', 'data', guildId, oldName);
		const newGuideFolder = path.join(__dirname, '..', 'data', guildId, newName);
		await fsPromises.cp(oldGuideFolder, newGuideFolder, { recursive: true, force: true });
		await this.deleteGuideFolder(guildId, oldName);
	}

	async getGuildSettings(guildId) {
		const settingsFile = path.join(__dirname, '..', 'data', guildId, 'settings.json');

		try {
			const settings = JSON.parse(await fsPromises.readFile(settingsFile));
			return settings;
		} catch {
			const defaultSettings = getDefaultSettings();
			await fsPromises.writeFile(settingsFile, JSON.stringify(defaultSettings));
			return defaultSettings;
		}
	}

	async setGuildSettings(guildId, newSettings) {
		const settingsFile = path.join(__dirname, '..', 'data', guildId, 'settings.json');
		await fsPromises.writeFile(settingsFile, JSON.stringify(newSettings));
	}

	async getLoadorderFile(guildId, guide) {
		const loadorderFile = path.join(__dirname, '..', 'data', guildId, guide, 'loadorder.txt');

		try {
			return await fsPromises.readFile(loadorderFile, { encoding: 'utf8' });
		} catch {
			return '';
		}
	}

	async getReasonsFile(guildId, guide) {
		const reasonsFile = path.join(__dirname, '..', 'data', guildId, guide, 'reasons.json');

		try {
			return await fsPromises.readFile(reasonsFile, { encoding: 'utf8' });
		} catch {
			return '{}';
		}
	}

	async getSkipsFile(guildId, guide) {
		const skipsFile = path.join(__dirname, '..', 'data', guildId, guide, 'skips.txt');

		try {
			return await fsPromises.readFile(skipsFile, { encoding: 'utf8' });
		} catch {
			return '';
		}
	}

	async setFile(guildId, guide, contents, fileName) {
		const filePath = path.join(__dirname, '..', 'data', guildId, guide, fileName);
		await fsPromises.writeFile(filePath, contents);
	}
}

module.exports = {
	FileManager,
};

function getDefaultSettings() {
	const settings = {
		guides: {
			default: {
				enabled: true,
			},
		},
		defaultGuide: 'default',
	};

	return settings;
}

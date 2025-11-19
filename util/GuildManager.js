const { FileManager } = require('./FileManager.js');

class GuildManager {
	constructor(guild) {
		this._fileManager = new FileManager();
		this._guild = guild;
	}

	async init() {
		this._settings = await this._fileManager.getGuildSettings(this._guild.id);
	}

	async persist() {
		await this._fileManager.setGuildSettings(this._guild.id, this._settings);
	}

	getSettings() {
		return this._settings;
	}

	getGuides() {
		return Object.keys(this._settings.guides);
	}

	getDefaultGuide() {
		return this._settings.defaultGuide;
	}

	async addGuide(guide) {
		this._settings.guides[guide] = { enabled: true };
		await this.persist();
		await this._fileManager.createGuideFolder(this._guild.id, guide);
	}

	async removeGuide(guide) {
		delete this._settings.guides[guide];
		await this.persist();
		await this._fileManager.deleteGuideFolder(this._guild.id, guide);
	}

	async setDefaultGuide(guide) {
		this._settings.defaultGuide = guide;
		await this.persist();
	}

	async renameGuide(oldName, newName) {
		this._settings.guides[newName] = this._settings.guides[oldName];
		delete this._settings.guides[oldName];
		await this.persist();
		await this._fileManager.renameGuideFolder(this._guild.id, oldName, newName);
	}

	getEnabled(guide) {
		return this._settings.guides[guide].enabled;
	}

	async setEnabled(guide, enabled) {
		this._settings.guides[guide].enabled = enabled;
		await this.persist();
	}

	async getLoadorder(guide) {
		return this._fileManager.getLoadorderFile(this._guild.id, guide);
	}

	async getReasons(guide) {
		return this._fileManager.getReasonsFile(this._guild.id, guide);
	}

	async getSkips(guide) {
		return this._fileManager.getSkipsFile(this._guild.id, guide);
	}

	async setFile(guide, contents, fileName) {
		this._fileManager.setFile(this._guild.id, guide, contents, fileName);
	}
}

module.exports = {
	GuildManager,
};

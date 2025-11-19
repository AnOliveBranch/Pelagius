const https = require('https');

class RemoteManager {
	constructor(logger) {
		this._logger = logger;
	}

	async fetch(url) {
		return new Promise((resolve, reject) => {
			https.get(url, (response) => {
				let content = '';
				response.on('data', (chunk) => {
					content += chunk;
				});

				response.on('end', () => {
					resolve(content);
				});

				response.on('error', (error) => {
					this._logger.logMessage(
						`There was an error reading remote URL \`${url}\`\n\`\`\`\n${error}\n\`\`\``,
					);
					reject(error);
				});
			});
		});
	}
}

module.exports = {
	RemoteManager,
};

class Logger {
	constructor(channel) {
		this._channel = channel;
	}

	logMessage(message) {
		if (message.length === 0) {
			message = 'An empty log message was sent.';
		}
		const result = message.match(/.{1,2000}/s) || [];

		result.forEach((newMessage) => {
			this._channel.send(newMessage);
		});
	}
}

module.exports = {
	Logger,
};

const fs = require('node:fs');

class ConfigStore {
	/**
	 * @param {string} fPath
	 */
	constructor(fPath) {
		this.fPath = fPath;
		if (!fs.existsSync(this.fPath)) {
			fs.writeFileSync(this.fPath, '{}');
		}
		this.config = this.readFromFile();
	}

	readFromFile() {
		return JSON.parse(fs.readFileSync(this.fPath, 'utf8'));
	}

	writeToFile() {
		fs.writeFileSync(this.fPath, JSON.stringify(this.config, null, 2));
	}

	list() {
		return Object.keys(this.config);
	}

	/**
	 * @param {string} key
	 */
	get(key) {
		return this.config[key];
	}

	getOr(key, defaultValue) {
		return this.config[key] || defaultValue;
	}

	/**
	 * @param {string} key
	 * @param {any} value
	 */
	set(key, value) {
		this.config[key] = value;
		this.writeToFile();
	}

	/**
	 * @param {string} key
	 */
	delete(key) {
		delete this.config[key];
		this.writeToFile();
	}
}

module.exports = new ConfigStore('./config.json');
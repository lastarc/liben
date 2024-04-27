class EmbedProxyClient {
	constructor() {
		this.endpoint = process.env.EMBED_PROXY_URL;
		if (!this.endpoint) throw new Error('No embed proxy URL provided');
	}

	/**
	 * @param src {string}
	 * @param width {number}
	 * @param height {number}
	 * @returns {Promise<string>}
	 */
	async add(src, width, height) {
		return await this.checkV2Live() ? await this.v2Add(src, width, height) : this.v1Url(src, width, height);
	}

	/**
	 * @param src {string}
	 * @param width {number}
	 * @param height {number}
	 * @returns {string}
	 */
	v1Url(src, width, height) {
		return `${this.endpoint}/?src=${encodeURIComponent(src)}&width=${width}&height=${height}`;
	}

	/**
	 * @returns {Promise<boolean>}
	 */
	async checkV2Live() {
		const res = await fetch(`${this.endpoint}/v2/healthz`);
		return res.ok;
	}

	/**
	 * @param src {string}
	 * @param width {number}
	 * @param height {number}
	 * @returns {Promise<string>}
	 */
	async v2Add(src, width, height) {
		const res = await fetch(`${this.endpoint}/v2/add`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				src,
				width,
				height,
			}),
		});
		const json = await res.json();
		return `${this.endpoint}/v2/~/${json.slug}`;
	}
}

module.exports = new EmbedProxyClient();

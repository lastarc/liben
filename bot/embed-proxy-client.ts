class EmbedProxyClient {
  readonly endpoint: string;

  constructor() {
    if (!process.env.EMBED_PROXY_URL) {
      throw new Error("No embed proxy URL provided");
    }
    this.endpoint = process.env.EMBED_PROXY_URL;
  }

  async add(src: string, width: number, height: number) {
    return (await this.checkV2Live())
      ? await this.v2Add(src, width, height)
      : this.v1Url(src, width, height);
  }

  v1Url(src: string, width: number, height: number) {
    return `${this.endpoint}/?src=${encodeURIComponent(src)}&width=${width}&height=${height}`;
  }

  async checkV2Live() {
    const res = await fetch(`${this.endpoint}/v2/healthz`);
    return res.ok;
  }

  async v2Add(src: string, width: number, height: number) {
    const res = await fetch(`${this.endpoint}/v2/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        src,
        width,
        height,
      }),
    });
    const json = (await res.json()) as { slug: string };
    return `${this.endpoint}/v2/~/${json.slug}`;
  }
}

export default new EmbedProxyClient();

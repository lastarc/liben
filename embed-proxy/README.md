# Liben - Discord embed proxy

Lightweight http app that produces necessary OpenGraph meta tags for Discord
in-app video preview.

## Self-hosting

### Prerequisites

- Node.js (project was built using v18)
- pnpm
- Cloudflare account

### Steps

1. Clone the repository and open the `embed-proxy` directory

```bash
git clone <repo url>
cd liben/embed-proxy
```

1. Install dependencies

```bash
pnpm i
```

1. Rename `wrangler.sample.toml` to `wrangler.toml`

1. Open and edit the followings

   1.1. replace the Host value with the address the worker will be accessed on

   1.2.

1. Deploy

```bash
pnpm run deploy
```

If it's first time running it, Cloudflare account login might be required.

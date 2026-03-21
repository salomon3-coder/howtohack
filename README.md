# HowToHack

Astro site with fully automated article publishing for Cloudflare Pages.

## Daily automated flow

1. GitHub Action runs daily (or manually).
2. It executes `npm run generate:posts`.
3. It creates markdown articles in `src/content/blog/`.
4. It commits and pushes automatically.
5. Cloudflare Pages detects the push and deploys.

## GitHub configuration

In the `howtohack` repository:

1. Go to `Settings` -> `Secrets and variables` -> `Actions`.
2. Create a secret:
   - `ANTHROPIC_API_KEY` (your real Claude API key).
3. (Optional) Create variables:
   - `POSTS_PER_RUN` (example: `10`).
   - `ANTHROPIC_MODEL` (optional; if empty, the script auto-detects an available model).
4. Go to `Actions` and enable the `Daily Content Generator` workflow.

## Run locally

```sh
npm install
npm run generate:posts
npm run build
```

## Useful commands

- `npm run dev`: local development.
- `npm run build`: production build.
- `npm run generate:posts`: generate articles automatically.

## Analytics (GA4) & AdSense

The layout loads tags **only if** you set these at **build time** (e.g. Cloudflare Pages → **Settings** → **Environment variables**):

| Variable | Example | Purpose |
|----------|---------|---------|
| `PUBLIC_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | Google Analytics 4 |
| `PUBLIC_ADSENSE_CLIENT` | `ca-pub-XXXXXXXXXXXXXXXX` | Google AdSense |

- Create the properties in [Google Analytics](https://analytics.google.com/) and [AdSense](https://www.google.com/adsense/).
- Keep `public/ads.txt` in sync with your real publisher line: `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`.
- If variables are unset, the site builds **without** those scripts (fine for local dev).
- For EU/UK traffic, plan **cookie consent** and (for ads) **Consent Mode**; see Google’s help for publishers.

## Content notes

- The script is strict: without `ANTHROPIC_API_KEY`, the workflow fails.
- Articles are generated as practical, ethical content.
- For free non-AI images, you can extend the script with a free stock image API before publishing.

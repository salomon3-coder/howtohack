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
   - `ANTHROPIC_HTTP_RETRIES` (optional, default `8`) — retries on API overload (`529`), rate limits (`429`), etc.
   - `ANTHROPIC_RETRY_BASE_MS` (optional, default `2500`) — base delay for exponential backoff between retries.
   - `POST_GENERATION_DELAY_MS` (optional, default `5000`) — pause between articles in one run (reduces burst traffic to the API).
   - `USE_STATIC_TOPICS_ONLY` (optional) — set to `1` or `true` to skip the dynamic topic planner and use the static fallback pool only (not recommended for production).
   - `TOPIC_AVOID_TITLE_LIMIT` (optional, default `120`) — how many recent post titles to pass to the planner as “already published”.
   - `TOPIC_BATCH_ATTEMPTS` (optional, default `3`) — retries if the planner returns too few novel topics.
   - `TOPIC_PLAN_MAX_TOKENS` (optional, default `4096`) — max output tokens for the topic-planning call.
   - `TOPIC_PLANNER_TEMPERATURE` (optional, default `0.92`) — higher = more random topic angles from the planner (still within site rules).
   - `SLUG_DEDUPE_RETRIES` (optional, default `4`) — if the generated title’s URL slug is too close to an existing post, regenerate with stricter instructions.

Each run **plans new topics via the API** using **titles + existing URL slugs** so near-duplicate paths (same story, new date) are blocked. The sitemap **excludes** `/article-demo/`, `/faq-demo/`, and `/howto-demo/`.
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

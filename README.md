# CSNAME

CSNAME is a static CS2 item finder that matches Turkish names to English market names. It includes weapon finishes, stickers, charms, music kits, agents, cases, souvenir packages, capsules, and other crate items, with item images, rarity filters, weapon categories, and wear filters.

The optional Steam trade link is a community-support feature; using the site never requires a contribution.

## Run locally

Serve the project directory over HTTP; clipboard access requires HTTPS or localhost.

```powershell
python -m http.server 4173
```

Open `http://localhost:4173`.

## Publish

The frontend has no build step. Publish the project directory as the static site root and keep the `assets` directory alongside `index.html`. The optional live CSFloat price endpoint requires the Cloudflare Worker configured in `wrangler.jsonc`; other static hosts can serve the site but will not run that endpoint.

## Refresh item data

The compact, localized catalog is stored in `assets/data/catalog.json`. With Node.js 18 or later, refresh it from the upstream CS2 API and game language files with:

```powershell
node scripts/update-catalog.js
```

The generated catalog records its update date and source URLs. Item images are served by the upstream image hosts.

The GitHub Actions workflow in `.github/workflows/update-catalog.yml` refreshes and commits the catalog daily after the project is published to GitHub. Cloudflare Workers Builds connected to the repository will publish each catalog update automatically.

## CSFloat prices

When an item is selected, `functions/api/csfloat-price.js` uses the `CSFLOAT_API_KEY` Cloudflare Worker secret to show the lowest active CSFloat listing. If the secret is not configured, it falls back to the latest daily average sale price from CSFloat's public history graph. Never put the key in frontend code, Git, or a GitHub Actions log.

The repository includes a root `_worker.js` entry point and `wrangler.jsonc` configuration for deploying the site as a Cloudflare Worker with static assets. The Worker explicitly routes `/api/csfloat-price` and forwards all other requests to static assets. In Cloudflare Workers Builds, use `npx wrangler deploy` as the deploy command and keep the repository root as the root directory. The `.assetsignore` file excludes server-side source and repository files from public asset uploads.

In Cloudflare, open **Workers & Pages → csname → Settings → Variables and Secrets**, add `CSFLOAT_API_KEY` as an encrypted **Secret** (not a plain text Variable), then trigger a new production deployment. GitHub repository secrets are not automatically available to the Worker.

Check the production deployment by opening `/api/csfloat-price?health=1`; it should return `{"ok":true,"apiKeyConfigured":true,"deploymentMode":"cloudflare-worker"}`. A 404 means the active deployment is not running the root `_worker.js`. If `apiKeyConfigured` is false, add `CSFLOAT_API_KEY` as a Worker Secret and redeploy. A price lookup that reports the key was rejected means the secret value itself is invalid.

## Data sources

- [CSGO-API](https://github.com/ByMykel/CSGO-API)
- [Counter-Strike file tracker](https://github.com/ByMykel/counter-strike-file-tracker)

CSNAME is an unofficial community project and is not affiliated with Valve, Counter-Strike, or CSFloat.

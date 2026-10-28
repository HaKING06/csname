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

The site has no build step or server-side runtime. Publish the project directory as the static site root with GitHub Pages, Cloudflare Pages, Netlify, or another static host. Keep the `assets` directory alongside `index.html`.

## Refresh item data

The compact, localized catalog is stored in `assets/data/catalog.json`. With Node.js 18 or later, refresh it from the upstream CS2 API and game language files with:

```powershell
node scripts/update-catalog.js
```

The generated catalog records its update date and source URLs. Item images are served by the upstream image hosts.

The GitHub Actions workflow in `.github/workflows/update-catalog.yml` refreshes and commits the catalog daily after the project is published to GitHub. Cloudflare Pages deployments connected to the repository will publish each catalog update automatically.

## CSFloat prices

When an item is selected, `functions/api/csfloat-price.js` uses the `CSFLOAT_API_KEY` Cloudflare Pages secret to show the lowest active CSFloat listing. If the secret is not configured, it falls back to the latest daily average sale price from CSFloat's public history graph. Never put the key in frontend code, Git, or a GitHub Actions log.

Deploy the repository root as a Cloudflare Pages project so Cloudflare detects the `functions` directory. In Cloudflare, open **Workers & Pages → your Pages project → Settings → Variables and Secrets**, add `CSFLOAT_API_KEY` as an encrypted secret for the Production environment, then redeploy. GitHub repository secrets are not automatically available to a Cloudflare Pages Function. The regular catalog search works on a plain static host, but inline CSFloat prices require Cloudflare Pages Functions.

## Data sources

- [CSGO-API](https://github.com/ByMykel/CSGO-API)
- [Counter-Strike file tracker](https://github.com/ByMykel/counter-strike-file-tracker)

CSNAME is an unofficial community project and is not affiliated with Valve, Counter-Strike, or CSFloat.

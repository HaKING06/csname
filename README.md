# CSNAME

CSNAME is a static CS2 item finder that matches Turkish names to English market names. It includes weapon finishes, stickers, charms, music kits, cases, souvenir packages, capsules, and other crate items, with item images, rarity filters, weapon categories, and wear filters.

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

## Data sources

- [CSGO-API](https://github.com/ByMykel/CSGO-API)
- [Counter-Strike file tracker](https://github.com/ByMykel/counter-strike-file-tracker)

CSNAME is an unofficial community project and is not affiliated with Valve, Counter-Strike, or CSFloat.

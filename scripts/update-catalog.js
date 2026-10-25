const fs = require("node:fs");
const path = require("node:path");

const sources = {
    turkish: "https://raw.githubusercontent.com/ByMykel/counter-strike-file-tracker/main/static/csgo_turkish.json",
    english: "https://raw.githubusercontent.com/ByMykel/counter-strike-file-tracker/main/static/csgo_english.json",
    skins: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json",
    stickers: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/stickers.json",
    charms: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/keychains.json",
    containers: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json",
    musicKits: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/music_kits.json"
};

const wearConditions = new Set([
    "Factory New",
    "Minimal Wear",
    "Field-Tested",
    "Well-Worn",
    "Battle-Scarred"
]);

function getTokens(data) {
    return data.lang?.Tokens || data.Tokens || data;
}

function normalize(value) {
    return value
        .toLocaleLowerCase("tr")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ı/g, "i")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

function buildLocalizedTokenMap(enTokens, trTokens, keyPattern) {
    const localizedNames = new Map();
    for (const [key, englishName] of Object.entries(enTokens)) {
        if (!keyPattern.test(key) || typeof englishName !== "string" || /_desc/i.test(key)) continue;
        const turkishName = trTokens[key];
        if (typeof turkishName !== "string" || !turkishName.trim()) continue;
        const englishKey = normalize(englishName);
        if (englishKey && !localizedNames.has(englishKey)) {
            localizedNames.set(englishKey, turkishName.trim());
        }
    }
    return localizedNames;
}

function safeRarityColor(value) {
    return /^#[\da-f]{6}$/i.test(value || "") ? value : "#a8a29e";
}

function localizeContainerName(name) {
    return name
        .replace(/\bDreams\s*&\s*Nightmares\b/gi, "Rüyalar ve Kabuslar")
        .replace(/\bKilowatt\b/gi, "Kilovat")
        .replace(/\bAutograph Capsule\b/gi, "İmza Kapsülü")
        .replace(/\bCollectible Pins Capsule\b/gi, "Koleksiyonluk Rozet Kapsülü")
        .replace(/\bSticker Capsule\b/gi, "Çıkartma Kapsülü")
        .replace(/\bSouvenir Highlight Package\b/gi, "Hatıra Öne Çıkanlar Paketi")
        .replace(/\bSouvenir Package\b/gi, "Hatıra Paketi")
        .replace(/\bWeapon Case\b/gi, "Silah Kasası")
        .replace(/\bMusic Kit Box\b/gi, "Müzik Kiti Kutusu")
        .replace(/\bGraffiti Box\b/gi, "Grafiti Kutusu")
        .replace(/\bPatch Pack\b/gi, "Yama Paketi")
        .replace(/\bCase\b/gi, "Kasası")
        .replace(/\bPackage\b/gi, "Paketi")
        .replace(/\bBox\b/gi, "Kutusu")
        .replace(/\bCapsule\b/gi, "Kapsülü")
        .replace(/\bTerminal\b/gi, "Terminali")
        .replace(/\bSealed\b/gi, "Mühürlü")
        .replace(/\bLegends\b/gi, "Efsaneler")
        .replace(/\bChallengers\b/gi, "Meydan Okuyanlar")
        .replace(/\bContenders\b/gi, "Adaylar")
        .replace(/\bChampions\b/gi, "Şampiyonlar")
        .replace(/\bFinalists\b/gi, "Finalistler");
}

function buildCatalog(data) {
    const trTokens = getTokens(data.turkish);
    const enTokens = getTokens(data.english);
    const translatedWeapons = buildLocalizedTokenMap(enTokens, trTokens, /^SFUI_WPNHUD_/i);
    const stickersByName = buildLocalizedTokenMap(enTokens, trTokens, /^StickerKit_/i);
    const charmsByName = buildLocalizedTokenMap(enTokens, trTokens, /^keychain_/i);
    const tokensByKey = new Map(Object.keys(trTokens).map((key) => [key.toLowerCase(), key]));
    const items = [];
    const seenSkins = new Set();

    for (const skin of data.skins) {
        if (!skin.weapon?.name || !skin.pattern?.id || !skin.pattern?.name) continue;
        const paintKey = tokensByKey.get(`paintkit_${skin.pattern.id}_tag`.toLowerCase());
        const localizedPattern = paintKey && typeof trTokens[paintKey] === "string"
            ? trTokens[paintKey].trim()
            : skin.pattern.name;
        const localizedWeapon = translatedWeapons.get(normalize(skin.weapon.name)) || skin.weapon.name;
        const englishName = `${skin.weapon.name} | ${skin.pattern.name}`;
        if (seenSkins.has(normalize(englishName))) continue;
        seenSkins.add(normalize(englishName));

        items.push({
            type: "skins",
            englishName,
            turkishName: `${localizedWeapon} | ${localizedPattern}`,
            category: skin.category?.name || "Equipment",
            rarity: skin.rarity?.name || "",
            rarityColor: safeRarityColor(skin.rarity?.color),
            image: skin.image || "",
            wears: Array.isArray(skin.wears)
                ? skin.wears.map((wear) => wear.name).filter((wear) => wearConditions.has(wear))
                : []
        });
    }

    for (const sticker of data.stickers) {
        if (typeof sticker.name !== "string" || !sticker.name.startsWith("Sticker | ")) continue;
        const englishItemName = sticker.name.slice("Sticker | ".length).trim();
        items.push({
            type: "stickers",
            englishName: sticker.name,
            turkishName: `Çıkartma | ${stickersByName.get(normalize(englishItemName)) || englishItemName}`,
            category: "Stickers",
            rarity: sticker.rarity?.name || "",
            rarityColor: safeRarityColor(sticker.rarity?.color),
            image: sticker.image || "",
            wears: []
        });
    }

    for (const charm of data.charms) {
        if (typeof charm.name !== "string" || !charm.name.startsWith("Charm | ")) continue;
        const englishItemName = charm.name.slice("Charm | ".length).trim();
        items.push({
            type: "charms",
            englishName: charm.name,
            turkishName: `Charm | ${charmsByName.get(normalize(englishItemName)) || englishItemName}`,
            category: "Charms",
            rarity: charm.rarity?.name || "",
            rarityColor: safeRarityColor(charm.rarity?.color),
            image: charm.image || "",
            wears: []
        });
    }

    for (const container of data.containers) {
        const englishName = container.market_hash_name || container.name;
        if (typeof englishName !== "string" || !englishName.trim()) continue;
        items.push({
            type: "containers",
            englishName,
            turkishName: localizeContainerName(englishName),
            category: container.type || "Other",
            rarity: container.rarity?.name || "",
            rarityColor: safeRarityColor(container.rarity?.color),
            image: container.image || "",
            wears: []
        });
    }

    const seenMusicKits = new Set();
    for (const musicKit of data.musicKits) {
        const englishName = musicKit.market_hash_name
            || (/^(?:StatTrak™ )?Music Kit \| /i.test(musicKit.name) ? musicKit.name : `Music Kit | ${musicKit.name}`);
        if (typeof englishName !== "string" || !englishName.trim() || seenMusicKits.has(normalize(englishName))) continue;
        seenMusicKits.add(normalize(englishName));
        items.push({
            type: "music_kits",
            englishName,
            turkishName: englishName.replace(/^(StatTrak™ )?Music Kit \| /i, (_, statTrak = "") => `${statTrak}Müzik Kiti | `),
            category: "Music Kits",
            rarity: musicKit.rarity?.name || "",
            rarityColor: safeRarityColor(musicKit.rarity?.color),
            image: musicKit.image || "",
            wears: []
        });
    }

    return items;
}

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
    return response.json();
}

async function main() {
    const entries = await Promise.all(
        Object.entries(sources).map(async ([key, url]) => [key, await fetchJson(url)])
    );
    const items = buildCatalog(Object.fromEntries(entries));
    const counts = Object.fromEntries(
        ["skins", "stickers", "charms", "containers", "music_kits"].map((type) => [type, items.filter((item) => item.type === type).length])
    );

    if (Object.values(counts).some((count) => count === 0)) {
        throw new Error(`Catalog is incomplete: ${JSON.stringify(counts)}`);
    }

    const catalog = {
        updatedAt: new Date().toISOString(),
        sources,
        counts,
        items
    };
    const outputPath = path.join(__dirname, "..", "assets", "data", "catalog.json");
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(catalog)}\n`, "utf8");
    console.log(`Updated ${outputPath}`);
    console.log(`${counts.skins} skins, ${counts.stickers} stickers, ${counts.charms} charms, ${counts.containers} containers, ${counts.music_kits} music kits`);
    console.log(`${(Buffer.byteLength(JSON.stringify(catalog)) / (1024 * 1024)).toFixed(2)} MB`);
}

main().catch((error) => {
    console.error("Catalog update failed:", error);
    process.exitCode = 1;
});

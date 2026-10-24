const CATALOG_URL = "assets/data/catalog.json";

const wearConditions = [
    { english: "Factory New", turkish: "Fabrikadan Yeni Çıkmış", aliases: ["fabrikadan yeni çıkmış", "fabrika çıkışlı", "factory new"] },
    { english: "Minimal Wear", turkish: "Az Aşınmış", aliases: ["az aşınmış", "minimal wear"] },
    { english: "Field-Tested", turkish: "Görevde Kullanılmış", aliases: ["görevde kullanılmış", "sahada test edilmiş", "sahada kullanılmış", "field tested", "field-tested"] },
    { english: "Well-Worn", turkish: "Eskimiş", aliases: ["eskimiş", "well worn", "well-worn"] },
    { english: "Battle-Scarred", turkish: "Savaş Görmüş", aliases: ["savaş görmüş", "savaş yaralı", "savaşta yıpranmış", "battle scarred", "battle-scarred"] }
];

const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const searchSummary = document.getElementById("searchSummary");
const catalogStatus = document.getElementById("catalogStatus");
const typeFilter = document.getElementById("typeFilter");
const rarityFilter = document.getElementById("rarityFilter");
const categoryFilter = document.getElementById("categoryFilter");
const wearFilter = document.getElementById("wearFilter");
const resultBox = document.getElementById("resultBox");
const englishNameDisplay = document.getElementById("englishNameDisplay");
const wearBadge = document.getElementById("wearBadge");
const copyButton = document.getElementById("copyBtn");
const clearButton = document.getElementById("clearBtn");
const loadingState = document.getElementById("loading");
const loadError = document.getElementById("loadError");
const toast = document.getElementById("toast");

const MAX_RESULTS = 12;
const weaponAliases = new Map([["deagle", "desert eagle"]]);
const categoryNames = {
    Pistols: "Tabanca",
    Rifles: "Tüfek",
    SMGs: "Hafif makineli",
    Heavy: "Ağır silah",
    Knives: "Bıçak",
    Gloves: "Eldiven",
    Equipment: "Ekipman"
};
const rarityNames = {
    "Base Grade": "Temel Sınıf",
    "Consumer Grade": "Tüketici Sınıfı",
    "Industrial Grade": "Endüstri Sınıfı",
    "Mil-Spec Grade": "Askerî Sınıf",
    Restricted: "Sınırlı",
    Classified: "Gizli",
    Covert: "Çok Gizli",
    Contraband: "Kaçak",
    Default: "Standart",
    "High Grade": "Yüksek Sınıf",
    Remarkable: "Kayda Değer",
    Exotic: "Egzotik",
    Extraordinary: "Olağanüstü",
    Distinguished: "Seçkin",
    Superior: "Üstün",
    Exceptional: "Olağanüstü",
    Master: "Usta"
};
const rarityOrderByType = {
    skins: [
        "Consumer Grade",
        "Industrial Grade",
        "Mil-Spec Grade",
        "Restricted",
        "Classified",
        "Covert",
        "Contraband",
        "Extraordinary"
    ],
    stickers: ["Default", "High Grade", "Remarkable", "Exotic", "Extraordinary", "Contraband"],
    charms: ["High Grade", "Remarkable", "Exotic", "Extraordinary"]
};

let catalogs = { skins: [], stickers: [], charms: [] };
let currentEnglishName = "";
let activeResultIndex = -1;
let toastTimeout;

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

function makeItem({ type, englishName, turkishName, category, rarity, rarityColor, image, wears = [] }) {
    return {
        type,
        englishName,
        turkishName,
        englishNormalized: normalize(englishName),
        turkishNormalized: normalize(turkishName),
        category,
        categoryLabel: categoryNames[category] || category,
        rarity: rarity || "",
        rarityColor: /^#[\da-f]{6}$/i.test(rarityColor || "") ? rarityColor : "#a8a29e",
        image: typeof image === "string" ? image : "",
        wears
    };
}

function findWearCondition(value) {
    const normalizedValue = normalize(value);
    return wearConditions.find((condition) =>
        condition.aliases.some((alias) => normalizedValue.includes(normalize(alias)))
    ) || null;
}

function removeWearCondition(value) {
    const condition = findWearCondition(value);
    let cleaned = value;
    if (condition) {
        for (const alias of condition.aliases) {
            const expression = new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            if (expression.test(cleaned)) {
                cleaned = cleaned.replace(expression, "");
                break;
            }
        }
    }
    return {
        text: cleaned.replace(/[()[\]]/g, " ").replace(/\s+/g, " ").trim(),
        condition
    };
}

async function initData() {
    loadingState.hidden = false;
    loadError.hidden = true;
    searchInput.disabled = true;
    try {
        const response = await fetch(CATALOG_URL);
        if (!response.ok) throw new Error(`Item kataloğu alınamadı (${response.status}).`);
        const data = await response.json();
        if (!Array.isArray(data.items) || !data.counts) {
            throw new Error("Item kataloğunun biçimi beklenenden farklı.");
        }

        catalogs = { skins: [], stickers: [], charms: [] };
        for (const item of data.items) {
            if (!catalogs[item.type] || typeof item.englishName !== "string" || typeof item.turkishName !== "string") continue;
            catalogs[item.type].push(makeItem(item));
        }
        if (Object.values(catalogs).some((items) => items.length === 0)) {
            throw new Error("Item kataloğunda eksik bir kategori var.");
        }

        document.getElementById("skinCount").textContent = catalogs.skins.length.toLocaleString("tr-TR");
        document.getElementById("stickerCount").textContent = catalogs.stickers.length.toLocaleString("tr-TR");
        document.getElementById("charmCount").textContent = catalogs.charms.length.toLocaleString("tr-TR");
        populateRarityFilter();
        if (data.updatedAt) {
            const updatedAt = new Date(data.updatedAt);
            if (!Number.isNaN(updatedAt.getTime())) {
                document.getElementById("updatedAtBadge").textContent = `GÜNCELLEME · ${updatedAt.toLocaleDateString("tr-TR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }).toLocaleUpperCase("tr-TR")}`;
            }
        }
        loadingState.hidden = true;
        searchInput.disabled = false;
        searchInput.placeholder = "Silah veya kaplama ara… Örn. P250";
        catalogStatus.hidden = true;
    } catch (error) {
        console.error("CS2 katalogları yüklenemedi:", error);
        loadingState.hidden = true;
        loadError.hidden = false;
    }
}

function getActiveCatalog() {
    return catalogs[typeFilter.value] || [];
}

function matchesSearchTerms(item, terms) {
    const nameWords = `${item.turkishNormalized} ${item.englishNormalized}`.split(" ");
    return terms.every((term) => nameWords.some((word) => word.startsWith(term)));
}

function updateFilters() {
    const isSkin = typeFilter.value === "skins";
    if (!isSkin) {
        categoryFilter.value = "all";
        wearFilter.value = "all";
    }
    updateRarityOptions();
    categoryFilter.disabled = !isSkin;
    wearFilter.disabled = !isSkin;
    categoryFilter.classList.toggle("filter-disabled", !isSkin);
    wearFilter.classList.toggle("filter-disabled", !isSkin);
    searchInput.placeholder = typeFilter.value === "stickers"
        ? "Çıkartma ara… Örn. Nişancı"
        : typeFilter.value === "charms"
            ? "Charm ara… Örn. Minik Ava"
            : "Silah veya kaplama ara… Örn. P250";
}

function populateRarityFilter() {
    updateRarityOptions();
}

function updateRarityOptions() {
    const previousValue = rarityFilter.value;
    const rarityCounts = new Map();
    for (const item of getActiveCatalog()) {
        if (item.rarity) rarityCounts.set(item.rarity, (rarityCounts.get(item.rarity) || 0) + 1);
    }
    const preferredOrder = rarityOrderByType[typeFilter.value] || [];
    const rarities = [...rarityCounts.keys()].sort((left, right) => {
        const leftIndex = preferredOrder.indexOf(left);
        const rightIndex = preferredOrder.indexOf(right);
        if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right, "en");
        if (leftIndex === -1) return 1;
        if (rightIndex === -1) return -1;
        return leftIndex - rightIndex;
    });

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "Tüm nadirlikler";
    rarityFilter.replaceChildren(allOption);
    for (const rarity of rarities) {
        const option = document.createElement("option");
        option.value = rarity;
        option.textContent = `${rarityNames[rarity] || rarity} · ${rarityCounts.get(rarity).toLocaleString("tr-TR")}`;
        rarityFilter.appendChild(option);
    }
    rarityFilter.value = rarityCounts.has(previousValue) ? previousValue : "all";
}

function searchItems(query, category, selectedWear) {
    const { text, condition: queryWear } = removeWearCondition(query);
    const normalizedQuery = normalize(text);
    const terms = normalizedQuery
        .split(" ")
        .filter(Boolean)
        .flatMap((term) => (weaponAliases.get(term) || term).split(" "));
    const catalog = getActiveCatalog();
    const wear = typeFilter.value === "skins"
        ? selectedWear !== "all" ? selectedWear : queryWear?.english || ""
        : "";
    const ranked = [];

    for (const item of catalog) {
        if (typeFilter.value === "skins" && category !== "all" && item.category !== category) continue;
        if (rarityFilter.value !== "all" && item.rarity !== rarityFilter.value) continue;
        if (wear && !item.wears.includes(wear)) continue;
        if (terms.length > 0 && !matchesSearchTerms(item, terms)) continue;

        const exactWeaponMatch = typeFilter.value === "skins"
            && (normalize(item.weapon || "") === normalizedQuery || item.turkishNormalized.startsWith(normalizedQuery));
        const score = (exactWeaponMatch ? 100 : 0)
            + (item.turkishNormalized.startsWith(normalizedQuery) ? 20 : 0)
            + (item.englishNormalized.startsWith(normalizedQuery) ? 10 : 0);
        ranked.push({ item, score });
    }

    ranked.sort((left, right) =>
        right.score - left.score
        || left.item.turkishName.localeCompare(right.item.turkishName, "tr")
    );
    return { results: ranked.slice(0, MAX_RESULTS).map(({ item }) => item), total: ranked.length, wear };
}

function addSearchResult(item, wear) {
    const button = document.createElement("button");
    button.className = "search-result";
    button.type = "button";
    button.role = "option";
    button.setAttribute("aria-selected", "false");

    const imageWrap = document.createElement("span");
    imageWrap.className = `skin-image-wrap item-image-${item.type}`;
    imageWrap.style.setProperty("--rarity-color", item.rarityColor);
    const image = document.createElement("img");
    image.className = "skin-image";
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.src = item.image;
    image.addEventListener("error", () => {
        image.hidden = true;
        imageWrap.classList.add("image-unavailable");
    }, { once: true });
    imageWrap.appendChild(image);

    const content = document.createElement("span");
    content.className = "search-result-content";
    const name = document.createElement("span");
    name.className = "search-result-name";
    name.textContent = item.turkishName;
    const details = document.createElement("span");
    details.className = "search-result-details";
    const englishName = document.createElement("span");
    englishName.className = "search-result-translation";
    englishName.textContent = item.englishName + (wear ? ` (${wear})` : "");
    const category = document.createElement("span");
    category.className = "search-result-rarity";
    category.textContent = item.rarity ? rarityNames[item.rarity] || item.rarity : item.categoryLabel;
    category.style.setProperty("--rarity-color", item.rarityColor);
    details.append(englishName, category);
    content.append(name, details);

    const arrow = document.createElement("span");
    arrow.className = "result-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    button.append(imageWrap, content, arrow);
    button.addEventListener("click", () => {
        const turkishWear = wear ? ` (${findWearCondition(wear)?.turkish || wear})` : "";
        searchInput.value = `${item.turkishName}${turkishWear}`;
        clearButton.hidden = false;
        showResult(item.englishName + (wear ? ` (${wear})` : ""), wear);
    });
    searchResults.appendChild(button);
}

function renderResults({ browse = false } = {}) {
    const query = searchInput.value.trim();
    searchResults.replaceChildren();
    activeResultIndex = -1;
    resultBox.hidden = true;

    if (query.length === 0 && !browse) {
        searchResults.hidden = true;
        searchSummary.hidden = true;
        searchInput.setAttribute("aria-expanded", "false");
        return;
    }

    const { results, total, wear } = searchItems(query, categoryFilter.value, wearFilter.value);
    searchSummary.hidden = false;
    if (total === 0) {
        searchSummary.textContent = "Eşleşen item bulunamadı";
        const emptyState = document.createElement("div");
        emptyState.className = "empty-results";
        emptyState.textContent = "Arama terimini kısaltmayı veya filtreleri değiştirmeyi dene.";
        searchResults.appendChild(emptyState);
    } else {
        const typeName = { skins: "kaplama", stickers: "çıkartma", charms: "charm" }[typeFilter.value];
        const selectedRarity = rarityFilter.value === "all" ? "" : ` · ${rarityNames[rarityFilter.value] || rarityFilter.value}`;
        searchSummary.textContent = `${total.toLocaleString("tr-TR")} ${typeName}${total > MAX_RESULTS ? ` · ilk ${MAX_RESULTS} sonuç` : ""}${selectedRarity}${wear ? ` · ${findWearCondition(wear)?.turkish || wear}` : ""}`;
        for (const item of results) addSearchResult(item, wear);
    }

    searchResults.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
}

function showResult(name, wear = "") {
    currentEnglishName = name;
    englishNameDisplay.textContent = name;
    wearBadge.textContent = wear ? findWearCondition(wear)?.turkish || wear : "";
    wearBadge.hidden = !wear;
    resultBox.hidden = false;
    searchResults.hidden = true;
    searchSummary.hidden = true;
    searchInput.setAttribute("aria-expanded", "false");
    copyButton.querySelector("span").textContent = "Kopyala";
}

function setActiveResult(nextIndex) {
    const results = [...searchResults.querySelectorAll(".search-result")];
    if (results.length === 0) return;
    activeResultIndex = (nextIndex + results.length) % results.length;
    results.forEach((result, index) => result.setAttribute("aria-selected", String(index === activeResultIndex)));
    results[activeResultIndex].scrollIntoView({ block: "nearest" });
}

async function copyToClipboard() {
    if (!currentEnglishName) return;
    try {
        await navigator.clipboard.writeText(currentEnglishName);
        showToast("İngilizce isim panoya kopyalandı.");
    } catch (error) {
        console.error("İsim panoya kopyalanamadı:", error);
        showToast("Kopyalama başarısız. Metni seçip kopyalayabilirsin.");
    }
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

searchInput.addEventListener("input", () => {
    clearButton.hidden = searchInput.value.length === 0;
    renderResults();
});

searchInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" && !searchResults.hidden) {
        event.preventDefault();
        setActiveResult(activeResultIndex + 1);
    } else if (event.key === "ArrowUp" && !searchResults.hidden) {
        event.preventDefault();
        setActiveResult(activeResultIndex - 1);
    } else if (event.key === "Enter" && !searchResults.hidden) {
        event.preventDefault();
        const activeResult = searchResults.querySelector('[aria-selected="true"]');
        (activeResult || searchResults.querySelector(".search-result"))?.click();
    } else if (event.key === "Escape") {
        searchResults.hidden = true;
        searchSummary.hidden = true;
        searchInput.setAttribute("aria-expanded", "false");
    }
});

typeFilter.addEventListener("change", () => {
    updateFilters();
    resultBox.hidden = true;
    catalogStatus.hidden = true;
    renderResults({ browse: true });
});
categoryFilter.addEventListener("change", () => renderResults({ browse: true }));
wearFilter.addEventListener("change", () => renderResults({ browse: true }));
rarityFilter.addEventListener("change", () => renderResults({ browse: true }));
copyButton.addEventListener("click", copyToClipboard);
document.getElementById("retryBtn").addEventListener("click", initData);

clearButton.addEventListener("click", () => {
    searchInput.value = "";
    clearButton.hidden = true;
    resultBox.hidden = true;
    renderResults();
    searchInput.focus();
});

document.addEventListener("click", (event) => {
    if (!searchInput.contains(event.target) && !searchResults.contains(event.target)) {
        searchResults.hidden = true;
        searchSummary.hidden = true;
        searchInput.setAttribute("aria-expanded", "false");
    }
});

initData();

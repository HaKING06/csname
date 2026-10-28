const LISTING_CACHE_CONTROL = "public, max-age=30, s-maxage=60, stale-while-revalidate=300";
const HISTORY_CACHE_CONTROL = "public, max-age=900, s-maxage=3600, stale-while-revalidate=86400";

function jsonResponse(body, status = 200, cacheControl = HISTORY_CACHE_CONTROL) {
    return Response.json(body, {
        status,
        headers: { "Cache-Control": cacheControl }
    });
}

async function getLowestListing(marketHashName, apiKey) {
    const url = new URL("https://csfloat.com/api/v1/listings");
    url.searchParams.set("market_hash_name", marketHashName);
    url.searchParams.set("sort_by", "lowest_price");
    url.searchParams.set("limit", "1");
    url.searchParams.set("type", "buy_now");

    const response = await fetch(url, {
        headers: {
            Accept: "application/json",
            Authorization: apiKey
        }
    });

    if (!response.ok) {
        console.error(`CSFloat listings request returned HTTP ${response.status}.`);
        if (response.status === 401 || response.status === 403) {
            return jsonResponse({
                error: "Cloudflare'daki CSFLOAT_API_KEY kabul edilmedi. Secret değerini ve Production ortamına eklendiğini kontrol edip yeniden dağıt."
            }, 502, LISTING_CACHE_CONTROL);
        }
        return jsonResponse({ error: "CSFloat ilan fiyatı alınamadı." }, 502, LISTING_CACHE_CONTROL);
    }

    let result;
    try {
        result = await response.json();
    } catch (error) {
        console.error("CSFloat listings response was not valid JSON:", error);
        return jsonResponse({ error: "CSFloat ilan verisi okunamadı." }, 502, LISTING_CACHE_CONTROL);
    }

    if (!Array.isArray(result.data)) {
        console.error("CSFloat listings response had an unexpected format.");
        return jsonResponse({ error: "CSFloat ilan verisi beklenmeyen biçimde." }, 502, LISTING_CACHE_CONTROL);
    }

    const listing = result.data.find((entry) =>
        Number.isSafeInteger(entry.price)
        && entry.price > 0
        && entry.item?.market_hash_name === marketHashName
    );

    return jsonResponse({
        source: "CSFloat",
        currency: "USD",
        priceKind: "lowest_listing",
        priceCents: listing?.price ?? null,
        day: listing?.created_at ?? null,
        saleCount: null
    }, 200, LISTING_CACHE_CONTROL);
}

async function getDailyAverage(marketHashName) {
    const historyUrl = `https://csfloat.com/api/v1/history/${encodeURIComponent(marketHashName)}/graph`;
    const response = await fetch(historyUrl, { headers: { Accept: "application/json" } });
    if (!response.ok) {
        console.error(`CSFloat history request returned HTTP ${response.status}.`);
        return jsonResponse({ error: "CSFloat fiyat verisi alınamadı." }, 502);
    }

    let history;
    try {
        history = await response.json();
    } catch (error) {
        console.error("CSFloat history response was not valid JSON:", error);
        return jsonResponse({ error: "CSFloat fiyat verisi okunamadı." }, 502);
    }

    if (!Array.isArray(history)) {
        console.error("CSFloat history response had an unexpected format.");
        return jsonResponse({ error: "CSFloat fiyat verisi beklenmeyen biçimde." }, 502);
    }

    const latestSale = history
        .filter((entry) => Number.isFinite(entry.avg_price) && entry.avg_price > 0 && Number.isFinite(entry.count))
        .sort((left, right) => Date.parse(right.day) - Date.parse(left.day))[0];

    return jsonResponse({
        source: "CSFloat",
        currency: "USD",
        priceKind: "daily_average",
        priceCents: latestSale?.avg_price ?? null,
        day: latestSale?.day ?? null,
        saleCount: latestSale?.count ?? 0
    });
}

export async function onRequestGet({ request, env = {} }) {
    if (new URL(request.url).searchParams.get("health") === "1") {
        return jsonResponse({ ok: true });
    }

    const marketHashName = new URL(request.url).searchParams.get("market_hash_name")?.trim();
    if (!marketHashName || marketHashName.length > 200) {
        return jsonResponse({ error: "Geçerli bir item market adı gerekli." }, 400);
    }

    if (env.CSFLOAT_API_KEY?.trim()) {
        try {
            return await getLowestListing(marketHashName, env.CSFLOAT_API_KEY.trim());
        } catch (error) {
            console.error("CSFloat listings request failed:", error);
            return jsonResponse({ error: "CSFloat ilan fiyatına ulaşılamadı." }, 502, LISTING_CACHE_CONTROL);
        }
    }

    try {
        return await getDailyAverage(marketHashName);
    } catch (error) {
        console.error("CSFloat history request failed:", error);
        return jsonResponse({ error: "CSFloat fiyat servisine ulaşılamadı." }, 502);
    }
}

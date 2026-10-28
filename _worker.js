import { onRequestGet } from "./functions/api/csfloat-price.js";

const PRICE_ROUTE = "/api/csfloat-price";

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === PRICE_ROUTE) {
            if (request.method !== "GET") {
                return new Response("Method not allowed", {
                    status: 405,
                    headers: { Allow: "GET" }
                });
            }

            return onRequestGet({ request, env });
        }

        return env.ASSETS.fetch(request);
    }
};

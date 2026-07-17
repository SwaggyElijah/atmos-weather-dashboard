const STATION_ID = "KKYWESTL30";
const API_BASE = "https://api.weather.com/v2/pws";

export async function onRequestGet({ request, env }) {
  if (!env.WEATHER_UNDERGROUND_API_KEY) {
    return json({ error: "Weather service is not configured" }, 503);
  }

  const view = new URL(request.url).searchParams.get("view") || "current";
  const route = routeForView(view);
  if (!route) return json({ error: "Unsupported weather range" }, 400);

  const params = new URLSearchParams({
    stationId: env.WEATHER_STATION_ID || STATION_ID,
    format: "json",
    units: "e",
    numericPrecision: "decimal",
    apiKey: env.WEATHER_UNDERGROUND_API_KEY,
    ...route.params,
  });

  const upstream = await fetch(`${API_BASE}/${route.path}?${params}`);
  if (!upstream.ok) {
    const message = upstream.status === 401 || upstream.status === 403
      ? "Weather service credentials were rejected"
      : `Weather service returned ${upstream.status}`;
    return json({ error: message }, upstream.status);
  }

  return new Response(await upstream.text(), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": view === "current" ? "no-store" : "public, max-age=300",
    },
  });
}

function routeForView(view) {
  if (view === "current") return { path: "observations/current", params: {} };
  if (view === "24h") return { path: "observations/all/1day", params: {} };
  if (view === "7d") return { path: "observations/hourly/7day", params: {} };
  if (view === "30d") {
    const end = new Date();
    const start = new Date(end);
    start.setUTCDate(end.getUTCDate() - 29);
    return {
      path: "history/daily",
      params: { startDate: formatDate(start), endDate: formatDate(end) },
    };
  }
  return null;
}

function formatDate(date) {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

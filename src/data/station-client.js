import { sampleStation, makeHistory } from "./sample-data.js";

const config = {
  // Static hosts cannot run the secret-bearing weather proxy. Keep the public
  // GitHub Pages build useful without ever exposing the station API key.
  mode:
    location.protocol === "file:" || location.hostname.endsWith(".github.io")
      ? "sample"
      : "weather-underground-proxy",
  proxyEndpoint: "./api/weather",
  refreshMs: 30_000,
};

let daySummaryCache = { payload: null, expiresAt: 0 };

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getStationSnapshot() {
  if (config.mode === "sample") {
    await wait(520);
    return structuredClone(sampleStation);
  }

  const [currentPayload, dayPayload] = await Promise.all([
    fetchProxy("current"),
    getDaySummaryPayload(),
  ]);
  return normalizeSnapshot(currentPayload, dayPayload);
}

export async function getHistory(range) {
  if (config.mode === "sample") {
    await wait(220);
    return makeHistory(range);
  }

  const payload = await fetchProxy(range === "custom" ? "30d" : range);
  const history = normalizeHistory(payload);
  if (!history.length) throw new Error("No historical observations were returned");
  return history;
}

export function subscribeToStation(onData, onError) {
  const update = () => getStationSnapshot().then(onData).catch(onError);
  const id = setInterval(update, config.refreshMs);
  return () => clearInterval(id);
}

async function fetchProxy(view) {
  const url = new URL(config.proxyEndpoint, location.href);
  url.searchParams.set("view", view);
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Station request failed (${response.status})`);
  }
  return response.json();
}

async function getDaySummaryPayload() {
  if (daySummaryCache.payload && Date.now() < daySummaryCache.expiresAt) {
    return daySummaryCache.payload;
  }
  const payload = await fetchProxy("24h");
  daySummaryCache = { payload, expiresAt: Date.now() + 5 * 60_000 };
  return payload;
}

function normalizeSnapshot(currentPayload, dayPayload) {
  const observation = currentPayload.observations?.[0];
  if (!observation) throw new Error("The station has no current observation");

  const imperial = observation.imperial || {};
  const daily = summarizeDay(getObservations(dayPayload));
  const temperature = numberOrNull(imperial.temp);
  const feelsLike = temperature >= 80
    ? numberOrNull(imperial.heatIndex) ?? temperature
    : temperature <= 50
      ? numberOrNull(imperial.windChill) ?? temperature
      : temperature;

  return {
    station: {
      id: observation.stationID,
      name: observation.neighborhood || observation.stationID || "Personal weather station",
      location: [observation.neighborhood, observation.country].filter(Boolean).join(", ") || observation.stationID,
      elevation: numberOrNull(imperial.elev) ?? 0,
      status: "online",
      updatedAt: observation.obsTimeUtc || new Date().toISOString(),
      intervalSeconds: Number(observation.realtimeFrequency) || 300,
    },
    current: {
      temperatureF: temperature,
      feelsLikeF: feelsLike,
      condition: "Live station observation",
      conditionCode: "cloudy",
      humidity: numberOrNull(observation.humidity),
      windMph: numberOrNull(imperial.windSpeed),
      windDirection: numberOrNull(observation.winddir),
      windCardinal: cardinalDirection(observation.winddir),
      gustMph: numberOrNull(imperial.windGust),
      pressureInHg: numberOrNull(imperial.pressure),
      pressureTrend: daily.pressureTrend,
      precipitationIn: numberOrNull(imperial.precipRate),
      rainTodayIn: numberOrNull(imperial.precipTotal),
      visibilityMi: null,
      uvIndex: numberOrNull(observation.uv),
      dewPointF: numberOrNull(imperial.dewpt),
      airQuality: null,
      airQualityLabel: "Not reported",
      solarRadiation: numberOrNull(observation.solarRadiation),
    },
    today: {
      highF: daily.highF,
      lowF: daily.lowF,
      averageF: daily.averageF,
      rainfallIn: daily.rainfallIn,
      maxGustMph: daily.maxGustMph,
      sunrise: "—",
      sunset: "—",
    },
    records: [],
  };
}

function normalizeHistory(payload) {
  return getObservations(payload)
    .map((observation) => {
      const imperial = observation.imperial || {};
      const temperature = numberOrNull(imperial.tempAvg ?? imperial.temp);
      return {
        time: observation.obsTimeUtc || observation.obsTimeLocal || new Date().toISOString(),
        temperatureF: temperature,
        feelsLikeF: numberOrNull(imperial.heatindexAvg ?? imperial.windchillAvg ?? imperial.heatIndex ?? imperial.windChill) ?? temperature,
        humidity: numberOrNull(observation.humidityAvg ?? observation.humidity),
        pressureInHg: numberOrNull(imperial.pressureAvg ?? imperial.pressureMax ?? imperial.pressure),
        rainIn: numberOrNull(imperial.precipTotal) ?? 0,
      };
    })
    .filter((point) => Number.isFinite(point.temperatureF))
    .sort((a, b) => new Date(a.time) - new Date(b.time));
}

function summarizeDay(observations) {
  const metrics = observations.map((observation) => observation.imperial || {});
  const highs = metrics.map((item) => numberOrNull(item.tempHigh ?? item.temp)).filter(Number.isFinite);
  const lows = metrics.map((item) => numberOrNull(item.tempLow ?? item.temp)).filter(Number.isFinite);
  const averages = metrics.map((item) => numberOrNull(item.tempAvg ?? item.temp)).filter(Number.isFinite);
  const gusts = metrics.map((item) => numberOrNull(item.windgustHigh ?? item.windGust)).filter(Number.isFinite);
  const rain = metrics.map((item) => numberOrNull(item.precipTotal)).filter(Number.isFinite);
  const pressureTrend = metrics.map((item) => numberOrNull(item.pressureTrend)).filter(Number.isFinite).at(-1);
  return {
    highF: highs.length ? Math.max(...highs) : null,
    lowF: lows.length ? Math.min(...lows) : null,
    averageF: averages.length ? averages.reduce((sum, value) => sum + value, 0) / averages.length : null,
    maxGustMph: gusts.length ? Math.max(...gusts) : null,
    rainfallIn: rain.length ? Math.max(...rain) : null,
    pressureTrend: pressureTrend > 0 ? "rising" : pressureTrend < 0 ? "falling" : "steady",
  };
}

function getObservations(payload) {
  if (Array.isArray(payload?.observations)) return payload.observations;
  if (Array.isArray(payload?.summaries)) return payload.summaries;
  if (Array.isArray(payload)) return payload;
  return payload?.stationID ? [payload] : [];
}

function cardinalDirection(degrees) {
  if (!Number.isFinite(Number(degrees))) return "—";
  const points = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return points[Math.round(Number(degrees) / 22.5) % 16];
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

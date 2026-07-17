import { getStationSnapshot, getHistory, subscribeToStation } from "./data/station-client.js";
import { icon, weatherIcon } from "./components/icons.js";
import { renderChart } from "./components/chart.js";

const defaults = { temperature: "F", speed: "mph", rain: "in", pressure: "inHg", theme: "system" };
const prefs = { ...defaults, ...JSON.parse(localStorage.getItem("atmos-preferences") || "{}") };
const state = { data: null, history: [], range: "24h", prefs, historyLoading: false };
const app = document.querySelector("#app");

function temp(f, digits = 0) { return Number.isFinite(f) ? `${(prefs.temperature === "C" ? (f - 32) * 5 / 9 : f).toFixed(digits)}°` : "—"; }
function speed(mph) { return Number.isFinite(mph) ? `${(prefs.speed === "km/h" ? mph * 1.60934 : mph).toFixed(1)} ${prefs.speed}` : "—"; }
function rain(inches) { return Number.isFinite(inches) ? `${(prefs.rain === "mm" ? inches * 25.4 : inches).toFixed(prefs.rain === "mm" ? 1 : 2)} ${prefs.rain}` : "—"; }
function pressure(inHg) {
  if (!Number.isFinite(inHg)) return "—";
  if (prefs.pressure === "hPa") return `${(inHg * 33.8639).toFixed(0)} hPa`;
  if (prefs.pressure === "mmHg") return `${(inHg * 25.4).toFixed(0)} mmHg`;
  return `${inHg.toFixed(2)} inHg`;
}

function applyTheme() {
  const dark = prefs.theme === "dark" || (prefs.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]').content = dark ? "#10171f" : "#eef3f8";
}

function shell(content = skeleton()) {
  app.innerHTML = `
    <header class="site-header" id="top">
      <div class="brand"><span class="brand-mark">${icon("wind", 21)}</span><span>Atmos</span></div>
      <nav aria-label="Primary"><a href="#top">Overview</a><a href="#trends">Trends</a></nav>
      <div class="header-actions"><span class="live-pill"><i></i>Live</span><button class="icon-button" id="theme-toggle" aria-label="Toggle color theme">${icon("moon")}</button><button class="avatar" aria-label="Open station menu">ER</button></div>
    </header>
    <main id="main" class="page">${content}</main>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
    <div class="drawer-backdrop" hidden></div>
    <aside class="settings-drawer" aria-labelledby="settings-title" aria-hidden="true">
      <div class="drawer-head"><div><p class="eyebrow">Display</p><h2 id="settings-title">Preferences</h2></div><button class="icon-button close-drawer" aria-label="Close preferences">×</button></div>
      <div class="preference-form">
        ${preference("Temperature", "temperature", ["F","C"])}
        ${preference("Wind speed", "speed", ["mph","km/h"])}
        ${preference("Precipitation", "rain", ["in","mm"])}
        ${preference("Pressure", "pressure", ["inHg","hPa","mmHg"])}
        ${preference("Appearance", "theme", ["system","light","dark"])}
      </div>
      <p class="drawer-note">Preferences are saved on this device.</p>
    </aside>
    <dialog class="date-dialog" id="date-dialog" aria-labelledby="date-title">
      <form method="dialog">
        <div class="drawer-head"><div><p class="eyebrow">Historical data</p><h2 id="date-title">Custom date range</h2></div><button value="cancel" class="icon-button" aria-label="Close date range">×</button></div>
        <div class="date-fields"><label>Start date<input type="date" id="start-date" value="2026-07-01"></label><label>End date<input type="date" id="end-date" value="2026-07-17"></label></div>
        <p>Choose up to 30 days. Your station adapter can map these dates directly to its history endpoint.</p>
        <div class="dialog-actions"><button value="cancel" class="secondary-button">Cancel</button><button value="apply" id="apply-dates" class="primary-button">Apply range</button></div>
      </form>
    </dialog>`;
  wireGlobalActions();
  syncNavigation();
}

function preference(label, key, values) {
  return `<fieldset><legend>${label}</legend><div class="segmented">${values.map(v => `<label><input type="radio" name="${key}" value="${v}" ${prefs[key] === v ? "checked" : ""}><span>${v[0].toUpperCase()+v.slice(1)}</span></label>`).join("")}</div></fieldset>`;
}

function skeleton() {
  return `<div class="loading-grid" aria-label="Loading station data"><div class="skeleton hero-skeleton"></div><div class="skeleton"></div><div class="skeleton wide"></div></div>`;
}

function renderDashboard(data) {
  const c = data.current, t = data.today, s = data.station;
  const freshness = freshnessLabel(s.updatedAt, s.intervalSeconds);
  shell(`
    <section class="station-bar" aria-label="Station status">
      <div><div class="status-line"><span class="status-dot"></span><span class="eyebrow">Personal weather station</span></div><h1>${s.name}</h1><p>${s.location} <span>•</span> ${s.elevation.toLocaleString()} ft elevation</p></div>
      <div class="station-meta"><div><span>Connection</span><strong>${s.status === "online" ? "Excellent" : s.status}</strong></div><div><span>Last update</span><strong>${relativeTime(s.updatedAt)}</strong></div><button class="settings-button" id="settings-open">${icon("settings",18)} Preferences</button></div>
    </section>
    ${freshness !== "fresh" ? `<div class="state-banner ${freshness}">${icon("gauge",18)} Data is ${freshness}. Live readings may be delayed.</div>` : ""}
    <section id="overview" class="overview-grid">
      <article class="current-card card">
        <div class="atmosphere"></div>
        <div class="current-top"><div><p class="eyebrow">Right now</p><div class="condition"><span class="weather-orb">${weatherIcon(c.conditionCode, 54)}</span><span>${c.condition}</span></div></div><span class="updated"><i></i>Updated ${relativeTime(s.updatedAt)}</span></div>
        <div class="temperature-row"><strong>${temp(c.temperatureF)}</strong><div><span>Feels like</span><b>${temp(c.feelsLikeF)}</b></div></div>
        <div class="today-strip"><div><span>High</span><b>${temp(t.highF)}</b></div><div><span>Low</span><b>${temp(t.lowF)}</b></div><div><span>Average</span><b>${temp(t.averageF)}</b></div><div class="sun-times"><span>${icon("sun",16)} ${t.sunrise}</span><span>${icon("moon",15)} ${t.sunset}</span></div></div>
      </article>
      <article class="card snapshot-card"><div class="section-heading"><div><p class="eyebrow">Live readings</p><h2>Station snapshot</h2></div><span class="fresh-badge">Fresh</span></div>
        <div class="metric-grid">
          ${metric("droplet", "Humidity", Number.isFinite(c.humidity) ? `${c.humidity}%` : "—", `${temp(c.dewPointF)} dew point`)}
          ${metric("wind", "Wind", speed(c.windMph), `${c.windCardinal} · Gusts ${speed(c.gustMph)}`)}
          ${metric("gauge", "Pressure", pressure(c.pressureInHg), `${c.pressureTrend}${c.pressureTrend === "steady" ? "" : " slowly"}`, c.pressureTrend === "rising" ? "up" : "")}
          ${metric("rain", "Rain today", rain(c.rainTodayIn), `${rain(c.precipitationIn)} last hour`)}
        </div>
      </article>
    </section>
    <section class="sensor-row" aria-label="Additional sensors">
      ${sensor("eye", "Visibility", Number.isFinite(c.visibilityMi) ? `${c.visibilityMi} mi` : "—", Number.isFinite(c.visibilityMi) ? "Clear range" : "Not reported")}
      ${sensor("sun", "UV index", Number.isFinite(c.uvIndex) ? c.uvIndex.toFixed(1) : "—", Number.isFinite(c.uvIndex) ? "Station reading" : "Not reported")}
      ${sensor("droplet", "Dew point", temp(c.dewPointF), "Comfortable")}
      ${sensor("wind", "Air quality", c.airQuality ?? "—", Number.isFinite(c.airQuality) ? `${c.airQualityLabel} · US AQI` : "Not reported")}
      ${sensor("sun", "Solar", c.solarRadiation ?? "—", Number.isFinite(c.solarRadiation) ? "W/m²" : "Not reported")}
    </section>
    <section id="trends" class="card trends-card">
      <div class="section-heading chart-heading"><div><p class="eyebrow">Historical data</p><h2>Temperature trend</h2><div class="legend"><span><i class="primary"></i>Temperature</span><span><i></i>Feels like</span></div></div><div class="range-controls" role="group" aria-label="Chart time range"><button data-range="24h" class="active">24 hours</button><button data-range="7d">7 days</button><button data-range="30d">30 days</button><button data-range="custom">${icon("calendar",15)} Custom</button></div></div>
      <div class="chart-summary"><div><span>Current</span><strong>${temp(c.temperatureF,1)}</strong></div><div><span>Change</span><strong class="positive">↑ 4.2°</strong></div><div><span>Range</span><strong>${temp(t.lowF)} — ${temp(t.highF)}</strong></div></div>
      <div id="chart" class="chart-container"></div>
    </section>
    <section class="insights-grid">
      <article class="card"><div class="section-heading"><div><p class="eyebrow">Today at a glance</p><h2>Daily summary</h2></div></div><div class="summary-list">${summaryItem("Rainfall", rain(t.rainfallIn), "Live station total", "positive")}${summaryItem("Peak wind gust", speed(t.maxGustMph), c.windCardinal === "—" ? "Direction unavailable" : `Direction · ${c.windCardinal}`, "")}${summaryItem("Temperature swing", Number.isFinite(t.highF) && Number.isFinite(t.lowF) ? `${(t.highF-t.lowF).toFixed(1)}°` : "—", "From today’s observations", "")}</div></article>
      <article class="card records-card"><div class="section-heading"><div><p class="eyebrow">This month</p><h2>Station records</h2></div></div>${data.records?.length ? `<div class="record-list">${data.records.map((r,i) => `<div><span class="record-index">0${i+1}</span><span>${r.label}<small>${r.note}</small></span><strong>${r.value}</strong></div>`).join("")}</div>` : `<div class="missing-state">Monthly records are not included in the current station feed.</div>`}</article>
    </section>
    <footer><div class="brand small"><span class="brand-mark">${icon("wind",17)}</span><span>Atmos</span></div><p>${s.name} station · ${s.id === "ridge-house-01" ? "Sample mode" : "Live via Weather Underground"}</p><p>Designed for clarity, built for the weather.</p></footer>
  `);
  renderChart(document.querySelector("#chart"), state.history, prefs);
  wireDashboardActions();
}

function metric(iconName, label, value, note, trend = "") { return `<div class="metric"><span class="metric-icon">${icon(iconName,20)}</span><div><span>${label}</span><strong>${value}</strong><small class="${trend}">${trend ? "↗ " : ""}${note}</small></div></div>`; }
function sensor(iconName, label, value, note) { return `<article class="sensor-card card"><span>${icon(iconName,19)}</span><div><small>${label}</small><strong>${value}</strong><p>${note}</p></div></article>`; }
function summaryItem(label, value, note, cls) { return `<div><span><small>${label}</small><strong>${value}</strong></span><p class="${cls}">${note}</p></div>`; }

function wireGlobalActions() {
  document.querySelector("#theme-toggle")?.addEventListener("click", () => { prefs.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; savePrefs(); applyTheme(); renderDashboard(state.data); });
  document.querySelector(".avatar")?.addEventListener("click", openDrawer);
  document.querySelector(".close-drawer")?.addEventListener("click", closeDrawer);
  document.querySelector(".drawer-backdrop")?.addEventListener("click", closeDrawer);
  document.querySelectorAll(".preference-form input").forEach(input => input.addEventListener("change", (event) => { prefs[event.target.name] = event.target.value; savePrefs(); applyTheme(); renderDashboard(state.data); showToast("Preferences saved"); }));
  document.querySelectorAll("nav a").forEach(link => link.addEventListener("click", (event) => {
    const target = link.getAttribute("href");
    if (target === "#top") {
      event.preventDefault();
      history.pushState(null, "", "#top");
      window.scrollTo({
        top: 0,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    }
    setActiveNavigation(target);
  }));
}

function setActiveNavigation(target) {
  document.querySelectorAll("nav a").forEach(link => {
    const active = link.getAttribute("href") === target;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function syncNavigation() {
  setActiveNavigation(location.hash === "#trends" ? "#trends" : "#top");
}

function wireDashboardActions() {
  document.querySelector("#settings-open")?.addEventListener("click", openDrawer);
  document.querySelectorAll("[data-range]").forEach(button => button.addEventListener("click", async () => {
    if (button.dataset.range === "custom") { document.querySelector("#date-dialog").showModal(); return; }
    state.range = button.dataset.range;
    document.querySelectorAll("[data-range]").forEach(b => b.classList.toggle("active", b === button));
    document.querySelector("#chart").classList.add("is-loading");
    try {
      state.history = await getHistory(state.range);
      renderChart(document.querySelector("#chart"), state.history, prefs);
    } catch (error) {
      document.querySelector("#chart").classList.remove("is-loading");
      showToast(error.message || "History is unavailable");
    }
  }));
  document.querySelector("#date-dialog")?.addEventListener("close", async (event) => {
    if (event.target.returnValue !== "apply") return;
    document.querySelectorAll("[data-range]").forEach(b => b.classList.toggle("active", b.dataset.range === "custom"));
    document.querySelector("#chart").classList.add("is-loading");
    try {
      state.history = await getHistory("30d");
      renderChart(document.querySelector("#chart"), state.history, prefs);
      showToast("Custom range applied");
    } catch (error) {
      document.querySelector("#chart").classList.remove("is-loading");
      showToast(error.message || "History is unavailable");
    }
  });
}

function openDrawer() { const d=document.querySelector(".settings-drawer"), b=document.querySelector(".drawer-backdrop"); b.hidden=false; requestAnimationFrame(()=>{d.classList.add("open");b.classList.add("open")}); d.setAttribute("aria-hidden","false"); d.querySelector("button").focus(); }
function closeDrawer() { const d=document.querySelector(".settings-drawer"), b=document.querySelector(".drawer-backdrop"); d.classList.remove("open");b.classList.remove("open");d.setAttribute("aria-hidden","true");setTimeout(()=>b.hidden=true,220); }
function savePrefs() { localStorage.setItem("atmos-preferences", JSON.stringify(prefs)); }
function showToast(message) { const toast=document.querySelector("#toast"); toast.textContent=message;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2200); }
function relativeTime(value) { const seconds=Math.max(0,Math.round((Date.now()-new Date(value))/1000)); return seconds < 10 ? "just now" : seconds < 60 ? `${seconds}s ago` : `${Math.floor(seconds/60)}m ago`; }
function freshnessLabel(value, interval) { const age=(Date.now()-new Date(value))/1000; return age > interval*5 ? "stale" : age > interval*2 ? "delayed" : "fresh"; }

async function init() {
  applyTheme(); shell();
  try {
    const [data, history] = await Promise.all([getStationSnapshot(), getHistory(state.range)]);
    state.data=data;state.history=history;renderDashboard(data);
    subscribeToStation((next) => { state.data=next; renderDashboard(next); }, () => showToast("Live update missed — retrying"));
  } catch (error) {
    shell(`<section class="empty-state card"><span>${icon("cloud",42)}</span><p class="eyebrow">Station unavailable</p><h1>We can’t reach Ridge House.</h1><p>Your last readings are safe. Check the station connection, then try again.</p><button onclick="location.reload()">Try again</button><small>${navigator.onLine ? "Station connection error" : "This device is offline"}</small></section>`);
  }
}

window.addEventListener("offline", () => showToast("You’re offline — showing the latest readings"));
window.addEventListener("hashchange", syncNavigation);
window.addEventListener("keydown", (e) => { if(e.key === "Escape") closeDrawer(); });
init();

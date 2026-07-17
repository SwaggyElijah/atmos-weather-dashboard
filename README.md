# Atmos — Personal Weather Station Dashboard

A dependency-free, responsive dashboard connected to a Weather Underground personal weather station through a secure same-site proxy.

## Weather Underground setup

The station ID is configured in `functions/api/weather.js`. The API key is intentionally not stored in the project or sent to the browser.

For Cloudflare Pages:

1. In this directory, run `npm run deploy` and complete Cloudflare's sign-in prompt. Wrangler creates or selects the Pages project and publishes the `dist` bundle together with the `functions` directory.
2. In Cloudflare, open **Workers & Pages → atmos-weather-dashboard → Settings → Variables and Secrets**.
3. Add an encrypted secret named `WEATHER_UNDERGROUND_API_KEY`.
4. Optionally add `WEATHER_STATION_ID` to override the station ID in code.
5. Redeploy with `npm run deploy`. The browser calls `/api/weather`; the Pages Function adds the secret and contacts Weather Underground.

The included `wrangler.jsonc`, deployment scripts, security headers, and Pages Function make the project ready for a public `pages.dev` address. The API key is never included in the deployment bundle.

For local live-data development, copy `.dev.vars.example` to `.dev.vars`, enter the values locally, and run the project with Cloudflare Pages development tooling. `.dev.vars` is ignored by Git.

Opening `index.html` directly with a `file://` URL intentionally uses realistic sample data because a static file cannot safely hold or proxy an API secret.

## Data integration

The proxy supports:

- Current Weather Underground PWS observations
- Rapid 24-hour observations
- Seven-day hourly history
- Thirty-day daily history
- Thirty-second automatic live refresh for current observations

Weather Underground fields are normalized in `src/data/station-client.js`. Measurements not reported by the PWS feed, such as visibility or air quality, are displayed as unavailable instead of being replaced with fictional values.

## Built-in experience

- Loading, offline, stale-data and API failure states
- Accessible SVG charts with keyboard tooltips
- Fahrenheit/Celsius, wind, precipitation and pressure preferences
- System-aware light/dark modes and reduced-motion support
- Responsive desktop, tablet and mobile layouts

## Deployment note

GitHub Pages cannot run a secure server-side function. The static dashboard can be hosted there in sample mode, but live Weather Underground data requires a host with serverless functions, such as Cloudflare Pages, Netlify or Vercel.

export function icon(name, size = 20) {
  const paths = {
    sun: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/>',
    cloud: '<path d="M6.5 18h11a4.5 4.5 0 0 0 .5-8.97A6.5 6.5 0 0 0 5.7 8.2 5 5 0 0 0 6.5 18Z"/>',
    partly: '<path d="M8 7a4 4 0 0 1 7.4-2.1M14 2v1.5M19.7 4.3l-1.1 1.1M21 10h-1.5"/><path d="M6.5 19h10a4.5 4.5 0 0 0 .5-8.97A6.5 6.5 0 0 0 5.7 9.2 5 5 0 0 0 6.5 19Z"/>',
    rain: '<path d="M6.5 15h11a4.5 4.5 0 0 0 .5-8.97A6.5 6.5 0 0 0 5.7 5.2 5 5 0 0 0 6.5 15Z"/><path d="m8 18-1 2M13 18l-1 2M18 18l-1 2"/>',
    storm: '<path d="M6.5 14h11a4.5 4.5 0 0 0 .5-8.97A6.5 6.5 0 0 0 5.7 4.2 5 5 0 0 0 6.5 14Z"/><path d="m13 15-3 5h4l-2 3"/>',
    droplet: '<path d="M12 2s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12Z"/>',
    wind: '<path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h6"/>',
    gauge: '<path d="M4.9 19a9 9 0 1 1 14.2 0"/><path d="m12 13 4-4M7 18h10"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15 9-2 4-4 2 2-4 4-2Z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.09 14H3v-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63 1.7 1.7 0 0 0 10 3.09V3h4v.09A1.7 1.7 0 0 0 15 4.64a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9 1.7 1.7 0 0 0 20.91 10H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z"/>',
    moon: '<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  };
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.sun}</svg>`;
}

export function weatherIcon(condition, size = 28) {
  const map = { sunny: "sun", cloudy: "cloud", "partly-cloudy": "partly", rain: "rain", storm: "storm" };
  return icon(map[condition] ?? "partly", size);
}

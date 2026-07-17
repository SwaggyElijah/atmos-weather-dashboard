const NS = "http://www.w3.org/2000/svg";

export function renderChart(container, points, units) {
  const values = points.map((p) => units.temperature === "C" ? (p.temperatureF - 32) * 5 / 9 : p.temperatureF);
  const feels = points.map((p) => units.temperature === "C" ? (p.feelsLikeF - 32) * 5 / 9 : p.feelsLikeF);
  const width = 800, height = 230, padX = 16, padY = 22;
  const min = Math.floor(Math.min(...values, ...feels) - 3);
  const max = Math.ceil(Math.max(...values, ...feels) + 3);
  const x = (i) => padX + i * ((width - padX * 2) / Math.max(1, points.length - 1));
  const y = (value) => height - padY - ((value - min) / (max - min)) * (height - padY * 2);
  const path = (series) => series.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${path(values)} L${x(values.length - 1)},${height - padY} L${x(0)},${height - padY} Z`;

  container.innerHTML = `
    <div class="chart-wrap">
      <svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Temperature trend chart">
        <defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".24"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
        ${[0,.25,.5,.75,1].map((f) => `<line x1="${padX}" y1="${padY + f * (height-padY*2)}" x2="${width-padX}" y2="${padY + f*(height-padY*2)}" class="grid-line"/>`).join("")}
        <path d="${area}" fill="url(#chart-fill)"/>
        <path d="${path(feels)}" class="chart-line secondary"/>
        <path d="${path(values)}" class="chart-line primary"/>
        <g class="chart-points">${values.map((v,i) => `<circle cx="${x(i)}" cy="${y(v)}" r="12" fill="transparent" data-index="${i}" tabindex="0"/>`).join("")}</g>
      </svg>
      <div class="chart-tooltip" role="status" aria-live="polite"></div>
      <div class="chart-axis"><span>${formatTime(points[0].time)}</span><span>${formatTime(points[Math.floor(points.length/2)].time)}</span><span>${formatTime(points.at(-1).time)}</span></div>
    </div>`;

  const tooltip = container.querySelector(".chart-tooltip");
  container.querySelectorAll("circle[data-index]").forEach((node) => {
    const show = () => {
      const i = +node.dataset.index;
      tooltip.innerHTML = `<strong>${values[i].toFixed(1)}°</strong><span>Feels ${feels[i].toFixed(1)}° · ${formatTime(points[i].time)}</span>`;
      tooltip.style.left = `${Math.min(82, Math.max(12, (i / (points.length - 1)) * 100))}%`;
      tooltip.classList.add("visible");
    };
    node.addEventListener("mouseenter", show);
    node.addEventListener("focus", show);
    node.addEventListener("mouseleave", () => tooltip.classList.remove("visible"));
    node.addEventListener("blur", () => tooltip.classList.remove("visible"));
  });
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric" }).format(new Date(value));
}

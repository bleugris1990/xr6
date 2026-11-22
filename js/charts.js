// charts.js — petits graphes SVG faits main, sans dépendance externe.

const ACCENT = "#5aa9ff";
const GRID_COLOR = "#2c2c2e";
const LINE_COLOR = "#4a4a4c";
const TEXT_COLOR = "#9a9a9a";

function formatShortDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function niceRange(min, max) {
  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.1);
    return [min - pad, max + pad];
  }
  const span = max - min;
  const pad = span * 0.12;
  return [min - pad, max + pad];
}

function pickLabelIndices(n) {
  // Choisit quels points annoter en abscisse pour éviter le chevauchement.
  if (n <= 6) return Array.from({ length: n }, (_, i) => i);
  const idx = new Set([0, n - 1]);
  const step = Math.ceil(n / 5);
  for (let i = 0; i < n; i += step) idx.add(i);
  return Array.from(idx).sort((a, b) => a - b);
}

function svgEl(tag, attrs) {
  const parts = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
  return `<${tag} ${parts}/>`;
}

export function renderVolumeChartSVG(points) {
  const width = 320;
  const height = 170;
  const padL = 36;
  const padR = 14;
  const padT = 16;
  const padB = 26;

  if (points.length === 0) return "";

  const volumes = points.map((p) => p.volume);
  const [yMin, yMax] = niceRange(Math.min(...volumes), Math.max(...volumes));

  const n = points.length;
  const xStep = n > 1 ? (width - padL - padR) / (n - 1) : 0;
  const xFor = (i) => padL + (n > 1 ? i * xStep : (width - padL - padR) / 2);
  const yFor = (v) =>
    padT + (height - padT - padB) * (1 - (v - yMin) / (yMax - yMin));

  let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

  // ligne de base
  svg += svgEl("line", {
    x1: padL,
    y1: height - padB,
    x2: width - padR,
    y2: height - padB,
    stroke: GRID_COLOR,
    "stroke-width": 1,
  });

  // labels Y (min/max)
  svg += `<text x="4" y="${padT + 4}" font-size="9" fill="${TEXT_COLOR}">${Math.round(
    yMax
  )}</text>`;
  svg += `<text x="4" y="${height - padB + 3}" font-size="9" fill="${TEXT_COLOR}">${Math.round(
    yMin
  )}</text>`;

  // polyligne reliant les points
  const linePoints = points
    .map((p, i) => `${xFor(i)},${yFor(p.volume)}`)
    .join(" ");
  svg += `<polyline points="${linePoints}" fill="none" stroke="${LINE_COLOR}" stroke-width="2"/>`;

  // points colorés par routine
  points.forEach((p, i) => {
    svg += svgEl("circle", {
      cx: xFor(i),
      cy: yFor(p.volume),
      r: 5,
      fill: p.routineColor,
    });
  });

  // labels X (dates)
  const labelIdx = pickLabelIndices(n);
  labelIdx.forEach((i) => {
    svg += `<text x="${xFor(i)}" y="${height - 8}" font-size="9" fill="${TEXT_COLOR}" text-anchor="middle">${formatShortDate(
      points[i].date
    )}</text>`;
  });

  svg += "</svg>";
  return svg;
}

export function renderWeightChartSVG(entries) {
  const width = 320;
  const height = 150;
  const padL = 36;
  const padR = 14;
  const padT = 16;
  const padB = 26;

  if (entries.length === 0) return "";

  const weights = entries.map((e) => e.weight);
  const [yMin, yMax] = niceRange(Math.min(...weights), Math.max(...weights));

  const n = entries.length;
  const xStep = n > 1 ? (width - padL - padR) / (n - 1) : 0;
  const xFor = (i) => padL + (n > 1 ? i * xStep : (width - padL - padR) / 2);
  const yFor = (v) =>
    padT + (height - padT - padB) * (1 - (v - yMin) / (yMax - yMin));

  let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

  svg += svgEl("line", {
    x1: padL,
    y1: height - padB,
    x2: width - padR,
    y2: height - padB,
    stroke: GRID_COLOR,
    "stroke-width": 1,
  });

  svg += `<text x="4" y="${padT + 4}" font-size="9" fill="${TEXT_COLOR}">${yMax.toFixed(
    1
  )}</text>`;
  svg += `<text x="4" y="${height - padB + 3}" font-size="9" fill="${TEXT_COLOR}">${yMin.toFixed(
    1
  )}</text>`;

  const linePoints = entries
    .map((e, i) => `${xFor(i)},${yFor(e.weight)}`)
    .join(" ");
  svg += `<polyline points="${linePoints}" fill="none" stroke="${ACCENT}" stroke-width="2"/>`;

  entries.forEach((e, i) => {
    svg += svgEl("circle", { cx: xFor(i), cy: yFor(e.weight), r: 4, fill: ACCENT });
  });

  const labelIdx = pickLabelIndices(n);
  labelIdx.forEach((i) => {
    svg += `<text x="${xFor(i)}" y="${height - 8}" font-size="9" fill="${TEXT_COLOR}" text-anchor="middle">${formatShortDate(
      entries[i].date
    )}</text>`;
  });

  svg += "</svg>";
  return svg;
}

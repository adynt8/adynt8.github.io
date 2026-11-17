// Dependency-free SVG charts.
import { normalPdf, toUnit } from './stats.js';
import { esc } from './layout.js';

const W = 640;
const H = 240;
const PAD = { l: 16, r: 16, t: 28, b: 34 };

function niceStep(range, target = 8) {
  const raw = range / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => range / s <= target) ?? raw;
}

function ticks(min, max, unit, scaleX) {
  const lo = toUnit(min, unit);
  const hi = toUnit(max, unit);
  const step = niceStep(hi - lo);
  let out = '';
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
    const x = scaleX(unit === 'in' ? v * 2.54 : v);
    out += `<line class="axis" x1="${x}" x2="${x}" y1="${H - PAD.b}" y2="${H - PAD.b + 5}"/>
      <text x="${x}" y="${H - PAD.b + 19}" text-anchor="middle">${+v.toFixed(2)}</text>`;
  }
  return out;
}

/**
 * Bell curve for a normal distribution with an optional "you" marker.
 * All inputs in cm; axis labels in `unit`.
 */
export function bellCurve({ dist, value, unit, title }) {
  const { mean, sd } = dist;
  let min = mean - 3.5 * sd;
  let max = mean + 3.5 * sd;
  if (Number.isFinite(value)) { min = Math.min(min, value - sd * 0.5); max = Math.max(max, value + sd * 0.5); }
  const peak = normalPdf(mean, mean, sd);
  const sx = (x) => PAD.l + ((x - min) / (max - min)) * (W - PAD.l - PAD.r);
  const sy = (y) => H - PAD.b - (y / peak) * (H - PAD.t - PAD.b);

  const N = 160;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const x = min + ((max - min) * i) / N;
    return [x, normalPdf(x, mean, sd)];
  });
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join('');
  const base = H - PAD.b;
  const area = `${line}L${sx(max)},${base}L${sx(min)},${base}Z`;

  let below = '';
  let marker = '';
  if (Number.isFinite(value)) {
    const under = pts.filter(([x]) => x <= value);
    if (under.length) {
      const yv = normalPdf(value, mean, sd);
      below = `<path class="area-below" d="M${sx(min)},${base}${under.map(([x, y]) => `L${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join('')}L${sx(value)},${sy(yv)}L${sx(value)},${base}Z"/>`;
    }
    const xv = sx(value);
    const anchor = xv > W - 80 ? 'end' : xv < 80 ? 'start' : 'middle';
    marker = `<line class="you-line" x1="${xv}" x2="${xv}" y1="${PAD.t - 6}" y2="${base}"/>
      <text class="you-label" x="${xv}" y="${PAD.t - 12}" text-anchor="${anchor}">You</text>`;
  }

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title || 'Distribution chart')}">
    <path class="area" d="${area}"/>${below}
    <path class="curve" d="${line}"/>
    <line class="avg-line" x1="${sx(mean)}" x2="${sx(mean)}" y1="${PAD.t}" y2="${base}"/>
    <text x="${sx(mean)}" y="${PAD.t - 12}" text-anchor="middle">avg</text>
    <line class="axis" x1="${PAD.l}" x2="${W - PAD.r}" y1="${base}" y2="${base}"/>
    ${ticks(min, max, unit, sx)}
    ${marker}
  </svg>`;
}

/** Histogram of values (cm) with optional highlighted bin for `you`. */
export function histogram({ values, unit, you, title, binCm }) {
  if (!values.length) return '<p class="empty">No data yet.</p>';
  const min = Math.floor(Math.min(...values));
  const max = Math.ceil(Math.max(...values));
  const bin = binCm ?? (unit === 'in' ? 1.27 : 1);
  const bins = Math.max(1, Math.ceil((max - min) / bin));
  const counts = new Array(bins).fill(0);
  for (const v of values) counts[Math.min(bins - 1, Math.floor((v - min) / bin))]++;
  const top = Math.max(...counts);
  const sx = (x) => PAD.l + ((x - min) / (bins * bin)) * (W - PAD.l - PAD.r);
  const sy = (c) => H - PAD.b - (c / top) * (H - PAD.t - PAD.b);
  const youBin = Number.isFinite(you) ? Math.floor((you - min) / bin) : -1;
  const bars = counts.map((c, i) => {
    const x0 = sx(min + i * bin) + 1;
    const x1 = sx(min + (i + 1) * bin) - 1;
    return `<rect class="bar${i === youBin ? ' you' : ''}" x="${x0}" y="${sy(c)}" width="${Math.max(1, x1 - x0)}" height="${H - PAD.b - sy(c)}" rx="3">
      <title>${toUnit(min + i * bin, unit).toFixed(1)}–${toUnit(min + (i + 1) * bin, unit).toFixed(1)} ${unit}: ${c}</title></rect>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title || 'Histogram')}">
    ${bars}
    <line class="axis" x1="${PAD.l}" x2="${W - PAD.r}" y1="${H - PAD.b}" y2="${H - PAD.b}"/>
    ${ticks(min, min + bins * bin, unit, sx)}
  </svg>`;
}

/** Simple line chart of dated values (cm). points: [{date, value}] */
export function lineChart({ series, unit, title }) {
  const all = series.flatMap((s) => s.points);
  if (all.length < 2) return '<p class="empty">Save at least two entries to see a trend.</p>';
  const t0 = Math.min(...all.map((p) => +new Date(p.date)));
  const t1 = Math.max(...all.map((p) => +new Date(p.date)));
  let lo = Math.min(...all.map((p) => p.value));
  let hi = Math.max(...all.map((p) => p.value));
  const padV = Math.max(0.5, (hi - lo) * 0.15);
  lo -= padV; hi += padV;
  const left = 44;
  const sx = (t) => left + ((t - t0) / Math.max(1, t1 - t0)) * (W - left - PAD.r);
  const sy = (v) => H - PAD.b - ((v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const step = niceStep(toUnit(hi - lo, unit), 5);
  let grid = '';
  for (let v = Math.ceil(toUnit(lo, unit) / step) * step; v <= toUnit(hi, unit); v += step) {
    const y = sy(unit === 'in' ? v * 2.54 : v);
    grid += `<line class="grid-line" x1="${left}" x2="${W - PAD.r}" y1="${y}" y2="${y}"/><text x="${left - 6}" y="${y + 4}" text-anchor="end">${+v.toFixed(2)}</text>`;
  }
  const fmtDate = (t) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: t1 - t0 > 3e10 ? '2-digit' : undefined });
  const paths = series.map((s) => {
    const pts = [...s.points].sort((a, b) => new Date(a.date) - new Date(b.date));
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(+new Date(p.date)).toFixed(1)},${sy(p.value).toFixed(1)}`).join('');
    const dots = pts.map((p) => `<circle cx="${sx(+new Date(p.date))}" cy="${sy(p.value)}" r="4" fill="${s.color}"><title>${new Date(p.date).toLocaleDateString()}: ${toUnit(p.value, unit).toFixed(2)} ${unit}</title></circle>`).join('');
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5"/>${dots}`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title || 'Trend')}">
    ${grid}${paths}
    <text x="${left}" y="${H - 8}">${fmtDate(t0)}</text>
    <text x="${W - PAD.r}" y="${H - 8}" text-anchor="end">${fmtDate(t1)}</text>
  </svg>`;
}

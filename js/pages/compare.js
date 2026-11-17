import { $, $$, esc } from '../layout.js';
import { POPULATIONS, PREFERENCE, toUnit, fromUnit, fmt, cylinderVolumeMl } from '../stats.js';
import { OBJECTS } from '../data.js';
import * as store from '../store.js';

const local = store.load();
let unit = local.unit;
let mode = 'erect';

const key = (m, dim) => `${m}${dim === 'length' ? 'Length' : 'Girth'}`;

// Each source returns {length, girth} in cm for the current mode, or null when not applicable.
const SOURCES = [
  { id: 'you', label: 'You (saved measurements)', get: (m) => pick(local.measurements, m) },
  ...Object.entries(POPULATIONS).map(([id, p]) => ({
    id: `avg-${id}`,
    label: `Average — ${p.label}`,
    get: (m) => pick(Object.fromEntries(Object.entries(p.stats).map(([k, v]) => [k, v.mean])), m),
  })),
  { id: 'pref', label: 'Partner preference (long-term)', get: (m) => (m === 'erect' ? { length: PREFERENCE.longTerm.erectLength, girth: PREFERENCE.longTerm.erectGirth } : null) },
  { id: 'custom', label: 'Custom size', get: () => null },
  ...OBJECTS.filter((o) => o.girth).map((o) => ({ id: `obj-${o.name}`, label: o.name, object: true, get: () => ({ length: o.length, girth: o.girth }) })),
];

function pick(obj, m) {
  const length = obj[key(m, 'length')];
  const girth = obj[key(m, 'girth')];
  return Number.isFinite(length) || Number.isFinite(girth) ? { length, girth } : null;
}

const sides = {
  a: { source: store.hasMeasurements() ? 'you' : 'avg-global', length: null, girth: null },
  b: { source: 'avg-global', length: null, girth: null },
};

function fillSelect(sel, current) {
  const groups = { people: [], objects: [] };
  for (const s of SOURCES) (s.object ? groups.objects : groups.people).push(`<option value="${esc(s.id)}">${esc(s.label)}</option>`);
  sel.innerHTML = `<optgroup label="Sizes">${groups.people.join('')}</optgroup><optgroup label="Everyday objects">${groups.objects.join('')}</optgroup>`;
  sel.value = current;
}

function resolve(side) {
  const s = sides[side];
  const src = SOURCES.find((x) => x.id === s.source);
  if (src && src.id !== 'custom') {
    const v = src.get(mode);
    if (v) { s.length = v.length ?? s.length; s.girth = v.girth ?? s.girth; }
  }
  s.length ??= mode === 'erect' ? 13.1 : 9.2;
  s.girth ??= mode === 'erect' ? 11.7 : 9.3;
}

function syncInputs() {
  for (const side of ['a', 'b']) {
    const s = sides[side];
    const digits = unit === 'in' ? 2 : 1;
    for (const dim of ['length', 'girth']) {
      const input = $(`#${side}-${dim}`);
      if (input !== document.activeElement) input.value = +toUnit(s[dim], unit).toFixed(digits);
    }
    $(`#${side}-source`).value = s.source;
    $(`#${side}-title`).textContent = SOURCES.find((x) => x.id === s.source)?.label.replace(/ \(.*\)$/, '') ?? 'Custom';
  }
  $$('.unit').forEach((el) => { el.textContent = unit; });
}

function shape(x, s, scale, baseY, color, label, isObject) {
  const h = s.length * scale;
  const w = Math.max(6, (s.girth / Math.PI) * scale);
  const r = isObject ? Math.min(8, w / 4) : w / 2;
  const top = baseY - h;
  // Rounded top, gently rounded base.
  const path = isObject
    ? `<rect x="${x - w / 2}" y="${top}" width="${w}" height="${h}" rx="${r}" fill="${color}" fill-opacity=".85"/>`
    : `<path d="M${x - w / 2},${baseY - 4} L${x - w / 2},${top + r} A${w / 2},${r} 0 0 1 ${x + w / 2},${top + r} L${x + w / 2},${baseY - 4} Q${x + w / 2},${baseY} ${x + w / 2 - 4},${baseY} L${x - w / 2 + 4},${baseY} Q${x - w / 2},${baseY} ${x - w / 2},${baseY - 4} Z" fill="${color}" fill-opacity=".85"/>`;
  return `${path}
    <text x="${x}" y="${top - 10}" text-anchor="middle" style="font-weight:700;fill:var(--text)">${esc(label)}</text>
    <text x="${x}" y="${baseY + 20}" text-anchor="middle">${fmt(s.length, unit)} × ${fmt(s.girth, unit)}</text>`;
}

function render() {
  resolve('a'); resolve('b');
  syncInputs();
  const a = sides.a; const b = sides.b;
  const W = 640; const H = 420;
  const maxLen = Math.max(a.length, b.length, 5);
  const scale = (H - 90) / maxLen;
  const baseY = H - 40;

  // Ruler ticks every 1 cm or 1 inch.
  const stepCm = unit === 'in' ? 2.54 : 1;
  let ruler = '';
  for (let i = 0, v = 0; v <= maxLen + 0.01; i++, v += stepCm) {
    const y = baseY - v * scale;
    const major = unit === 'in' || i % 5 === 0;
    ruler += `<line class="${major ? 'axis' : 'grid-line'}" x1="40" x2="${W - 10}" y1="${y}" y2="${y}" ${major ? '' : 'opacity=".5"'}/>`;
    if (major) ruler += `<text x="32" y="${y + 4}" text-anchor="end">${i}</text>`;
  }
  const label = (side) => $(`#${side}-title`).textContent;
  const isObj = (side) => SOURCES.find((x) => x.id === sides[side].source)?.object;
  $('#stage').innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Side-by-side comparison drawn to scale">
    ${ruler}
    <text x="32" y="16" text-anchor="end">${unit}</text>
    ${shape(W * 0.36, a, scale, baseY, 'var(--you)', label('a'), isObj('a'))}
    ${shape(W * 0.72, b, scale, baseY, 'var(--other)', label('b'), isObj('b'))}
  </svg>`;

  const pct = (x, y) => `${x >= y ? '+' : ''}${(((x - y) / y) * 100).toFixed(0)}%`;
  const vA = cylinderVolumeMl(a.length, a.girth);
  const vB = cylinderVolumeMl(b.length, b.girth);
  $('#diff').innerHTML = `
    <div class="kpi"><b>${pct(a.length, b.length)}</b><span>Left length vs right (${fmt(Math.abs(a.length - b.length), unit)})</span></div>
    <div class="kpi"><b>${pct(a.girth, b.girth)}</b><span>Left girth vs right (${fmt(Math.abs(a.girth - b.girth), unit)})</span></div>
    <div class="kpi"><b>${(vA / vB).toFixed(2)}×</b><span>Volume ratio, left ÷ right</span></div>`;
}

for (const side of ['a', 'b']) {
  const sel = $(`#${side}-source`);
  fillSelect(sel, sides[side].source);
  sel.addEventListener('change', () => {
    sides[side].source = sel.value;
    sides[side].length = null; sides[side].girth = null;
    render();
  });
  for (const dim of ['length', 'girth']) {
    $(`#${side}-${dim}`).addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      if (!(v > 0)) return;
      sides[side][dim] = fromUnit(v, unit);
      sides[side].source = 'custom';
      $(`#${side}-source`).value = 'custom';
      $(`#${side}-title`).textContent = 'Custom size';
      render();
    });
  }
}

$$('input[name="unit"]').forEach((r) => {
  r.checked = r.value === unit;
  r.addEventListener('change', () => { unit = r.value; render(); });
});
$$('input[name="state"]').forEach((r) => r.addEventListener('change', () => {
  mode = r.value;
  for (const s of Object.values(sides)) { s.length = null; s.girth = null; if (s.source === 'pref' && mode === 'flaccid') s.source = 'avg-global'; }
  render();
}));

render();

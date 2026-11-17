import { $, $$, esc } from '../layout.js';
import { nominalWidthMm, toUnit, fromUnit } from '../stats.js';
import { CONDOM_TIERS, condomTier } from '../data.js';
import * as store from '../store.js';

let state = store.load();
const input = $('#girth');

// Legacy links pass ?nominalWidth=54 — convert back to girth (cm).
const legacyNw = parseFloat(new URLSearchParams(location.search).get('nominalWidth'));
let girthCm = legacyNw > 0 ? legacyNw / 4.5 : state.measurements.erectGirth;

function syncInput() {
  $$('.unit').forEach((el) => { el.textContent = state.unit; });
  $$('input[name="unit"]').forEach((r) => { r.checked = r.value === state.unit; });
  input.value = Number.isFinite(girthCm) ? +toUnit(girthCm, state.unit).toFixed(state.unit === 'in' ? 2 : 1) : '';
}

function render() {
  const result = $('#result');
  if (!(girthCm > 0)) { result.classList.add('hidden'); return; }
  result.classList.remove('hidden');
  const nw = nominalWidthMm(girthCm);
  const tier = condomTier(nw);
  $('#nw').innerHTML = `${nw} <small>mm</small>`;
  $('#nw-range').textContent = `Good starting range: ${nw - 2}–${nw + 2} mm.`;
  $('#tier').textContent = tier.label;
  $('#tiers').innerHTML = CONDOM_TIERS.map((t) => `
    <div class="result" style="${t === tier ? 'border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-soft)' : ''}">
      <h3>${t.label} ${t === tier ? '<span class="tag">Your fit</span>' : ''}</h3>
      <p><strong>${!t.min ? `≤ ${t.max}` : t.max === Infinity ? `${t.min}+` : `${t.min}–${t.max}`} mm</strong></p>
      <p>${t.examples.map(esc).join(' · ')}</p>
    </div>`).join('');
}

input.addEventListener('input', () => {
  const v = parseFloat(input.value);
  girthCm = v > 0 ? fromUnit(v, state.unit) : undefined;
  render();
});

$$('input[name="unit"]').forEach((r) => r.addEventListener('change', () => {
  state = store.update({ unit: r.value });
  syncInput();
}));

$('#condom-form').addEventListener('submit', (e) => e.preventDefault());

syncInput();
render();

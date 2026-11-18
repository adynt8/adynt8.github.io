import { $, $$, toast } from '../layout.js';
import { METRICS, SOURCES, isPlausible, toUnit, fromUnit } from '../stats.js';
import * as store from '../store.js';
import { fillPopulationSelect, getPopulation } from '../populations.js';
import { renderResults, renderPopulationTable } from '../results.js';
import { uploadMeasurements } from '../api.js';
import { shareUrl, shareLink, encodeShare } from '../share.js';
import '../home.js';

const form = $('#calc-form');
const inputs = Object.fromEntries(METRICS.map((m) => [m, $(`#${m}`)]));
const populationSelect = $('#population');

let state = store.load();
let renderToken = 0;

function readInputs() {
  const out = {};
  for (const m of METRICS) {
    const v = parseFloat(inputs[m].value);
    if (Number.isFinite(v) && v > 0) out[m] = fromUnit(v, state.unit);
  }
  return out;
}

function writeInputs() {
  for (const m of METRICS) {
    const v = state.measurements[m];
    inputs[m].value = Number.isFinite(v) ? +toUnit(v, state.unit).toFixed(state.unit === 'in' ? 2 : 1) : '';
  }
  $$('.unit').forEach((el) => { el.textContent = state.unit; });
  $$('input[name="unit"]').forEach((r) => { r.checked = r.value === state.unit; });
  for (const m of METRICS) inputs[m].max = state.unit === 'in' ? 16 : 40;
}

function validate(measurements) {
  const bad = METRICS.filter((m) => Number.isFinite(measurements[m]) && !isPlausible(m, measurements[m]));
  const warning = $('#input-warning');
  if (!bad.length) { warning.classList.add('hidden'); return true; }
  warning.textContent = `Some values look unusual for ${state.unit === 'cm' ? 'centimetres' : 'inches'}. Double-check your numbers and the unit selector.`;
  warning.classList.remove('hidden');
  return false;
}

async function render() {
  const token = ++renderToken;
  const pop = await getPopulation(state.population);
  if (token !== renderToken) return;

  $('#population-desc').textContent = pop.description;
  const src = SOURCES[pop.source];
  $('#population-source').innerHTML = src ? `Source: <a href="${src.url}" target="_blank" rel="noopener">${src.short}</a>` : '';
  $('#population-table').innerHTML = renderPopulationTable(pop.stats, state.unit);

  const results = $('#results');
  if (!store.hasMeasurements(state.measurements)) { results.classList.add('hidden'); return; }
  results.classList.remove('hidden');
  $('#results-body').innerHTML = renderResults(state.measurements, state.unit, pop.stats);
  $('#chart-link').href = `size-chart.html?${encodeShare(state.measurements, state.unit)}&p=${state.population}`;
  renderSharingStatus();
}

function renderSharingStatus() {
  const el = $('#sharing-status');
  el.innerHTML = state.sharing
    ? 'Your measurements are shared anonymously with the <a href="community.html">community stats</a>. <a href="user-info.html">Manage</a>'
    : 'Your measurements are saved only on this device. <a href="user-info.html">Contribute anonymously</a>';
}

let uploadTimer;
function scheduleUpload() {
  if (!state.sharing) return;
  clearTimeout(uploadTimer);
  uploadTimer = setTimeout(async () => {
    const clean = Object.fromEntries(METRICS.filter((m) => isPlausible(m, state.measurements[m])).map((m) => [m, state.measurements[m]]));
    if (!Object.keys(clean).length) return;
    try { await uploadMeasurements(store.visitorId(), clean); } catch (err) { console.warn('Upload failed:', err); }
  }, 1500);
}

function maybeAskConsent() {
  if (state.sharing !== null) return;
  const dialog = $('#consent-dialog');
  if (dialog.open || typeof dialog.showModal !== 'function') return;
  dialog.showModal();
  dialog.addEventListener('close', () => {
    state = store.update({ sharing: dialog.returnValue === 'yes' });
    renderSharingStatus();
    if (state.sharing) { toast('Thanks for contributing!'); scheduleUpload(); }
  }, { once: true });
}

let horseShown = false;
function maybeHorse() {
  if (horseShown || !(state.measurements.erectLength >= 22)) return;
  horseShown = true;
  const img = document.createElement('img');
  img.src = 'horse.png';
  img.alt = '';
  img.className = 'horse';
  img.addEventListener('animationend', () => img.remove());
  document.body.append(img);
}

// Live updates as you type.
form.addEventListener('input', (e) => {
  if (e.target.name === 'unit' || e.target === populationSelect) return;
  const measurements = readInputs();
  if (!$('#input-warning').classList.contains('hidden')) validate(measurements); // clear a warning as soon as it's fixed
  state = store.update({ measurements });
  render();
});

// Commit (Enter / blur) — check the value, upload if sharing, easter egg.
form.addEventListener('change', (e) => {
  if (METRICS.includes(e.target.name)) { validate(readInputs()); scheduleUpload(); maybeHorse(); }
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const measurements = readInputs();
  if (!store.hasMeasurements(measurements)) {
    toast('Enter at least one measurement');
    inputs.erectLength.focus();
    return;
  }
  validate(measurements);
  state = store.update({ measurements });
  render().then(() => $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  scheduleUpload();
  maybeHorse();
  maybeAskConsent();
});

$$('input[name="unit"]').forEach((radio) => radio.addEventListener('change', () => {
  state = store.update({ unit: radio.value });
  writeInputs();
  render();
}));

populationSelect.addEventListener('change', () => {
  state = store.update({ population: populationSelect.value });
  render();
});

$('#clear-btn').addEventListener('click', () => {
  state = store.update({ measurements: {} });
  writeInputs();
  validate({});
  render();
});

$('#share-btn').addEventListener('click', () => shareLink(shareUrl('shared-results.html', state.measurements, state.unit)));

$('#save-btn').addEventListener('click', () => {
  store.addHistory(state.measurements);
  toast('Saved to your progress log');
});

writeInputs();
fillPopulationSelect(populationSelect, state.population);
render();

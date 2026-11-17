// Local, on-device state. Measurements are always stored in centimetres.
import { METRICS, fromUnit } from './stats.js';

const KEY = 'plssize:v2';
const LEGACY_KEYS = [
  'penisCalcUnit', 'penisCalcErectLength', 'penisCalcErectGirth', 'penisCalcFlaccidLength', 'penisCalcFlaccidGirth',
  'measurementHistory', 'shareMeasurements', 'firstVisitPopupShown', 'userCountry', 'similarImages',
];

const guessUnit = () => (/^en-(US|LR|MM)$/i.test(navigator.language || '') ? 'in' : 'cm');

const defaults = () => ({
  unit: guessUnit(),
  population: 'global',
  measurements: {},
  history: [],
  sharing: null, // null = never asked, true/false = user's choice
  visitorId: null,
});

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function num(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// Pull data saved by the 2024 version of the site into the new format.
function migrateLegacy() {
  const state = defaults();
  const unit = safeGet('penisCalcUnit');
  if (unit === 'cm' || unit === 'in') state.unit = unit;
  const legacy = {
    erectLength: safeGet('penisCalcErectLength'),
    erectGirth: safeGet('penisCalcErectGirth'),
    flaccidLength: safeGet('penisCalcFlaccidLength'),
    flaccidGirth: safeGet('penisCalcFlaccidGirth'),
  };
  for (const m of METRICS) {
    const v = num(legacy[m]);
    if (v) state.measurements[m] = fromUnit(v, state.unit);
  }
  try {
    const hist = JSON.parse(safeGet('measurementHistory') || '[]');
    state.history = hist.map((e) => {
      const entry = { date: e.date };
      for (const m of METRICS) if (num(e[m])) entry[m] = fromUnit(num(e[m]), state.unit);
      return entry;
    }).filter((e) => e.date);
  } catch { /* ignore corrupt history */ }
  const share = safeGet('shareMeasurements');
  if (share === 'true') state.sharing = true;
  else if (share === 'false') state.sharing = false;
  state.visitorId = safeGet('visitorId');
  return state;
}

let cache;

export function load() {
  if (cache) return cache;
  const raw = safeGet(KEY);
  if (raw) {
    try { cache = { ...defaults(), ...JSON.parse(raw) }; return cache; } catch { /* fall through */ }
  }
  cache = migrateLegacy();
  save(cache);
  try { LEGACY_KEYS.forEach((k) => localStorage.removeItem(k)); } catch { /* storage blocked */ }
  return cache;
}

export function save(state = cache) {
  cache = state;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode etc. */ }
  return state;
}

export function update(patch) {
  return save({ ...load(), ...patch });
}

export function visitorId() {
  const state = load();
  if (!state.visitorId) {
    state.visitorId = 'v' + (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).replace(/-/g, '').slice(0, 16);
    save(state);
  }
  return state.visitorId;
}

export function hasMeasurements(m = load().measurements) {
  return METRICS.some((k) => Number.isFinite(m[k]));
}

export function addHistory(measurements, note = '') {
  const state = load();
  state.history = [...state.history, { date: new Date().toISOString(), ...measurements, ...(note ? { note } : {}) }];
  return save(state);
}

export function removeHistory(index) {
  const state = load();
  state.history = state.history.filter((_, i) => i !== index);
  return save(state);
}

export function clearAll() {
  cache = undefined;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

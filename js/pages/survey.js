import { $, toast } from '../layout.js';
import { METRICS, fmt, isPlausible } from '../stats.js';
import * as store from '../store.js';
import { submitSurvey } from '../api.js';

const DONE_KEY = 'plssize:survey-done';
const form = $('#survey-form');
const state = store.load();

const hasM = store.hasMeasurements(state.measurements);
$('#include-hint').textContent = hasM
  ? `Saved: ${fmt(state.measurements.erectLength, state.unit)} × ${fmt(state.measurements.erectGirth, state.unit)}`
  : 'No saved measurements on this device.';
if (!hasM) { $('#include').value = 'no'; $('#include').disabled = true; }

function showDone() {
  form.classList.add('hidden');
  $('#survey-done').classList.remove('hidden');
}

try { if (localStorage.getItem(DONE_KEY)) showDone(); } catch { /* ignore */ }

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const error = $('#survey-error');
  error.classList.add('hidden');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const data = Object.fromEntries(new FormData(form));
  if (data.include === 'yes' && hasM) {
    data.measurementsCm = Object.fromEntries(
      METRICS.filter((m) => isPlausible(m, state.measurements[m])).map((m) => [m, Math.round(state.measurements[m] * 100) / 100]),
    );
  }
  delete data.include;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await submitSurvey(data);
    try { localStorage.setItem(DONE_KEY, new Date().toISOString()); } catch { /* ignore */ }
    toast('Survey submitted');
    showDone();
  } catch (err) {
    console.warn(err);
    error.textContent = 'Sorry — the survey could not be submitted right now. Please try again later.';
    error.classList.remove('hidden');
  } finally {
    button.disabled = false;
  }
});

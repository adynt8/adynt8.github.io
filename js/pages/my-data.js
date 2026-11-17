import { $, esc, toast } from '../layout.js';
import { METRICS, METRIC_LABELS, fmt, isPlausible } from '../stats.js';
import * as store from '../store.js';
import { fetchMyRow, uploadMeasurements, removeMeasurements } from '../api.js';

function renderLocal() {
  const state = store.load();
  $('#local-summary').textContent = `${state.history.length} progress ${state.history.length === 1 ? 'entry' : 'entries'} · units: ${state.unit}`;
  $('#local-data').innerHTML = store.hasMeasurements(state.measurements)
    ? `<div class="table-wrap"><table><tbody>${METRICS.map((m) => `<tr><td>${METRIC_LABELS[m]}</td><td class="num">${fmt(state.measurements[m], state.unit)}</td></tr>`).join('')}</tbody></table></div>`
    : '<p class="empty">No measurements saved. <a href="index.html">Use the calculator</a>.</p>';
}

async function renderSharing() {
  const state = store.load();
  const tag = $('#sharing-tag');
  const body = $('#sharing-body');
  tag.textContent = state.sharing ? 'On' : 'Off';

  if (!state.sharing) {
    body.innerHTML = `<p>Your measurements are not shared. Turning sharing on adds them anonymously to the <a href="community.html">community stats</a>.</p>
      <button type="button" id="enable" class="btn primary">Share anonymously</button>`;
    $('#enable').addEventListener('click', enable);
    return;
  }

  body.innerHTML = `<p>Your measurements are shared anonymously under the random ID <code>${esc(store.visitorId())}</code>.</p>
    <div id="remote" class="muted">Checking what's stored on the server…</div>
    <div class="row" style="margin-top:16px">
      <button type="button" id="disable" class="btn danger">Stop sharing &amp; delete my entry</button>
    </div>`;
  $('#disable').addEventListener('click', disable);
  try {
    const row = await fetchMyRow(store.visitorId());
    const remote = $('#remote');
    if (!remote) return;
    if (!row) { remote.textContent = 'Nothing stored yet — it will be uploaded next time you use the calculator.'; return; }
    const factor = row.unit === 'in' ? 2.54 : 1;
    remote.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Stored on server</th><th class="num">Value</th></tr></thead><tbody>
      ${METRICS.map((m) => `<tr><td>${METRIC_LABELS[m]}</td><td class="num">${row[m] != null ? fmt(parseFloat(row[m]) * factor, state.unit) : '—'}</td></tr>`).join('')}
      <tr><td>Last updated</td><td class="num">${row.timestamp ? new Date(row.timestamp).toLocaleString() : '—'}</td></tr>
      </tbody></table></div>`;
  } catch (err) {
    console.warn(err);
    const remote = $('#remote');
    if (remote) remote.textContent = 'Could not reach the server to show your stored entry.';
  }
}

async function enable() {
  store.update({ sharing: true });
  const { measurements } = store.load();
  const clean = Object.fromEntries(METRICS.filter((m) => isPlausible(m, measurements[m])).map((m) => [m, measurements[m]]));
  if (Object.keys(clean).length) {
    try { await uploadMeasurements(store.visitorId(), clean); toast('Thanks for contributing!'); } catch { toast('Sharing enabled, upload will retry later'); }
  } else {
    toast('Sharing enabled');
  }
  renderSharing();
}

async function disable() {
  if (!confirm('Stop sharing and delete your entry from the community dataset?')) return;
  try {
    await removeMeasurements(store.visitorId());
    store.update({ sharing: false });
    toast('Your shared entry was deleted');
  } catch (err) {
    console.warn(err);
    toast('Could not reach the server — please try again');
    return;
  }
  renderSharing();
}

$('#export-json').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(store.load(), null, 2)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'plssize-data.json' });
  a.click();
  URL.revokeObjectURL(a.href);
});

$('#delete-local').addEventListener('click', async () => {
  const state = store.load();
  const msg = state.sharing
    ? 'Delete everything on this device AND your shared community entry?'
    : 'Delete all measurements and history from this device?';
  if (!confirm(msg)) return;
  if (state.sharing && state.visitorId) {
    try { await removeMeasurements(state.visitorId); } catch { toast('Could not delete the shared entry — try again later'); return; }
  }
  store.clearAll();
  try { sessionStorage.clear(); } catch { /* ignore */ }
  toast('All data deleted');
  renderLocal();
  renderSharing();
});

renderLocal();
renderSharing();

import { $, $$ } from '../layout.js';
import { METRICS, METRIC_LABELS, POPULATIONS, summarize, fmt, toUnit } from '../stats.js';
import * as store from '../store.js';
import { fetchCommunity } from '../api.js';
import { histogram } from '../charts.js';

let unit = store.load().unit;
let rows = [];

function render() {
  const mine = store.load().measurements;
  const summaries = Object.fromEntries(METRICS.map((m) => [m, summarize(rows.map((r) => r[m]))]));
  const total = rows.length;
  const latest = rows.reduce((t, r) => (r.timestamp && r.timestamp > t ? r.timestamp : t), '');

  $('#kpis').innerHTML = `
    <div class="kpi"><b>${total.toLocaleString()}</b><span>Submissions</span></div>
    <div class="kpi"><b>${fmt(summaries.erectLength.median, unit)}</b><span>Median erect length</span></div>
    <div class="kpi"><b>${fmt(summaries.erectGirth.median, unit)}</b><span>Median erect girth</span></div>
    <div class="kpi"><b>${latest ? new Date(latest).toLocaleDateString() : '—'}</b><span>Latest submission</span></div>`;

  const clinical = POPULATIONS.global.stats;
  $('#table').innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Measurement</th><th class="num">n</th><th class="num">Community mean</th><th class="num">Median</th><th class="num">Middle 50%</th><th class="num">Clinical mean</th></tr></thead>
    <tbody>${METRICS.map((m) => {
      const s = summaries[m];
      return `<tr><td>${METRIC_LABELS[m]}</td><td class="num">${s.n}</td>
        <td class="num">${s.n ? `${fmt(s.mean, unit)} <span class="muted">±${toUnit(s.sd, unit).toFixed(2)}</span>` : '—'}</td>
        <td class="num">${fmt(s.median, unit)}</td>
        <td class="num">${s.n ? `${fmt(s.p25, unit)} – ${fmt(s.p75, unit)}` : '—'}</td>
        <td class="num">${fmt(clinical[m].mean, unit)}</td></tr>`;
    }).join('')}</tbody></table></div>
    <p class="muted" style="margin-top:10px">Clinical figures: Veale et al. 2015, n = 15,521. Implausible entries (likely typos or jokes) are excluded.</p>`;

  $('#histograms').innerHTML = METRICS.map((m) => {
    const values = rows.map((r) => r[m]).filter(Number.isFinite);
    if (values.length < 5) return '';
    return `<div class="card"><div class="card-head"><h2>${METRIC_LABELS[m]}</h2><span class="muted">n = ${values.length}</span></div>
      ${histogram({ values, unit, you: mine[m], title: `${METRIC_LABELS[m]} histogram` })}
      ${Number.isFinite(mine[m]) ? '<p class="legend" style="margin-top:8px"><span><i style="background:var(--other)"></i>Your bracket</span></p>' : ''}</div>`;
  }).join('');
}

$$('input[name="unit"]').forEach((r) => {
  r.checked = r.value === unit;
  r.addEventListener('change', () => { unit = r.value; render(); });
});

try {
  rows = await fetchCommunity();
  if (!rows.length) {
    $('#status').textContent = 'No community submissions yet. Be the first — turn on sharing in Your data.';
  } else {
    $('#status').classList.add('hidden');
    $('#content').classList.remove('hidden');
    render();
  }
} catch (err) {
  console.warn(err);
  $('#status').innerHTML = 'Community data is unavailable right now. Please try again later.';
}

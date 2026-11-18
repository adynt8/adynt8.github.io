import { $, $$, esc, toast } from '../layout.js';
import { METRICS, METRIC_LABELS, toUnit, fromUnit } from '../stats.js';
import * as store from '../store.js';
import { lineChart } from '../charts.js';
import { monthStreak, daysSinceLastEntry, changeOver, reminderIcs } from '../progress-stats.js';
import { MEASUREMENT_ERROR_CM } from '../stats.js';

let state = store.load();
const COLORS = { erectLength: 'var(--you)', erectGirth: 'var(--other)', flaccidLength: '#8b5cf6', flaccidGirth: '#14b8a6' };

function prefill() {
  for (const m of METRICS) {
    const v = state.measurements[m];
    $(`#${m}`).value = Number.isFinite(v) ? +toUnit(v, state.unit).toFixed(state.unit === 'in' ? 2 : 1) : '';
  }
  $$('.unit').forEach((el) => { el.textContent = state.unit; });
  $$('input[name="unit"]').forEach((r) => { r.checked = r.value === state.unit; });
}

function download(filename, text, type) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type })), download: filename });
  a.click();
  URL.revokeObjectURL(a.href);
}

function renderHabit() {
  const { history, unit } = state;
  const streak = monthStreak(history);
  const last = daysSinceLastEntry(history);
  const change = changeOver(history, 'erectLength', 90);
  const changeText = change == null ? '—' : `${change >= 0 ? '+' : '−'}${toUnit(Math.abs(change), unit).toFixed(unit === 'in' ? 2 : 1)} ${unit}`;
  const changeNote = change == null ? 'Erect length, last 90 days vs before'
    : Math.abs(change) <= MEASUREMENT_ERROR_CM ? 'Erect length, 90 days · within measuring error' : 'Erect length, last 90 days vs before';
  $('#habit').innerHTML = `
    <div class="kpi"><b>${history.length}</b><span>${history.length === 1 ? 'Entry' : 'Entries'} logged</span></div>
    <div class="kpi"><b>${streak}</b><span>Month streak</span></div>
    <div class="kpi"><b>${last == null ? '—' : last === 0 ? 'Today' : `${last}d`}</b><span>Since last entry</span></div>
    <div class="kpi"><b>${changeText}</b><span>${changeNote}</span></div>`;
}

function render() {
  renderHabit();
  const { history, unit } = state;
  const series = METRICS.map((m) => ({
    metric: m,
    color: COLORS[m],
    points: history.filter((e) => Number.isFinite(e[m])).map((e) => ({ date: e.date, value: e[m] })),
  })).filter((s) => s.points.length);

  $('#legend').innerHTML = series.map((s) => `<span><i style="background:${s.color}"></i>${METRIC_LABELS[s.metric]}</span>`).join('');
  $('#trend').innerHTML = lineChart({ series, unit, title: 'Measurement trend' });

  if (!history.length) {
    $('#history').innerHTML = '<p class="empty">No entries yet. Add your first one above, or use “Save to progress” on the calculator.</p>';
    return;
  }
  const cell = (v) => (Number.isFinite(v) ? toUnit(v, unit).toFixed(unit === 'in' ? 2 : 1) : '—');
  const rows = history.map((e, i) => ({ e, i })).reverse().map(({ e, i }) => `<tr>
      <td>${new Date(e.date).toLocaleDateString()}</td>
      ${METRICS.map((m) => `<td class="num">${cell(e[m])}</td>`).join('')}
      <td>${esc(e.note || '')}</td>
      <td><button class="btn ghost" data-delete="${i}" aria-label="Delete entry from ${new Date(e.date).toLocaleDateString()}">✕</button></td>
    </tr>`).join('');
  $('#history').innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Date</th>${METRICS.map((m) => `<th class="num">${METRIC_LABELS[m]} (${unit})</th>`).join('')}<th>Note</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

$('#log-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const entry = {};
  for (const m of METRICS) {
    const v = parseFloat($(`#${m}`).value);
    if (v > 0) entry[m] = fromUnit(v, state.unit);
  }
  if (!Object.keys(entry).length) { toast('Enter at least one measurement'); return; }
  state = store.addHistory(entry, $('#note').value.trim());
  state = store.update({ measurements: { ...state.measurements, ...entry } });
  $('#note').value = '';
  toast('Entry added');
  render();
});

$('#history').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-delete]');
  if (!btn || !confirm('Delete this entry?')) return;
  state = store.removeHistory(Number(btn.dataset.delete));
  render();
});

$$('input[name="unit"]').forEach((r) => r.addEventListener('change', () => {
  state = store.update({ unit: r.value });
  prefill();
  render();
}));

$('#export-csv').addEventListener('click', () => {
  const header = ['date', ...METRICS.map((m) => `${m}_cm`), 'note'];
  const lines = state.history.map((e) => [e.date, ...METRICS.map((m) => (Number.isFinite(e[m]) ? e[m].toFixed(2) : '')), JSON.stringify(e.note || '')].join(','));
  download('plssize-progress.csv', [header.join(','), ...lines].join('\n'), 'text/csv');
});

$('#reminder-btn').addEventListener('click', () => {
  download('monthly-check-in.ics', reminderIcs(new URL('progress.html', location.href).href), 'text/calendar');
  toast('Open the downloaded file to add it to your calendar');
});

$('#import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    let entries = [];
    if (file.name.endsWith('.json') || text.trim().startsWith('{')) {
      const data = JSON.parse(text);
      entries = data.history ?? [];
    } else {
      const [head, ...rows] = text.trim().split(/\r?\n/);
      const cols = head.split(',');
      entries = rows.map((row) => {
        const cells = row.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, ''));
        const entry = {};
        cols.forEach((c, i) => {
          const metric = c.replace(/_cm$/, '');
          if (c === 'date') entry.date = cells[i];
          else if (c === 'note') { try { entry.note = JSON.parse(cells[i] || '""'); } catch { entry.note = cells[i]; } }
          else if (METRICS.includes(metric) && parseFloat(cells[i]) > 0) entry[metric] = parseFloat(cells[i]);
        });
        return entry;
      });
    }
    const valid = entries.filter((x) => x.date && !Number.isNaN(Date.parse(x.date)));
    const seen = new Set(state.history.map((x) => x.date));
    state = store.update({ history: [...state.history, ...valid.filter((x) => !seen.has(x.date))].sort((a, b) => new Date(a.date) - new Date(b.date)) });
    toast(`Imported ${valid.length} entries`);
    render();
  } catch (err) {
    console.error(err);
    toast('Could not read that file');
  }
  e.target.value = '';
});

prefill();
render();

import { $, $$ } from '../layout.js';
import { METRICS, METRIC_LABELS, SOURCES, percentile, formatPercentile, fmt } from '../stats.js';
import * as store from '../store.js';
import { decodeShare } from '../share.js';
import { fillPopulationSelect, getPopulation } from '../populations.js';
import { bellCurve } from '../charts.js';

let state = store.load();
const shared = decodeShare();
const measurements = shared?.measurements ?? state.measurements;
let unit = shared?.unit ?? state.unit;
const params = new URLSearchParams(location.search);
let population = params.get('p') || state.population;

async function render() {
  const pop = await getPopulation(population);
  const src = SOURCES[pop.source];
  $('#source-note').innerHTML = `${pop.description}${src ? ` Source: <a href="${src.url}" target="_blank" rel="noopener">${src.short}</a>.` : ''}`;
  $('#no-data').classList.toggle('hidden', store.hasMeasurements(measurements));

  $('#charts').innerHTML = METRICS.filter((m) => pop.stats[m]).map((m) => {
    const dist = pop.stats[m];
    const v = measurements[m];
    const has = Number.isFinite(v);
    const p = has ? percentile(v, dist) : null;
    return `<div class="card">
      <div class="card-head"><h2>${METRIC_LABELS[m]}</h2>${has ? `<span class="tag">${formatPercentile(p).replace('<', '&lt;')} percentile</span>` : ''}</div>
      ${bellCurve({ dist, value: v, unit, title: `${METRIC_LABELS[m]} distribution` })}
      <p class="muted" style="margin-top:8px">Average ${fmt(dist.mean, unit)}. Two-thirds of men fall between ${fmt(dist.mean - dist.sd, unit)} and ${fmt(dist.mean + dist.sd, unit)}.${has ? ` You: ${fmt(v, unit)}.` : ''}</p>
    </div>`;
  }).join('');
}

const select = $('#population');
fillPopulationSelect(select, population);
select.addEventListener('change', () => {
  population = select.value;
  if (!shared) state = store.update({ population });
  render();
});

$$('input[name="unit"]').forEach((r) => {
  r.checked = r.value === unit;
  r.addEventListener('change', () => { unit = r.value; render(); });
});

document.addEventListener('themechange', render);
render();

// Renders the results grid. Shared by the calculator and the shared-results page.
import {
  METRICS, METRIC_LABELS, PREFERENCE, SOURCES, percentile, describePercentile, formatPercentile, percentileSentence,
  fmt, toUnit, nominalWidthMm, cylinderVolumeMl, shaftSurfaceCm2,
} from './stats.js';
import { closestBy, condomTier } from './data.js';
import { esc } from './layout.js';

function metricCard(metric, valueCm, dist, unit) {
  if (!dist) {
    return `<div class="result"><h3>${METRIC_LABELS[metric]}</h3>
      <div class="big">${fmt(valueCm, unit)}</div>
      <p>No reference data for this measurement in the selected population.</p></div>`;
  }
  const p = percentile(valueCm, dist);
  const diff = valueCm - dist.mean;
  const pos = Math.min(99, Math.max(1, p));
  return `<div class="result">
    <h3>${METRIC_LABELS[metric]}</h3>
    <div class="big">${fmt(valueCm, unit)} <small class="tag">${describePercentile(p)}</small></div>
    <div class="pbar" role="img" aria-label="${esc(formatPercentile(p))} percentile">
      <span class="avg"></span><span class="mark" style="left:${pos}%"></span>
    </div>
    <div class="pbar-legend"><span>Smaller</span><span>Average</span><span>Larger</span></div>
    <p><strong>${esc(formatPercentile(p))} percentile</strong> — ${percentileSentence(p)}.</p>
    <p>${fmt(Math.abs(diff), unit)} ${diff >= 0 ? 'above' : 'below'} the average of ${fmt(dist.mean, unit)}.</p>
  </div>`;
}

function extrasCards(m, unit) {
  const cards = [];
  const { erectLength: L, erectGirth: G } = m;

  if (Number.isFinite(G)) {
    const nw = nominalWidthMm(G);
    const tier = condomTier(nw);
    cards.push(`<div class="result"><h3>Condom size</h3>
      <div class="big">${nw} <small>mm nominal width</small></div>
      <p>${tier.label}. <a href="condom-recommendations.html?nominalWidth=${nw}">See matching condoms →</a></p></div>`);
  }

  if (Number.isFinite(L) && Number.isFinite(G)) {
    const ml = cylinderVolumeMl(L, G);
    const vol = unit === 'in' ? `${(ml / 16.387).toFixed(1)} <small>in³</small>` : `${ml.toFixed(0)} <small>ml</small>`;
    const area = shaftSurfaceCm2(L, G);
    const areaStr = unit === 'in' ? `${(area / 6.4516).toFixed(1)} <small>in²</small>` : `${area.toFixed(0)} <small>cm²</small>`;
    cards.push(`<div class="result"><h3>Volume &amp; surface</h3>
      <div class="big">${vol}</div>
      <p>Shaft surface ≈ ${areaStr.replace(/<\/?small>/g, '')}. Cylinder approximation — <a href="methodology.html#formulas">how it's calculated</a>.</p></div>`);
  }

  if (Number.isFinite(L) || Number.isFinite(G)) {
    const pref = PREFERENCE.longTerm;
    const lines = [];
    if (Number.isFinite(L)) {
      const d = L - pref.erectLength;
      lines.push(`Length: ${fmt(Math.abs(d), unit)} ${d >= 0 ? 'above' : 'below'} ${fmt(pref.erectLength, unit)}`);
    }
    if (Number.isFinite(G)) {
      const d = G - pref.erectGirth;
      lines.push(`Girth: ${fmt(Math.abs(d), unit)} ${d >= 0 ? 'above' : 'below'} ${fmt(pref.erectGirth, unit)}`);
    }
    cards.push(`<div class="result"><h3>Partner preference</h3>
      <p style="margin-top:6px">${lines.join('<br>')}</p>
      <p>Average size women chose for a long-term partner in a 3D-model study (<a href="${SOURCES.prause2015.url}" target="_blank" rel="noopener">${SOURCES.prause2015.short}</a>). Preferences vary widely.</p></div>`);
  }

  if (Number.isFinite(L)) {
    const o = closestBy('length', L);
    const g = Number.isFinite(G) ? closestBy('girth', G) : null;
    cards.push(`<div class="result"><h3>Everyday comparison</h3>
      <p style="margin-top:6px">Length is closest to a <strong>${esc(o.name.toLowerCase())}</strong> (${fmt(o.length, unit)}).</p>
      ${g ? `<p>Girth is closest to a <strong>${esc(g.name.toLowerCase())}</strong> (${fmt(g.girth, unit)} around).</p>` : ''}
      <p><a href="compare.html">Compare side by side →</a></p></div>`);
  }
  return cards.join('');
}

/** Returns HTML for all result cards. `stats` maps metric → {mean, sd} (may be partial). */
export function renderResults(measurements, unit, stats) {
  const metricHtml = METRICS
    .filter((m) => Number.isFinite(measurements[m]))
    .map((m) => metricCard(m, measurements[m], stats[m], unit))
    .join('');
  return `<div class="grid grid-2">${metricHtml}</div>
    <h2 style="margin-top:28px">More about your size</h2>
    <div class="grid grid-2">${extrasCards(measurements, unit)}</div>`;
}

/** Table of the reference population's averages. */
export function renderPopulationTable(stats, unit) {
  const rows = METRICS.filter((m) => stats[m]).map((m) => {
    const { mean, sd } = stats[m];
    return `<tr><td>${METRIC_LABELS[m]}</td><td class="num">${fmt(mean, unit)}</td><td class="num">±${toUnit(sd, unit).toFixed(2)}</td>
      <td class="num">${fmt(mean - 2 * sd, unit)} – ${fmt(mean + 2 * sd, unit)}</td></tr>`;
  }).join('');
  return `<div class="table-wrap"><table>
    <thead><tr><th>Measurement</th><th class="num">Average</th><th class="num">Std. dev.</th><th class="num">95% of men</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

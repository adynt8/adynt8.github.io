import { $ } from '../layout.js';
import { POPULATIONS, CM_PER_IN, METRICS } from '../stats.js';
import { decodeShare, encodeShare } from '../share.js';
import { renderResults } from '../results.js';
import { fetchMyRow } from '../api.js';

const body = $('#shared-body');

function show(measurements, unit) {
  body.innerHTML = `${renderResults(measurements, unit, POPULATIONS.global.stats)}
    <p style="margin-top:16px"><a class="btn" href="size-chart.html?${encodeShare(measurements, unit)}">See it on the distribution chart</a></p>`;
}

const shared = decodeShare();
if (shared?.measurements) {
  show(shared.measurements, shared.unit);
} else if (shared?.legacyVisitorId) {
  // Links created by the 2024 version pointed at a database row.
  try {
    const row = await fetchMyRow(shared.legacyVisitorId);
    if (!row) throw new Error('not found');
    const factor = row.unit === 'in' ? CM_PER_IN : 1;
    const m = {};
    for (const k of METRICS) { const v = parseFloat(row[k]) * factor; if (v > 0) m[k] = v; }
    show(m, row.unit === 'in' ? 'in' : 'cm');
  } catch {
    body.innerHTML = '<p class="notice warn">This older share link has expired or the results were deleted.</p>';
  }
} else {
  body.innerHTML = '<p class="notice warn">This link doesn\'t contain any results.</p>';
}

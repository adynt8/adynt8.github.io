// Resolve reference populations, including the live community dataset.
import { POPULATIONS, METRICS, summarize } from './stats.js';
import { fetchCommunity } from './api.js';
import { COMMUNITY_MIN_N } from './config.js';

let communityPromise;

/** Community population built from shared submissions, or null if unavailable / too small. */
export function communityPopulation() {
  communityPromise ??= fetchCommunity().then((rows) => {
    const stats = {};
    let n = 0;
    for (const m of METRICS) {
      const s = summarize(rows.map((r) => r[m]));
      if (s.n >= COMMUNITY_MIN_N) stats[m] = { mean: s.mean, sd: s.sd };
      n = Math.max(n, s.n);
    }
    if (!Object.keys(stats).length) return null;
    return {
      label: `PlsSize.Me community (n = ${n})`,
      description: 'Anonymous, self-reported measurements shared by visitors. Self-measured data skews larger.',
      n,
      stats,
    };
  }).catch((err) => {
    console.warn('Community data unavailable:', err);
    return null;
  });
  return communityPromise;
}

export async function getPopulation(id) {
  if (id === 'community') return (await communityPopulation()) ?? POPULATIONS.global;
  return POPULATIONS[id] ?? POPULATIONS.global;
}

/** Populate a <select> with the available populations; adds the community option when it loads. */
export function fillPopulationSelect(select, selected) {
  select.innerHTML = Object.entries(POPULATIONS)
    .map(([id, p]) => `<option value="${id}">${p.label}</option>`).join('')
    + '<option value="community" disabled>PlsSize.Me community (loading…)</option>';
  select.value = POPULATIONS[selected] ? selected : 'global';
  communityPopulation().then((pop) => {
    const opt = select.querySelector('option[value="community"]');
    if (pop) {
      opt.disabled = false;
      opt.textContent = pop.label;
      if (selected === 'community') {
        select.value = 'community';
        select.dispatchEvent(new Event('change'));
      }
    } else {
      opt.textContent = 'PlsSize.Me community (not enough data yet)';
    }
  });
}

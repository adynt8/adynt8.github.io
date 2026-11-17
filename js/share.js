// Shareable links encode measurements directly in the URL — no account or database needed.
import { METRICS, fromUnit } from './stats.js';
import { toast } from './layout.js';

/** Query string for a set of measurements (cm), encoded as whole millimetres joined by dots. */
export function encodeShare(measurements, unit) {
  const parts = METRICS.map((m) => (Number.isFinite(measurements[m]) ? Math.round(measurements[m] * 10) : ''));
  return `r=${parts.join('.')}&u=${unit}`;
}

/**
 * Read measurements from the current URL. Supports:
 *  - r=131.117.92.93&u=cm   (current format, values in mm)
 *  - d=base64("unit,erectLength,flaccidLength,erectGirth,flaccidGirth")  (2024 size-chart links)
 * Returns { measurements, unit } or null.
 */
export function decodeShare(search = location.search) {
  const params = new URLSearchParams(search);
  const unitParam = params.get('u');
  if (params.has('r')) {
    const parts = params.get('r').split('.');
    const measurements = {};
    METRICS.forEach((m, i) => {
      const v = parseInt(parts[i], 10);
      if (Number.isFinite(v) && v > 0) measurements[m] = v / 10;
    });
    return Object.keys(measurements).length ? { measurements, unit: unitParam === 'in' ? 'in' : 'cm' } : null;
  }
  if (params.has('d')) {
    try {
      const decoded = atob(params.get('d'));
      if (!decoded.includes(',')) return { legacyVisitorId: decoded };
      const [unit, el, fl, eg, fg] = decoded.split(',');
      const u = unit === 'in' ? 'in' : 'cm';
      const measurements = {};
      const set = (key, raw) => { const v = parseFloat(raw); if (v > 0) measurements[key] = fromUnit(v, u); };
      set('erectLength', el); set('flaccidLength', fl); set('erectGirth', eg); set('flaccidGirth', fg);
      return { measurements, unit: u };
    } catch { return null; }
  }
  return null;
}

export function shareUrl(page, measurements, unit) {
  return new URL(`${page}?${encodeShare(measurements, unit)}`, location.href).href;
}

/** Use the native share sheet where available, otherwise copy to clipboard. */
export async function shareLink(url, title = 'My PlsSize.Me results') {
  if (navigator.share) {
    try { await navigator.share({ title, url }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copied to clipboard');
  } catch {
    prompt('Copy this link:', url);
  }
}

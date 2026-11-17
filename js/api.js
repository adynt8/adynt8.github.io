// Thin wrapper around the Supabase backend. Everything here is optional:
// if the backend is unreachable, the site keeps working with local data only.
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JS } from './config.js';
import { METRICS, CM_PER_IN, isPlausible } from './stats.js';

const TABLE = 'visitor_data';
const SURVEY_TABLE = 'survey_responses';
const COMMUNITY_CACHE = 'plssize:community';
const COMMUNITY_TTL = 10 * 60 * 1000;

let clientPromise;
function client() {
  clientPromise ??= import(SUPABASE_JS).then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }));
  return clientPromise;
}

async function run(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

const round = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : null);

/** Insert or update this visitor's anonymous measurements (always sent in cm). */
export async function uploadMeasurements(visitorId, measurementsCm) {
  const db = await client();
  const payload = { visitorId, unit: 'cm', timestamp: new Date().toISOString() };
  for (const m of METRICS) payload[m] = round(measurementsCm[m]);

  const existing = await run(db.from(TABLE).select('visitCount').eq('visitorId', visitorId).maybeSingle());
  if (existing) {
    await run(db.from(TABLE).update({ ...payload, visitCount: (existing.visitCount || 0) + 1 }).eq('visitorId', visitorId));
  } else {
    await run(db.from(TABLE).insert({ ...payload, visitCount: 1 }));
  }
  sessionStorage.removeItem(COMMUNITY_CACHE);
}

/** Delete this visitor's row. Falls back to blanking it if deletes aren't permitted. */
export async function removeMeasurements(visitorId) {
  const db = await client();
  try {
    await run(db.from(TABLE).delete().eq('visitorId', visitorId));
  } catch {
    const blank = Object.fromEntries(METRICS.map((m) => [m, null]));
    await run(db.from(TABLE).update({ ...blank, unit: null, country: null }).eq('visitorId', visitorId));
  }
  sessionStorage.removeItem(COMMUNITY_CACHE);
}

export async function fetchMyRow(visitorId) {
  const db = await client();
  return run(db.from(TABLE).select('*').eq('visitorId', visitorId).maybeSingle());
}

/** Normalise a database row (legacy rows may be in inches or contain strings) to cm. */
function normalise(row) {
  const factor = row.unit === 'in' ? CM_PER_IN : 1;
  const out = { timestamp: row.timestamp };
  for (const m of METRICS) {
    const v = parseFloat(row[m]) * factor;
    if (isPlausible(m, v)) out[m] = v;
  }
  return out;
}

/** All shared measurements, normalised to cm with implausible values dropped. Cached per session. */
export async function fetchCommunity({ fresh = false } = {}) {
  if (!fresh) {
    try {
      const cached = JSON.parse(sessionStorage.getItem(COMMUNITY_CACHE) || 'null');
      if (cached && Date.now() - cached.at < COMMUNITY_TTL) return cached.rows;
    } catch { /* ignore */ }
  }
  const db = await client();
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const page = await run(db.from(TABLE)
      .select('unit,erectLength,erectGirth,flaccidLength,flaccidGirth,timestamp')
      .range(from, from + pageSize - 1));
    rows.push(...page.map(normalise));
    if (page.length < pageSize) break;
  }
  const useful = rows.filter((r) => METRICS.some((m) => r[m] != null));
  try { sessionStorage.setItem(COMMUNITY_CACHE, JSON.stringify({ at: Date.now(), rows: useful })); } catch { /* ignore */ }
  return useful;
}

export async function submitSurvey(response) {
  const db = await client();
  await run(db.from(SURVEY_TABLE).insert({ submitted_at: new Date().toISOString(), response }));
}

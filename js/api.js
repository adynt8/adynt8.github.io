// Thin wrapper around the Supabase backend. Everything here is optional:
// if the backend is unreachable, the site keeps working with local data only.
//
// The database only allows the public key to call a handful of validated functions
// (see supabase/schema.sql). Until that file has been run on a database created by the
// 2024 site, the functions don't exist yet, so each call falls back to the old
// direct-table access. The `legacy*` functions can be deleted once schema.sql is live.
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JS } from './config.js';
import { METRICS, CM_PER_IN, isPlausible } from './stats.js';

const TABLE = 'visitor_data';
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

// PostgREST: function / relation not found in the schema cache.
const isMissing = (err) => ['PGRST202', 'PGRST205', '42883', '42P01'].includes(err?.code);

/** Run `modern`; if the database hasn't been upgraded yet, run `legacy` instead. */
async function withFallback(modern, legacy) {
  try { return await modern(); } catch (err) {
    if (!isMissing(err)) throw err;
    return legacy();
  }
}

const round = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : null);
const clearCommunityCache = () => { try { sessionStorage.removeItem(COMMUNITY_CACHE); } catch { /* ignore */ } };

/** Insert or update this visitor's anonymous measurements (always sent in cm). */
export async function uploadMeasurements(visitorId, measurementsCm) {
  const db = await client();
  const m = Object.fromEntries(METRICS.map((k) => [k, round(measurementsCm[k])]));
  await withFallback(
    () => run(db.rpc('submit_measurements', {
      p_visitor: visitorId,
      p_erect_length: m.erectLength,
      p_erect_girth: m.erectGirth,
      p_flaccid_length: m.flaccidLength,
      p_flaccid_girth: m.flaccidGirth,
    })),
    () => legacyUpload(db, visitorId, m),
  );
  clearCommunityCache();
}

async function legacyUpload(db, visitorId, m) {
  const payload = { visitorId, unit: 'cm', timestamp: new Date().toISOString(), ...m };
  const existing = await run(db.from(TABLE).select('visitCount').eq('visitorId', visitorId).maybeSingle());
  if (existing) {
    await run(db.from(TABLE).update({ ...payload, visitCount: (existing.visitCount || 0) + 1 }).eq('visitorId', visitorId));
  } else {
    await run(db.from(TABLE).insert({ ...payload, visitCount: 1 }));
  }
}

/** Delete this visitor's row. */
export async function removeMeasurements(visitorId) {
  const db = await client();
  await withFallback(
    () => run(db.rpc('delete_measurements', { p_visitor: visitorId })),
    async () => {
      try {
        await run(db.from(TABLE).delete().eq('visitorId', visitorId));
      } catch {
        const blank = Object.fromEntries(METRICS.map((k) => [k, null]));
        await run(db.from(TABLE).update({ ...blank, unit: null, country: null }).eq('visitorId', visitorId));
      }
    },
  );
  clearCommunityCache();
}

/** This visitor's stored row, or null. */
export async function fetchMyRow(visitorId) {
  const db = await client();
  return withFallback(
    async () => (await run(db.rpc('get_measurements', { p_visitor: visitorId })))?.[0] ?? null,
    () => run(db.from(TABLE).select('*').eq('visitorId', visitorId).maybeSingle()),
  );
}

/** Normalise a database row (legacy rows may be in inches or contain strings) to cm. */
export function normaliseRow(row) {
  const factor = row.unit === 'in' ? CM_PER_IN : 1;
  const out = { timestamp: row.timestamp };
  for (const m of METRICS) {
    const v = parseFloat(row[m]) * factor;
    if (isPlausible(m, v)) out[m] = v;
  }
  return out;
}

async function fetchAll(db, relation) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const page = await run(db.from(relation)
      .select('unit,erectLength,erectGirth,flaccidLength,flaccidGirth,timestamp')
      .range(from, from + pageSize - 1));
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
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
  const raw = await withFallback(() => fetchAll(db, 'community_measurements'), () => fetchAll(db, TABLE));
  const rows = raw.map(normaliseRow).filter((r) => METRICS.some((m) => r[m] != null));
  try { sessionStorage.setItem(COMMUNITY_CACHE, JSON.stringify({ at: Date.now(), rows })); } catch { /* ignore */ }
  return rows;
}

export async function submitSurvey(response) {
  const db = await client();
  await run(db.from('survey_responses').insert({ submitted_at: new Date().toISOString(), response }));
}

/** Vote counts for a poll as an array indexed by choice. Throws if polls aren't set up. */
export async function fetchPollResults(pollId, optionCount) {
  const db = await client();
  return toCounts(await run(db.rpc('poll_results', { p_poll: pollId })), optionCount);
}

/** Cast or change a vote; returns the updated counts. */
export async function castVote(pollId, visitorId, choice, optionCount) {
  const db = await client();
  return toCounts(await run(db.rpc('cast_vote', { p_poll: pollId, p_voter: visitorId, p_choice: choice })), optionCount);
}

function toCounts(rows, optionCount) {
  const counts = new Array(optionCount).fill(0);
  for (const r of rows ?? []) if (r.choice < optionCount) counts[r.choice] = Number(r.votes);
  return counts;
}

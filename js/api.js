// Thin wrapper around the Supabase backend. Everything here is optional:
// if the backend is unreachable, the site keeps working with local data only.
//
// The database only lets the public key call a handful of validated functions and read one
// view (see supabase/schema.sql); it has no direct access to the tables.
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JS } from './config.js';
import { METRICS, CM_PER_IN, isPlausible } from './stats.js';

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
const clearCommunityCache = () => { try { sessionStorage.removeItem(COMMUNITY_CACHE); } catch { /* ignore */ } };

/** Insert or update this visitor's anonymous measurements (always sent in cm). */
export async function uploadMeasurements(visitorId, measurementsCm) {
  const db = await client();
  await run(db.rpc('submit_measurements', {
    p_visitor: visitorId,
    p_erect_length: round(measurementsCm.erectLength),
    p_erect_girth: round(measurementsCm.erectGirth),
    p_flaccid_length: round(measurementsCm.flaccidLength),
    p_flaccid_girth: round(measurementsCm.flaccidGirth),
  }));
  clearCommunityCache();
}

/** Delete this visitor's row. */
export async function removeMeasurements(visitorId) {
  const db = await client();
  await run(db.rpc('delete_measurements', { p_visitor: visitorId }));
  clearCommunityCache();
}

/** This visitor's stored row, or null. */
export async function fetchMyRow(visitorId) {
  const db = await client();
  return (await run(db.rpc('get_measurements', { p_visitor: visitorId })))?.[0] ?? null;
}

/** Normalise a database row to cm (rows imported from the 2024 database may be in inches or hold strings). */
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
  const raw = await fetchAll(db, 'community_measurements');
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

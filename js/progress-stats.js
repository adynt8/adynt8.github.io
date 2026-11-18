// Pure helpers for the progress log (no DOM), so they can be unit-tested.

const monthKey = (d) => d.getFullYear() * 12 + d.getMonth();

/**
 * Number of consecutive calendar months with at least one entry, counting back from
 * this month (or last month, so a streak isn't "lost" on the 1st).
 */
export function monthStreak(history, now = new Date()) {
  const months = new Set(history.map((e) => monthKey(new Date(e.date))).filter(Number.isFinite));
  let cursor = monthKey(now);
  if (!months.has(cursor)) cursor -= 1;
  let streak = 0;
  while (months.has(cursor)) { streak++; cursor--; }
  return streak;
}

/** Days since the most recent entry, or null with no entries. */
export function daysSinceLastEntry(history, now = new Date()) {
  const times = history.map((e) => +new Date(e.date)).filter(Number.isFinite);
  if (!times.length) return null;
  return Math.max(0, Math.floor((+now - Math.max(...times)) / 86400000));
}

/**
 * Change in a metric: average of entries in the last `days` minus the average of earlier entries.
 * Returns null unless both periods have data.
 */
export function changeOver(history, metric, days, now = new Date()) {
  const cutoff = +now - days * 86400000;
  const avg = (list) => (list.length ? list.reduce((s, x) => s + x, 0) / list.length : null);
  const values = history.filter((e) => Number.isFinite(e[metric]));
  const recent = avg(values.filter((e) => +new Date(e.date) >= cutoff).map((e) => e[metric]));
  const earlier = avg(values.filter((e) => +new Date(e.date) < cutoff).map((e) => e[metric]));
  return recent == null || earlier == null ? null : recent - earlier;
}

const pad = (n) => String(n).padStart(2, '0');
const icsDate = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

/**
 * A repeating monthly calendar reminder (.ics). The title is deliberately discreet.
 * The day is capped at 28 so it exists in every month.
 */
export function reminderIcs(url, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(now.getDate(), 28));
  const stamp = `${now.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PlsSize.Me//Progress reminder//EN',
    'BEGIN:VEVENT',
    `UID:progress-${stamp}@plssize.me`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${icsDate(start)}`,
    'RRULE:FREQ=MONTHLY',
    'SUMMARY:Monthly check-in',
    `DESCRIPTION:Log this month's entry: ${url}`,
    `URL:${url}`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Monthly check-in',
    'TRIGGER:PT9H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

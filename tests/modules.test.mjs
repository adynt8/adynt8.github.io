// Tests for the DOM-free modules. Browser globals are stubbed where needed.
import test from 'node:test';
import assert from 'node:assert/strict';

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    clear: () => data.clear(),
    _data: data,
  };
}

test('share links round-trip and read 2024-format links', async () => {
  const { encodeShare, decodeShare } = await import('../js/share.js');
  const m = { erectLength: 15.24, erectGirth: 12.7 };
  const decoded = decodeShare(`?${encodeShare(m, 'in')}`);
  assert.equal(decoded.unit, 'in');
  assert.deepEqual(decoded.measurements, { erectLength: 15.2, erectGirth: 12.7 });

  const legacy = decodeShare(`?d=${btoa('in,6,,5,')}`);
  assert.equal(legacy.unit, 'in');
  assert.ok(Math.abs(legacy.measurements.erectLength - 15.24) < 1e-9);
  assert.equal(legacy.measurements.flaccidLength, undefined);

  assert.deepEqual(decodeShare(`?d=${btoa('vabc123def')}`), { legacyVisitorId: 'vabc123def' });
  assert.equal(decodeShare('?r=...&u=cm'), null);
  assert.equal(decodeShare('?d=%%%'), null);
  assert.equal(decodeShare(''), null);
});

test('store migrates data saved by the 2024 site', async () => {
  globalThis.localStorage = fakeStorage({
    penisCalcUnit: 'in',
    penisCalcErectLength: '6',
    penisCalcErectGirth: '5',
    penisCalcFlaccidLength: 'NaN',
    measurementHistory: JSON.stringify([{ date: '2024-05-01T00:00:00Z', erectLength: 6, flaccidGirth: null }]),
    shareMeasurements: 'true',
    visitorId: 'vabc123def',
  });
  globalThis.sessionStorage = fakeStorage();
  const store = await import('../js/store.js');
  const state = store.load();
  assert.equal(state.unit, 'in');
  assert.ok(Math.abs(state.measurements.erectLength - 15.24) < 1e-9);
  assert.equal(state.measurements.flaccidLength, undefined);
  assert.equal(state.history.length, 1);
  assert.ok(Math.abs(state.history[0].erectLength - 15.24) < 1e-9);
  assert.equal(state.sharing, true);
  assert.equal(store.visitorId(), 'vabc123def');
  assert.equal(localStorage.getItem('penisCalcUnit'), null, 'legacy keys are removed');
  assert.ok(localStorage.getItem('plssize:v2'));

  // Visits: counted once per browser session.
  const first = store.recordVisit(new Date('2026-11-01T00:00:00Z'));
  assert.equal(first.previous, null);
  assert.equal(store.recordVisit(new Date('2026-11-02T00:00:00Z')).count, 1);
  sessionStorage.clear();
  const second = store.recordVisit(new Date('2026-11-09T00:00:00Z'));
  assert.equal(second.count, 2);
  assert.equal(second.previous, '2026-11-01T00:00:00.000Z');
});

test('polls rotate weekly and ids are valid for the database', async () => {
  const { POLLS, pollForDate, daysUntilNextPoll } = await import('../js/polls.js');
  assert.equal(new Set(POLLS.map((p) => p.id)).size, POLLS.length);
  for (const p of POLLS) {
    assert.match(p.id, /^q[0-9]{1,3}$/);
    assert.ok(p.options.length >= 2 && p.options.length <= 10);
  }
  const monday = new Date(Date.UTC(2026, 10, 16));
  const sunday = new Date(Date.UTC(2026, 10, 22, 23, 59));
  const nextMonday = new Date(Date.UTC(2026, 10, 23));
  assert.equal(pollForDate(monday), pollForDate(sunday));
  assert.notEqual(pollForDate(monday), pollForDate(nextMonday));
  assert.equal(pollForDate(nextMonday, -1), pollForDate(monday));
  assert.ok(pollForDate(new Date(Date.UTC(2020, 0, 1))), 'dates before the epoch still resolve');
  assert.equal(daysUntilNextPoll(monday), 7);
  assert.equal(daysUntilNextPoll(sunday), 1);
});

test('progress helpers', async () => {
  const { monthStreak, daysSinceLastEntry, changeOver, reminderIcs } = await import('../js/progress-stats.js');
  const now = new Date(2026, 10, 18);
  const history = [
    { date: new Date(2026, 5, 3).toISOString(), erectLength: 14 },
    { date: new Date(2026, 8, 10).toISOString(), erectLength: 14.2 },
    { date: new Date(2026, 9, 12).toISOString(), erectLength: 14.4 },
    { date: new Date(2026, 10, 15).toISOString(), erectLength: 14.6 },
  ];
  assert.equal(monthStreak(history, now), 3);
  assert.equal(monthStreak(history.slice(0, 3), now), 2, 'last month still counts');
  assert.equal(monthStreak(history.slice(0, 1), now), 0);
  assert.equal(monthStreak([], now), 0);
  assert.equal(daysSinceLastEntry(history, now), 3);
  assert.equal(daysSinceLastEntry([], now), null);
  assert.ok(Math.abs(changeOver(history, 'erectLength', 90, now) - (14.4 - 14)) < 1e-9);
  assert.equal(changeOver(history, 'erectGirth', 90, now), null);

  const ics = reminderIcs('https://example.test/progress.html', new Date(2026, 0, 31));
  assert.match(ics, /DTSTART;VALUE=DATE:20260228/);
  assert.match(ics, /RRULE:FREQ=MONTHLY/);
  assert.ok(ics.includes('\r\n'));
});

test('new stats helpers', async () => {
  const { percentileRange, growth, empiricalPercentile, POPULATIONS } = await import('../js/stats.js');
  const d = POPULATIONS.global.stats.erectLength;
  const [lo, hi] = percentileRange(d.mean, d);
  assert.ok(lo < 50 && hi > 50 && Math.abs((50 - lo) - (hi - 50)) < 1e-3);
  assert.equal(growth(9, 13.5).type, 'grower');
  assert.equal(growth(11, 13.5).type, 'shower');
  assert.equal(empiricalPercentile(3, [1, 2, 3, 4, 5]), 50);
  assert.equal(empiricalPercentile(10, [1, 2, 3]), 100);
  assert.equal(empiricalPercentile(1, []), null);
});

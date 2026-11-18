// End-to-end smoke test. Serves the site locally, stubs the Supabase library with an
// in-memory backend, and drives the main flows in headless Chromium.
//   node tests/e2e.cjs            (needs the `playwright` package and its Chromium)
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  let file = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (file.endsWith('/')) file += 'index.html';
  const full = path.join(ROOT, file);
  if (!full.startsWith(ROOT) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(full)] || 'application/octet-stream' }).end(fs.readFileSync(full));
});

// Stand-in for @supabase/supabase-js. `MODE` is "modern" (schema.sql applied) or "legacy" (2024 database).
const stub = (mode) => `
const MODE = ${JSON.stringify(mode)};
const rows = Array.from({ length: 60 }, (_, i) => ({ unit: i % 3 ? 'cm' : 'in', erectLength: i % 3 ? 11 + (i % 9) : 4.5 + (i % 5) / 2,
  erectGirth: i % 3 ? 10 + (i % 5) : 4 + (i % 4) / 2, flaccidLength: null, flaccidGirth: null,
  timestamp: new Date(Date.now() - i * 86400000 / 4).toISOString() }));
const votes = () => JSON.parse(localStorage.getItem('stub:votes') || '{}');
const calls = () => JSON.parse(localStorage.getItem('stub:calls') || '[]');
const log = (c) => localStorage.setItem('stub:calls', JSON.stringify([...calls(), c]));
const ok = (data) => Promise.resolve({ data, error: null });
const missing = () => Promise.resolve({ data: null, error: { code: 'PGRST202', message: 'not found' } });
function pollRows(id) { const v = votes()[id] || {}; const counts = {}; Object.values(v).forEach((c) => { counts[c] = (counts[c] || 0) + 1; });
  return Object.entries(counts).map(([choice, n]) => ({ choice: Number(choice), votes: n })); }
function builder(rel) {
  const q = { op: 'select', rel };
  const b = { select: () => b, eq: () => b, maybeSingle: () => b, range: (from) => { q.from = from; return b; },
    insert: (v) => { q.op = 'insert'; q.v = v; return b; }, update: (v) => { q.op = 'update'; q.v = v; return b; }, delete: () => { q.op = 'delete'; return b; },
    then: (res, rej) => {
      log('table:' + rel + ':' + q.op);
      if (rel === 'community_measurements' && MODE === 'legacy') return Promise.resolve({ data: null, error: { code: 'PGRST205' } }).then(res, rej);
      if (q.op === 'select' && 'from' in q) return ok(q.from === 0 ? rows : []).then(res, rej);
      if (q.op === 'select') return ok(null).then(res, rej);
      return ok(null).then(res, rej);
    } };
  return b;
}
export function createClient() {
  return {
    from: builder,
    rpc(name, args) {
      log('rpc:' + name);
      if (MODE === 'legacy') return missing();
      if (name === 'poll_results') return ok(pollRows(args.p_poll));
      if (name === 'cast_vote') { const v = votes(); (v[args.p_poll] ||= {})[args.p_voter] = args.p_choice; localStorage.setItem('stub:votes', JSON.stringify(v)); return ok(pollRows(args.p_poll)); }
      if (name === 'get_measurements') return ok([]);
      return ok(null);
    },
  };
}`;

async function newContext(browser, mode, options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, serviceWorkers: 'block', ...options });
  await ctx.route(/^https?:\/\/(?!localhost)/, (route) => (route.request().url().includes('supabase-js')
    ? route.fulfill({ contentType: 'text/javascript', body: stub(mode) })
    : route.abort()));
  return ctx;
}

const calls = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('stub:calls') || '[]'));

(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const errors = [];
  const watch = (page) => {
    page.on('pageerror', (e) => errors.push(`${page.url()} ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text())) errors.push(`${page.url()} ${m.text()}`); });
  };

  // ---- 1. First visit, upgraded database ----
  let ctx = await newContext(browser, 'modern');
  let page = await ctx.newPage(); watch(page);
  await page.goto(base);
  assert.equal(await page.locator('#welcome').isVisible(), false, 'no welcome panel on a first visit');
  await page.locator('input[name=unit][value=cm]').check();
  await page.fill('#erectLength', '15.2');
  await page.fill('#erectGirth', '12.5');
  await page.fill('#flaccidLength', '9.5');
  await page.waitForSelector('#results:not(.hidden)');
  const text = await page.locator('#results-body').innerText();
  assert.match(text, /percentile/i);
  assert.match(text, /Allowing for measuring error/);
  assert.match(text, /Grower or shower/i);
  assert.match(text, /GROWER|Grower/);
  assert.match(text, /56\s*mm/);

  // Typing a partial value must not flash the "unusual value" warning; committing a bad one must show it.
  await page.fill('#erectLength', '1');
  assert.equal(await page.locator('#input-warning').isVisible(), false);
  await page.fill('#erectLength', '150'); await page.locator('#erectLength').blur();
  assert.equal(await page.locator('#input-warning').isVisible(), true);
  await page.fill('#erectLength', '15.2');
  assert.equal(await page.locator('#input-warning').isVisible(), false);

  // Unit switch converts the numbers.
  await page.locator('input[name=unit][value=in]').check();
  assert.equal(await page.inputValue('#erectLength'), '5.98');
  await page.locator('input[name=unit][value=cm]').check();

  // Consent → upload goes through the validated function, not the table.
  await page.click('#calc-form button[type=submit]');
  await page.click('#consent-dialog button[value=yes]');
  await page.waitForFunction(() => (localStorage.getItem('stub:calls') || '').includes('rpc:submit_measurements'), null, { timeout: 5000 });
  assert.ok(!(await calls(page)).some((c) => c.startsWith('table:visitor_data')), 'no direct table access once upgraded');

  // Community option unlocks from the stub's 60 rows.
  await page.waitForFunction(() => !document.querySelector('#population option[value=community]').disabled);
  await page.selectOption('#population', 'community');
  assert.match(await page.locator('#population-desc').innerText(), /self-reported/i);
  await page.selectOption('#population', 'global');

  // Poll: vote, see results, vote persists across reload.
  await page.waitForSelector('#poll:not(.hidden)');
  await page.locator('#poll [data-choice="1"]').click();
  await page.waitForSelector('#poll .poll-row.mine');
  assert.match(await page.locator('#poll').innerText(), /1 vote/);
  await page.reload();
  await page.waitForSelector('#poll .poll-row.mine');

  await page.click('#save-btn');

  // ---- 2. Other pages render with content and no errors ----
  for (const [url, expectText] of [
    ['compare.html', /Volume ratio/],
    ['size-chart.html', /percentile/],
    ['progress.html', /Month streak/],
    ['community.html', /Submissions/],
    ['user-info.html', /Stop sharing/],
    ['survey.html', /Submit anonymously/],
    ['camera-measure.html', /Choose or take a photo/],
    ['condom-recommendations.html', /Recommended nominal width/i],
    ['methodology.html', /Veale/],
    ['how-to-measure.html', /pubic bone/],
    ['shared-results.html?r=150.125.95.&u=in', /percentile/],
    [`size-chart.html?d=${Buffer.from('in,6,,5,').toString('base64')}`, /percentile/],
    ['404.html', /Page not found/],
  ]) {
    await page.goto(base + url);
    await page.waitForFunction((re) => new RegExp(re, 'i').test(document.body.innerText), expectText.source, { timeout: 5000 })
      .catch(() => { throw new Error(`${url}: expected text ${expectText}`); });
    assert.equal(await page.locator('.site-header nav').count(), 1, `${url}: header`);
  }

  // Calendar reminder downloads a valid .ics file.
  await page.goto(base + 'progress.html');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#reminder-btn')]);
  assert.match(fs.readFileSync(await download.path(), 'utf8'), /BEGIN:VEVENT[\s\S]*RRULE:FREQ=MONTHLY/);

  // ---- 3. Returning visitor sees the welcome-back panel ----
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('plssize:v2'));
    s.visits = { last: new Date(Date.now() - 9 * 86400000).toISOString(), previous: null, count: 1 };
    localStorage.setItem('plssize:v2', JSON.stringify(s));
    sessionStorage.clear();
  });
  await page.goto(base);
  await page.waitForSelector('#welcome:not(.hidden)');
  await page.waitForFunction(() => /new entries/.test(document.querySelector('#welcome').innerText));
  const welcome = await page.locator('#welcome').innerText();
  assert.match(welcome, /9 days ago/);
  assert.match(welcome, /percentile/);
  assert.doesNotMatch(welcome, /This week's question/, 'already voted, so no poll nudge');
  await ctx.close();

  // ---- 4. Database not upgraded yet: falls back to the 2024 table, poll stays hidden ----
  ctx = await newContext(browser, 'legacy');
  page = await ctx.newPage(); watch(page);
  await page.goto(base);
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('plssize:v2')); s.sharing = true; s.unit = 'cm'; localStorage.setItem('plssize:v2', JSON.stringify(s)); });
  await page.reload();
  await page.fill('#erectLength', '14'); await page.locator('#erectLength').blur();
  await page.waitForFunction(() => (localStorage.getItem('stub:calls') || '').includes('table:visitor_data:insert'), null, { timeout: 5000 });
  await page.waitForFunction(() => !document.querySelector('#population option[value=community]').disabled);
  assert.equal(await page.locator('#poll').isVisible(), false);
  await ctx.close();

  // ---- 5. Backend unreachable + phone-sized dark mode: still works, nothing overflows ----
  ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', serviceWorkers: 'block' });
  await ctx.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
  page = await ctx.newPage(); watch(page);
  for (const url of ['', 'compare.html', 'size-chart.html', 'progress.html', 'community.html', 'condom-recommendations.html']) {
    await page.goto(base + url);
    if (!url) { await page.fill('#erectLength', '5.5'); await page.fill('#erectGirth', '4.7'); }
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${url || 'index'}: horizontal overflow on mobile`);
  }
  assert.match(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), /rgb\(13, 19, 28\)/, 'dark theme applied');
  await ctx.close();

  // ---- 6. Service worker installs and serves the homepage offline ----
  ctx = await browser.newContext();
  await ctx.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
  page = await ctx.newPage();
  await page.goto(base);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(async () => (await caches.open('plssize-v1').then((c) => c.keys())).length > 10);
  await page.reload();
  await ctx.setOffline(true);
  await page.goto(base + 'how-to-measure.html');
  assert.match(await page.locator('h1').innerText(), /How to measure/);
  await ctx.close();

  await browser.close();
  server.close();
  assert.deepEqual(errors, [], 'no console or page errors');
  console.log('e2e: all checks passed');
})().catch((err) => { console.error(err); process.exit(1); });

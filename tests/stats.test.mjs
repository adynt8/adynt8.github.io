// Run with: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  erf, normalCdf, percentile, summarize, nominalWidthMm, cylinderVolumeMl, toUnit, fromUnit, isPlausible, POPULATIONS,
} from '../js/stats.js';

const close = (a, b, tol = 1e-4) => assert.ok(Math.abs(a - b) < tol, `${a} ≉ ${b}`);

test('erf matches reference values', () => {
  close(erf(0), 0, 1e-7);
  close(erf(0.5), 0.5204999, 1e-6);
  close(erf(1), 0.8427008, 1e-6);
  close(erf(-1), -0.8427008, 1e-6);
  close(erf(3), 0.9999779, 1e-6);
});

test('normal CDF', () => {
  close(normalCdf(0), 0.5);
  close(normalCdf(1), 0.841345, 1e-5);
  close(normalCdf(-1.96), 0.024998, 1e-5);
});

test('percentile of the mean is 50', () => {
  const d = POPULATIONS.global.stats.erectLength;
  close(percentile(d.mean, d), 50);
  close(percentile(d.mean + d.sd, d), 84.1345, 1e-3);
});

test('unit conversion round-trips', () => {
  close(toUnit(2.54, 'in'), 1);
  close(fromUnit(1, 'in'), 2.54);
  close(fromUnit(12, 'cm'), 12);
});

test('summarize', () => {
  const s = summarize([1, 2, 3, 4, NaN, 5]);
  assert.equal(s.n, 5);
  close(s.mean, 3);
  close(s.median, 3);
  close(s.sd, Math.sqrt(2.5));
  assert.deepEqual(summarize([]), { n: 0 });
});

test('derived measurements', () => {
  assert.equal(nominalWidthMm(12), 54);
  close(cylinderVolumeMl(10, 2 * Math.PI), Math.PI * 10);
});

test('plausibility filter', () => {
  assert.ok(isPlausible('erectLength', 13));
  assert.ok(!isPlausible('erectLength', 300));
  assert.ok(!isPlausible('erectGirth', NaN));
});

test('formatPercentile', async () => {
  const { formatPercentile } = await import('../js/stats.js');
  assert.equal(formatPercentile(0.2), '<1st');
  assert.equal(formatPercentile(99.6), '>99th');
  assert.equal(formatPercentile(1.2), '1st');
  assert.equal(formatPercentile(12), '12th');
  assert.equal(formatPercentile(22.4), '22nd');
  assert.equal(formatPercentile(83), '83rd');
});

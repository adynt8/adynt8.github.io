// Reference data and pure math helpers. Everything is stored and computed in centimetres;
// conversion to inches only happens at the display edge.

export const CM_PER_IN = 2.54;

export const METRICS = ['erectLength', 'erectGirth', 'flaccidLength', 'flaccidGirth'];

export const METRIC_LABELS = {
  erectLength: 'Erect length',
  erectGirth: 'Erect girth',
  flaccidLength: 'Flaccid length',
  flaccidGirth: 'Flaccid girth',
};

// Values outside these ranges (cm) are treated as typos or trolling when aggregating community data.
export const PLAUSIBLE_CM = {
  erectLength: [4, 30],
  erectGirth: [5, 22],
  flaccidLength: [2, 22],
  flaccidGirth: [4, 20],
};

export const SOURCES = {
  veale2015: {
    short: 'Veale et al., 2015',
    cite: 'Veale D, Miles S, Bramley S, Muir G, Hodsoll J. Am I normal? A systematic review and construction of nomograms for flaccid and erect penis length and circumference in up to 15,521 men. BJU International. 2015;115(6):978–986.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/25487360/',
  },
  herbenick2014: {
    short: 'Herbenick et al., 2014',
    cite: 'Herbenick D, Reece M, Schick V, Sanders SA. Erect penile length and circumference dimensions of 1,661 sexually active men in the United States. Journal of Sexual Medicine. 2014;11(1):93–101.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/23841855/',
  },
  prause2015: {
    short: 'Prause et al., 2015',
    cite: 'Prause N, Park J, Leung S, Miller G. Women’s preferences for penis size: a new research method using selection among 3D models. PLOS ONE. 2015;10(9):e0133079.',
    url: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0133079',
  },
  yafi2018: {
    short: 'Yafi et al., 2018',
    cite: 'Yafi FA, et al. Grower or shower? Predictors of change in penile length from the flaccid to the erect state. International Journal of Impotence Research. 2018;30(6).',
    url: 'https://pubmed.ncbi.nlm.nih.gov/30068977/',
  },
  belladelli2023: {
    short: 'Belladelli et al., 2023',
    cite: 'Belladelli F, Del Giudice F, Glover F, et al. Worldwide temporal trends in penile length: a systematic review and meta-analysis. World Journal of Men’s Health. 2023;41(4):848–860.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/36792094/',
  },
};

export const POPULATIONS = {
  global: {
    label: 'Global — clinician measured',
    description: 'Pooled data from studies where a health professional took the measurement.',
    source: 'veale2015',
    n: 15521,
    stats: {
      erectLength: { mean: 13.12, sd: 1.66 },
      erectGirth: { mean: 11.66, sd: 1.10 },
      flaccidLength: { mean: 9.16, sd: 1.57 },
      flaccidGirth: { mean: 9.31, sd: 0.90 },
    },
  },
  us: {
    label: 'United States — self measured',
    description: 'Men measured themselves at home to order fitted condoms. Erect measurements only.',
    source: 'herbenick2014',
    n: 1661,
    stats: {
      erectLength: { mean: 14.15, sd: 2.66 },
      erectGirth: { mean: 12.23, sd: 2.23 },
    },
  },
};

// Long-term partner preference from Prause et al. 2015 (n = 75 women, 3D models).
export const PREFERENCE = {
  longTerm: { erectLength: 16.0, erectGirth: 12.2 },
  oneTime: { erectLength: 16.3, erectGirth: 12.7 },
};

// Abramowitz & Stegun 7.1.26, max absolute error 1.5e-7.
export function erf(x) {
  const sign = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return sign * y;
}

export const normalCdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

export const normalPdf = (x, mean, sd) =>
  Math.exp(-0.5 * ((x - mean) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));

export const zScore = (value, { mean, sd }) => (value - mean) / sd;

/** Percentile (0–100) of `value` within a normal distribution. */
export const percentile = (value, dist) => normalCdf(zScore(value, dist)) * 100;

/** "73rd"-style label, clamped to <1 / >99 at the extremes. */
export function formatPercentile(p) {
  if (p < 1) return '<1st';
  if (p > 99) return '>99th';
  const n = Math.round(p);
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th');
  return `${n}${suffix}`;
}

export function describePercentile(p) {
  if (p < 2.5) return 'Well below average';
  if (p < 16) return 'Below average';
  if (p <= 84) return 'Average';
  if (p <= 97.5) return 'Above average';
  return 'Well above average';
}

/** Human-friendly percentile text, e.g. "larger than 73 of 100". */
export function percentileSentence(p) {
  const n = Math.round(p);
  if (n <= 0) return 'smaller than nearly everyone';
  if (n >= 100) return 'larger than nearly everyone';
  return `larger than about ${n} in 100`;
}

// Home measurements are only repeatable to about half a centimetre.
export const MEASUREMENT_ERROR_CM = 0.5;

/** Percentile band [low, high] allowing for measurement error. */
export function percentileRange(value, dist, errorCm = MEASUREMENT_ERROR_CM) {
  return [percentile(value - errorCm, dist), percentile(value + errorCm, dist)];
}

// Yafi et al. 2018 classed men whose length increased by 4 cm or more from flaccid to erect as "growers".
export const GROWER_THRESHOLD_CM = 4;

/** Flaccid-to-erect change: { gainCm, ratio, type: 'grower' | 'shower' }. */
export function growth(flaccidLengthCm, erectLengthCm) {
  const gainCm = erectLengthCm - flaccidLengthCm;
  return { gainCm, ratio: erectLengthCm / flaccidLengthCm, type: gainCm >= GROWER_THRESHOLD_CM ? 'grower' : 'shower' };
}

/** Percentile (0–100) of `value` within a list of observed values (share strictly below, half of ties). */
export function empiricalPercentile(value, values) {
  const v = values.filter(Number.isFinite);
  if (!v.length) return null;
  const below = v.filter((x) => x < value).length;
  const equal = v.filter((x) => x === value).length;
  return ((below + equal / 2) / v.length) * 100;
}

export const toUnit = (cm, unit) => (unit === 'in' ? cm / CM_PER_IN : cm);
export const fromUnit = (value, unit) => (unit === 'in' ? value * CM_PER_IN : value);

export function fmt(cm, unit, digits = unit === 'in' ? 2 : 1) {
  if (cm == null || Number.isNaN(cm)) return '—';
  return `${toUnit(cm, unit).toFixed(digits)} ${unit}`;
}

/** Condom nominal width (mm) that fits a given erect girth: roughly 45% of girth in mm. */
export const nominalWidthMm = (girthCm) => Math.round(girthCm * 10 * 0.45);

/** Cylinder volume in millilitres (cm³). V = C²·L / 4π. An upper bound: real shafts taper. */
export const cylinderVolumeMl = (lengthCm, girthCm) => (girthCm ** 2 * lengthCm) / (4 * Math.PI);

/** Shaft surface area (cm²), ignoring the ends: circumference × length. */
export const shaftSurfaceCm2 = (lengthCm, girthCm) => girthCm * lengthCm;

/** Basic descriptive statistics for an array of numbers. */
export function summarize(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  const n = v.length;
  if (!n) return { n: 0 };
  const mean = v.reduce((s, x) => s + x, 0) / n;
  const sd = n > 1 ? Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)) : 0;
  const q = (p) => {
    const i = (n - 1) * p;
    const lo = Math.floor(i);
    return v[lo] + (v[Math.min(lo + 1, n - 1)] - v[lo]) * (i - lo);
  };
  return { n, mean, sd, median: q(0.5), p25: q(0.25), p75: q(0.75), min: v[0], max: v[n - 1] };
}

export const isPlausible = (metric, cm) =>
  Number.isFinite(cm) && cm >= PLAUSIBLE_CM[metric][0] && cm <= PLAUSIBLE_CM[metric][1];

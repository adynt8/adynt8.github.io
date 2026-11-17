// Reference objects for size comparisons. Lengths and circumferences in cm (approximate, typical retail sizes).
export const OBJECTS = [
  { name: 'Wine cork', length: 4.4, girth: 7.4 },
  { name: 'AA battery', length: 5.0, girth: 4.6 },
  { name: 'D battery', length: 6.2, girth: 10.7 },
  { name: 'Lip balm stick', length: 6.8, girth: 5.3 },
  { name: 'Credit card (long edge)', length: 8.6 },
  { name: 'Toilet-paper tube', length: 10.0, girth: 13.8 },
  { name: 'Soda can (12 oz / 355 ml)', length: 12.2, girth: 20.7 },
  { name: 'Marker pen', length: 13.7, girth: 4.1 },
  { name: 'Smartphone (6.1″)', length: 14.7 },
  { name: 'Hot dog', length: 15.0, girth: 8.0 },
  { name: 'US dollar bill', length: 15.6 },
  { name: 'Banana', length: 18.0, girth: 12.0 },
  { name: 'Toothbrush', length: 19.0 },
  { name: 'Cucumber', length: 20.0, girth: 14.0 },
  { name: 'Pringles can', length: 23.0, girth: 23.6 },
  { name: 'Taper candle', length: 25.0, girth: 6.9 },
  { name: 'Paper-towel tube', length: 28.0, girth: 13.8 },
  { name: '12-inch ruler', length: 30.5 },
];

export function closestBy(key, valueCm) {
  return OBJECTS.filter((o) => o[key] != null)
    .reduce((best, o) => (Math.abs(o[key] - valueCm) < Math.abs(best[key] - valueCm) ? o : best));
}

// Condom fit tiers by nominal width (the flat width of the unrolled condom, in mm).
export const CONDOM_TIERS = [
  {
    id: 'snug', label: 'Snug fit', min: 0, max: 51,
    examples: ['Lifestyles Snugger Fit', 'Glyde Slimfit', 'Mister Size 47 / 49', 'MyONE Perfect Fit (small sizes)'],
  },
  {
    id: 'standard', label: 'Standard fit', min: 52, max: 55,
    examples: ['Trojan ENZ', 'SKYN Original', 'Durex Extra Sensitive', 'Mister Size 53'],
  },
  {
    id: 'large', label: 'Large fit', min: 56, max: 59,
    examples: ['SKYN Large', 'Trojan Magnum', 'Durex XXL', 'Mister Size 57'],
  },
  {
    id: 'xl', label: 'Extra-large fit', min: 60, max: Infinity,
    examples: ['Mister Size 60 / 64 / 69', 'MyONE Perfect Fit (large sizes)', 'TheyFit (large sizes)'],
  },
];

export const condomTier = (nominalMm) => CONDOM_TIERS.find((t) => nominalMm <= t.max) ?? CONDOM_TIERS.at(-1);

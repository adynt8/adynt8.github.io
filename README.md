# PlsSize.Me

Source for [plssize.me](https://plssize.me): a private, research-based penis size calculator. It's a static site on GitHub Pages with no build step and no framework.

## Features

| Page | What it does |
| --- | --- |
| `index.html` | Calculator: percentiles, condom size, volume, partner-preference and everyday-object comparisons, share links |
| `compare.html` | Side-by-side visual comparison drawn to scale (you, averages, custom sizes, objects) |
| `size-chart.html` | Bell-curve distribution charts with your position |
| `progress.html` | Local measurement log with trend chart, CSV export/import |
| `community.html` | Aggregate stats from opt-in anonymous submissions |
| `camera-measure.html` | Measure length from a photo using a bank card for scale (on-device only) |
| `condom-recommendations.html` | Nominal width and fit tier from erect girth |
| `survey.html` | Anonymous survey |
| `user-info.html` | See, export and delete your data; manage sharing |
| `how-to-measure.html`, `methodology.html` | Guides, formulas, limitations and sources |

## Layout

```
css/site.css          All styles (light/dark themes via CSS variables)
js/boot.js            Theme + analytics bootstrap (classic script in <head>)
js/layout.js          Header, footer, theme toggle, toasts, AdSense slots
js/stats.js           Reference data and math (pure, unit-tested)
js/store.js           localStorage state, including migration from the 2024 site's keys
js/api.js             Supabase access (optional; the site works offline without it)
js/charts.js          Dependency-free SVG charts
js/pages/*.js         One module per page
supabase/schema.sql   Tables and row-level-security policies
tests/                node:test unit tests
```

All measurements are stored and computed in centimetres. Inches only appear in the display layer.

## Develop

```sh
npm start   # python3 -m http.server 8080 → http://localhost:8080
npm test    # node --test
```

ES modules need an HTTP server, so opening the files directly with `file://` won't work.

## Backend

Community stats, sharing and the survey use Supabase (`js/config.js`). Run `supabase/schema.sql` once to create the `survey_responses` table and set up row-level security on `visitor_data`. If Supabase is unreachable, those features show a friendly message and everything else keeps working.

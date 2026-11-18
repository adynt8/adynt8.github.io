# PlsSize.Me

Source for PlsSize.Me (served at <https://adynt8.github.io/>): a private, research-based penis size calculator. It's a static site on GitHub Pages with no build step and no framework.

## Features

| Page | What it does |
| --- | --- |
| `index.html` | Calculator: percentiles with a measuring-error band, condom size, volume, grower/shower, comparisons, share links. Also the question of the week and a welcome-back summary for returning visitors |
| `compare.html` | Side-by-side visual comparison drawn to scale (you, averages, custom sizes, objects) |
| `size-chart.html` | Bell-curve distribution charts with your position |
| `progress.html` | Local measurement log with trend chart, month streak, calendar reminder, CSV export/import |
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
js/home.js            Welcome-back panel and weekly poll (homepage)
js/polls.js           Poll questions and weekly rotation
js/progress-stats.js  Streaks, change over time, calendar reminder
sw.js                 Service worker: offline support (network first)
js/pages/*.js         One module per page
supabase/schema.sql   Tables, locked-down permissions and the functions the site calls
supabase/test/        SQL checks for schema.sql against a 2024-shaped table
tests/                Unit tests (node:test) and a headless-browser end-to-end test
```

All measurements are stored and computed in centimetres. Inches only appear in the display layer.

## Develop

```sh
npm start   # python3 -m http.server 8080 → http://localhost:8080
npm test          # unit tests
npm run test:e2e  # browser test; needs `npm i --no-save playwright && npx playwright install chromium`
```

ES modules need an HTTP server, so opening the files directly with `file://` won't work.

## Backend

Community stats, sharing, the weekly poll and the survey use Supabase (`js/config.js`).

`supabase/schema.sql` defines everything (run it in the Supabase SQL editor; it never modifies existing rows). It:

- removes all direct access to the tables for the public key;
- adds validated functions for saving, reading and deleting a visitor's own entry (`submit_measurements`, `get_measurements`, `delete_measurements`);
- adds a `community_measurements` view that exposes measurements only, with no visitor IDs;
- creates the poll tables/functions (`cast_vote`, `poll_results`) and the insert-only `survey_responses` table.

The live project already has it applied; re-run it after editing the file (it's safe to run repeatedly). If Supabase is unreachable, those features hide or show a friendly message and everything else keeps working.

To bring over entries from the 2024 project, export its `visitor_data` table as CSV and import it into this project's `visitor_data` table. Inch-based rows are converted when read.

To add poll questions, append to `POLLS` in `js/polls.js`. One question is shown per week, in order, repeating.

## Custom domain

Canonical URLs, `sitemap.xml` and `robots.txt` point at `https://adynt8.github.io/`. If you bring back a custom domain, restore `CNAME` and search-and-replace that URL.

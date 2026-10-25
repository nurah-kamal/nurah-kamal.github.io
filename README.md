# nurah-kamal.github.io

My portfolio: who I am, my work in five fields drawn as five lines on a map, three case studies, Firefly, and how to reach me. Plain HTML, CSS and JavaScript, with no build step and nothing to install.

## Current status

- The site is ready to publish at https://nurah-kamal.github.io/ once this repository is public with GitHub Pages switched on.
- Home, three case studies (SA Turnaround, Stock and Orders, Power BI Turnaround) and a 404 page.
- Checked at 320, 375, 768 and 1280 pixels wide: no sideways scrolling, no text under 12px, tap targets of at least 44px on phones.

## Run locally

Any static file server works. With Node 22 or later:

```bash
npx serve .
```

Opening `index.html` straight from the disk won't load the project list, because browsers block JavaScript modules on `file://` addresses.

## Verification

```bash
node scripts/check.mjs
node --test
```

It checks every page's title, description, canonical address, share image and structured data, that there's exactly one main heading, that every internal link and sitemap address points at a real file, and that every case study in the project list has a page. The tests check the sudoku: every puzzle has exactly one solution, clashes in a row, column or box are found, and filling in the solution one cell at a time never clashes.

## How it's put together

| | |
| --- | --- |
| `index.html` | The home page. The map, the phone index and the work list are drawn from the project list. |
| `assets/js/projects.js` | The project list: five lines, and one line per project. |
| `assets/js/map.js` | Draws the map and the work list from the project list, and the line selector. |
| `assets/css/site.css` | Every style, with the colours as tokens at the top. |
| `work/` | One folder per case study. |
| `writing/` | Articles. |
| `assets/js/sudoku-core.js` | The sudoku rules and solver, shared with the tests. |
| `assets/js/sudoku.js` | The playable sudoku in the About section. Progress is saved in the browser only. |
| `assets/fonts/` | Overpass and Overpass Mono, self-hosted (SIL Open Font License, in `OFL.txt`). |

## Adding a project

Add one line to `STATIONS` in `assets/js/projects.js`:

```js
{ line: 'analysis', name: 'reconcile', status: 'code', code: `${GH}/data-analysis/tree/main/reconcile`, tools: 'Python', blurb: 'Reports where two datasets disagree.' },
```

`line` is one of `reporting`, `bi`, `analysis`, `stats` or `software`. `status` is `live` (has a page to open), `code` (code to read), `case` (has a case study) or `soon`. Add `live`, `code` or `study` links as they exist. The map, the phone index and the work list all pick it up.

A new case study also needs its own folder in `work/`, a line in `sitemap.xml`, and a row in the case studies list on the home page.

## Motion

The map's lines draw themselves in once when the home page opens, and stations appear as each line reaches them. Picking a line fades the others back. With reduced motion switched on, the map simply fades in and the fireflies stay still.

## Data

Apart from Firefly, every project linked here runs on public or invented data. No personal data is on this site.

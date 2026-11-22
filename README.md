# n8n-nodes-silverpoint

An n8n community node that draws [silverpoint](https://github.com/ecrespo/silverpoint) charts from
workflow items, as SVG or HTML. It needs no credential and calls no service: the chart is drawn inside
the node by silverpoint's own engine, bundled into the package.

Draws with **silverpoint 0.11** (`@silverpoint/embed` 0.11.1, the line stated in `package.json` under
`silverpoint`).

## Install

In n8n: *Settings → Community Nodes → Install*, package `n8n-nodes-silverpoint`.

## The node

| Parameter | What it does |
|---|---|
| **Chart** | Any of the 56 charts a table can feed, grouped by family (`Bars: Bar Chart`, `Lines: Line Chart`, …). |
| **Role fields** | One per role of the chosen chart — the name of the field holding it (`team`, `wins`); several roles take comma-separated names. Expressions are allowed. |
| **Options** | The chart's own options (curve, orientation, …) and the common ones (title, data table, …). |
| **Rows** | *From Items*: every input item's JSON is one row, one chart for all items. *From a Field*: an array of rows at a field of each item, one chart per item. |
| **Ground, Substrate, Appearance, Size** | The paper, its tone, ink or precision mode, the palette, width and height. |
| **Output** | *SVG* (a binary property, `image/svg+xml`, and optionally the markup in `svg`), *HTML* (a static page in `html`), *Interactive HTML* (the page with the script inlined: keyboard, pointer, resizing). |
| **Embed Fonts** | Embeds EB Garamond, so the output draws the same anywhere. |

Each output item carries `chart`, `id` and the render's warnings under `diagnostics`. A missing role, an
unknown field or an unknown option stops the node with the reason and the item index; with *Continue On
Fail* the reason becomes the item's `error`.

The node is usable as an AI-agent tool: a model passes rows and, per role, a field name.

## Three workflows

- **A chart in an email.** *Postgres* (one row per team) → *Silverpoint* (Bar chart, `x` = `team`,
  `value` = `wins`, Output SVG, Embed Fonts on) → *Send Email* with the binary property `data` attached.
- **A chart into a file.** *HTTP Request* returning `{ "rows": [...] }` → *Silverpoint* (Rows From a
  Field `rows`, Line chart) → *Write Binary File* `/data/charts/{{ $json.id }}.svg`.
- **An HTML report.** *Google Sheets* → *Silverpoint* (Output Interactive HTML) → *Respond to Webhook*
  with `{{ $json.html }}` as `text/html`.

## Development

```sh
npm install
npm run generate     # nodes/Silverpoint/properties.generated.ts from vendor/host-catalog.json
npm run build        # the engine bundle, n8n-node build, the engine copied into dist
npm test             # vitest (the dist tests run after a build)
npm run conformance  # the library's conformance kit against the engine as loaded from dist
npm run scan         # n8n's community-package scanner, its local scan (also in CI and before publishing)
npm run lint         # n8n-node lint, strict
npm run check        # the generated file and the vendored engine are current
```

`npm run local-run` (needs Docker, after a build) packs the package, installs it into a throw-away n8n
home, runs [`examples/local-run.workflow.json`](examples/local-run.workflow.json) in the official
`n8nio/n8n` image and prints each Silverpoint node's output: SVG (binary and text), HTML, Interactive
HTML, rows from a field, and an error under *Continue On Fail*.

A new silverpoint line: `node scripts/vendor.mjs X.Y.Z` (the release's hosts kit), `npm run generate`,
`npm run build`, `npm run conformance`, release.

Licence: MIT. The bundled engine embeds EB Garamond (SIL OFL 1.1).

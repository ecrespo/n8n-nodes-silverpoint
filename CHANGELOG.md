# Changelog

## 0.1.3 (2026-11-22)

- Error messages no longer end in their own `[Item X]`: n8n already appends "[item N]" from the
  error's item index, so the number showed twice.
- The package no longer ships `dist/tsconfig.tsbuildinfo` (TypeScript's build info, 110 kB).
- Published through npm Trusted Publishing (OIDC, no token) on Node 24, as 0.1.2 was.

## 0.1.2 (2026-11-22)

- Error messages follow n8n's UX guidelines: they name the parameter to fix by its label ("The rows
  have no field 'losses', set in 'Value Field'"), end in `[Item X]` when the chart is one item's, and
  come with a description of what to change. With rows from a field, a field without rows now names
  its own item, not always item 0.
- Clearer parameter copy: no code names in the chart and option descriptions (props shown as the
  parameter that sets them), US spelling, boolean options described as "Whether to …", the *Chrome*
  option shown as *Frame*. Parameter names and values are unchanged, so workflows keep working.

## 0.1.1 (2026-11-22)

- The bundled engine carries only what the node calls (the DOM-free render and `specFromTable`); the
  browser client and the conformance kit stay out, so the package passes n8n's community-package
  scanner, which refused 0.1.0 (`setTimeout`, `clearTimeout`, `globalThis` in the bundle).
- `npm run scan` (the scanner's local scan, locked in `tools/scan`) runs in CI and, in a job without
  secrets, before every publish; the conformance
  script hashes with `node:crypto`. No change to the node's parameters or output.

## 0.1.0 (2026-11-22)

- The Silverpoint node: 56 charts from the pinned host catalog, rows from items or from a field,
  SVG / HTML / Interactive HTML, Continue On Fail, diagnostics, usable as a tool.
- The engine (`@silverpoint/embed` 0.11.1) bundled into `dist`; the conformance kit runs against it.

# Changelog

## 0.1.1

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

# `n8n-nodes-silverpoint` — Technical design

> Split from `specs/spec-pack.md` (silverpoint feature-007, `repositories/`), content unchanged.

## Design decisions

- **N8N-DD-01 — Bundle, do not depend.** esbuild inlines `@silverpoint/embed` (main, `/hosts`,
  `/conformance`) into one CommonJS file under `dist/`. For *Interactive HTML* the standalone script
  is read from a `.js` asset copied into `dist` at build, not from `node_modules`.
- **N8N-DD-02 — Parameters are generated.** `scripts/make-properties.ts` writes
  `nodes/Silverpoint/properties.generated.ts` from the host catalog: the chart options list, and per
  chart the role and option parameters under `displayOptions.show.chart`. CI: `--check` (H-3).
- **N8N-DD-03 — Roles take field names, as text with expressions allowed.** A workflow's columns
  are not known at design time; n8n's own nodes take field names the same way.
- **N8N-DD-04 — Verification is a goal, not a dependency.** If reviewers refuse a bundled engine
  (silverpoint research R4), the node stays an unverified community node for self-hosted n8n, and
  the answer is recorded here.

## Structure

```
nodes/Silverpoint/  Silverpoint.node.ts  properties.generated.ts  silverpoint.svg (icon)  Silverpoint.node.json
scripts/  make-properties.ts  bundle-engine.mjs  conformance.mjs
vendor/   host-catalog.json  conformance.json  integrity.json   (pinned, H-2)
test/     .github/workflows/  ci.yml  publish.yml (provenance)
```

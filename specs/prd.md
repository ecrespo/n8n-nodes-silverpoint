# `n8n-nodes-silverpoint` — Prd

> Split from `specs/spec-pack.md` (silverpoint feature-007, `repositories/`), content unchanged.

## Scope

**In:** one node, *Silverpoint Chart*; output as SVG, static HTML or interactive HTML; binary and
JSON output. **Out:** a trigger; credentials; PNG (needs a rasteriser, a run-time dependency);
sending the chart anywhere (that is the next node's job).

## Requirements

| ID | Requirement | Priority |
|---|---|---|
| N8N-REQ-001 | THE NODE SHALL offer a *Chart* parameter listing every chart of the pinned host catalog whose `binding` is not `none`, grouped by family, each with its `summary` as description. | MUST |
| N8N-REQ-002 | WHEN a chart is chosen, THE NODE SHALL show one field-name parameter per role of that chart —required roles marked— and the chart's options as typed parameters, all generated from the host catalog. | MUST |
| N8N-REQ-003 | THE NODE SHALL take as the chart's table either all input items' JSON (*Rows from items*) or an array at a field of each item (*Rows from a field*, one chart per item). | MUST |
| N8N-REQ-004 | THE NODE SHALL offer *Appearance* parameters —ground, substrate (filtered by ground), mode, palette— and *Size* (width, height), from the host catalog. | MUST |
| N8N-REQ-005 | WHEN *Output* is `SVG`, THE NODE SHALL return `renderToSVG`'s result as a binary property (`image/svg+xml`, file name from the chart's id) and, WHERE *Also as text* is set, in a JSON field. *Embed fonts* SHALL map to `embedFonts`. | MUST |
| N8N-REQ-006 | WHEN *Output* is `HTML`, THE NODE SHALL return `renderToHTML`'s static document; WHEN `Interactive HTML`, the interactive document with the standalone script inlined. | MUST |
| N8N-REQ-007 | IF binding or rendering fails, THEN THE NODE SHALL throw a `NodeOperationError` whose message tells what happened from the `SpecError` —naming missing roles, unknown columns, the unknown prop or the size out of range by the display name of the parameter that sets them, with no item number of its own (n8n appends "[item N]" from the item index)— and whose description tells what to change, as n8n's UX guidelines ask; with the item index; and SHALL honour *Continue On Fail* by emitting the message as the item's JSON `error`. | MUST |
| N8N-REQ-008 | THE NODE SHALL emit every warning diagnostic of a render in the item's JSON under `diagnostics`. | MUST |
| N8N-REQ-009 | THE NODE SHALL be usable as an AI-agent tool (`usableAsTool`), its description telling a model to pass rows and role fields. | SHOULD |
| N8N-REQ-010 | THE PUBLISHED PACKAGE SHALL pass `@n8n/node-cli`'s lint and the community-package scanner, and SHALL contain no `require` of a module outside itself and `n8n-workflow`. | MUST |
| N8N-REQ-011 | CI SHALL run the conformance kit against the bundled engine as loaded from `dist`. | MUST |

# `n8n-nodes-silverpoint` — Constitution

> Split from `specs/spec-pack.md` (silverpoint feature-007, `repositories/`), content unchanged.

## Constitution

H-1..H-8, and:

- **N8N-Art. 1 — Zero run-time dependencies.** `package.json` SHALL declare no `dependencies`. The
  engine is a `devDependency` bundled by the build; `n8n-workflow` is a peer.
- **N8N-Art. 2 — A pure function of its input.** THE NODE SHALL read only its input items and
  parameters, call no service, need no credential and write nothing but its output items.
- **N8N-Art. 3 — Verified-node rules from the first release.** Scaffolded and linted with
  `@n8n/node-cli`; published only from GitHub Actions with a provenance statement.

Stack: TypeScript; `@n8n/node-cli`; esbuild for the engine bundle; Vitest; Node as n8n requires.

## Identity

| Field | Value |
|---|---|
| **Repository** | `github.com/ecrespo/n8n-nodes-silverpoint` |
| **Published as** | npm `n8n-nodes-silverpoint`, keyword `n8n-community-node-package` |
| **Licence** | MIT (required of verified nodes) |
| **Description** | n8n community node that draws silverpoint charts from workflow items, as SVG or HTML. |
| **Draws with** | `@silverpoint/embed`'s DOM-free entry, bundled into `dist` at build time |
| **Wave** | 1 |
| **Ids** | `N8N-REQ-nnn`, `N8N-DD-nn`, `N8N-T-nn` |
| **Status** | `APPROVED` gate-1 pack, 2026-11-20 (user decision); re-read against the released API in T-328 |

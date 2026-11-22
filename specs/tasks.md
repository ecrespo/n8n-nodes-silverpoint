# `n8n-nodes-silverpoint` — Tasks

> Split from `specs/spec-pack.md` (silverpoint feature-007, `repositories/`), content unchanged.

## Tasks

- [x] **N8N-T-01** Split this pack into `specs/`; `CLAUDE.md`; scaffold with `@n8n/node-cli`. Stop for review. *H-7, N8N-Art. 3*
- [x] **N8N-T-02** `scripts/bundle-engine.mjs`; the kit against `dist`; a test that `dist` requires nothing external. *N8N-REQ-010, N8N-REQ-011, H-4*
- [x] **N8N-T-03** `scripts/make-properties.ts` and `--check`. *N8N-REQ-001, N8N-REQ-002, N8N-REQ-004, H-3*
- [x] **N8N-T-04** Row sources. *N8N-REQ-003*
- [x] **N8N-T-05** SVG output, binary and text. *N8N-REQ-005*
- [x] **N8N-T-06** HTML outputs. *N8N-REQ-006*
- [x] **N8N-T-07** Errors, *Continue On Fail*, diagnostics. *N8N-REQ-007, N8N-REQ-008*
- [x] **N8N-T-08** Tool use; README with three workflows (a chart into an email, into a file, into an HTML report); a local n8n run showing each node's output. *N8N-REQ-009, H-8*
- [ ] **N8N-T-09** `publish.yml` with provenance; release `0.1.0`; submit through the Creator Portal. *N8N-Art. 3* — released as `0.1.1` (scanner passed); Creator Portal submission open.
- [x] **N8N-T-10** Review against n8n's UX guidelines: error messages and descriptions (`messages.ts`), the catalog's copy rewritten (`scripts/copy.mjs`), release `0.1.2`. *N8N-REQ-001, N8N-REQ-002, N8N-REQ-007*

## Open questions

- **N8N-OQ-1** Does the reviewers' reading of "no run-time dependencies" accept a bundled engine of
  this size? Ask in the Creator Portal before N8N-T-09, with the bundle's size.

## Bootstrap prompt

````text
This repository will publish `n8n-nodes-silverpoint`, an n8n community node that draws silverpoint charts. Its design is in specs/spec-pack.md, written in the silverpoint repository (~/WebstormProjects/silverpoint/changes/feature-007-bi-hosts). Read the pack, then that folder's README.md, api-delta.md and repositories/README.md §3, and n8n's verification guidelines.

Do N8N-T-01 only: split the pack into specs/ without changing its content, write CLAUDE.md, scaffold with @n8n/node-cli and make its lint pass on the empty node. Show me the tree and the lint's output, then stop.
````

## Implementation ledger (2026-11-20)

Built test-first against silverpoint `0.10.1`'s local build (`scripts/vendor.mjs --from`), which
carries the 0.11.0 API. Each task's tests were written and run red before the code. Local run, in the
CI order: `npm run check` (properties current, vendor ok), `npm run lint` (strict, exit 0), `npm run
build`, `npx vitest run` — 23 passed, `npm run conformance` — 76 passed, 0 failed against `dist`.

| Task | Tests | Mutation check |
|---|---|---|
| N8N-T-02 | `test/dist.test.mjs` (no dependencies, every require relative/built-in/`n8n-workflow`, the kit from `dist`) | — |
| N8N-T-03 | `test/properties.test.mjs` (56 charts sorted into families, roles per chart, typed options, substrate by ground, `--check`) | — |
| N8N-T-04..07 | `test/run.test.mjs`, `test/node.test.mjs` | a multiple role sent as one field → red |

### Deviations — to review

- **N8N-D1 — the engine comes from the hosts kit, not from npm.** `@silverpoint/embed` is not published
  yet, so `scripts/vendor.mjs` pins the kit's module build (`vendor/`, verified against
  `integrity.json`) and `scripts/bundle-engine.mjs` bundles it with the standalone script's text into
  one CommonJS file. When 0.11.0 is on npm this can become a `devDependency`; the bundle is the same.
- **N8N-D2 — tests are `.mjs`.** `n8n-node lint` in strict mode refuses a modified `eslint.config.mjs`
  and lints every `.ts` file, so the tests (which use `node:fs` and child processes) are JavaScript.
- **N8N-D3 — generated descriptions pass through n8n's lint fixes** (title-case names, no final
  period), applied by the generator so `--check` and `lint` agree.
- **N8N-D4 — options and roles are flat per chart** (`barChartX`, `barChartOptions`): n8n parameters
  need unique names across `displayOptions`.

### Re-vendored at 0.11.1 (2026-11-22)

`scripts/vendor.mjs --from ../silverpoint` against the checkout at `v0.11.1` rebuilt
(`core`, `grounds`, `embed`; the release download was not reachable from this machine). 0.11.1 changes no
engine code over 0.11.0 (versions only); the catalog still lists 60 charts, 56 with a binding. `npm run
check`, `lint`, `build`, `npx vitest run` — 24 passed, `npm run conformance` — 76 passed, 0 failed.

- Fixed: under *Continue On Fail* with *Rows From Items*, the error item was paired with item 0 only; it
  is now paired with every input item, like a successful chart (`test/node.test.mjs`, red first).
- N8N-T-08 done: `npm run local-run` runs `examples/local-run.workflow.json` in `n8nio/n8n:stable`
  (2.31.5) with the packed package installed as a community node. All five Silverpoint nodes succeed:
  SVG `wins.svg` (9.5 kB, text in `svg`), HTML (10 kB), Interactive HTML (552 kB, script and fonts
  inlined), Line chart from a field, and `bar-chart: the table has no column "losses".` as the item's
  `error` under *Continue (regular output)*.

### 0.1.0 published, the scanner refuses it; 0.1.1 (2026-11-22)

`0.1.0` was published from `publish.yml` with provenance (SLSA v1). `npx @n8n/scan-community-package
n8n-nodes-silverpoint` then failed it: 4 `no-restricted-globals` errors in the bundled engine —
`setTimeout`/`clearTimeout` in the `<silverpoint-chart>` element and `globalThis.crypto` in the
conformance kit, code the node never runs (the scanner disables inline `eslint-disable`). Fixed
test-first: `scripts/bundle-engine.mjs` exports only `renderToHTML`, `renderToSVG`,
`specErrorMessage`, `specFromTable`, `validateSpec`, `version` and the standalone script's text, so
esbuild drops the rest; `scripts/conformance.mjs` runs the kit's runner with `node:crypto` over the
same cases (76 passed); `npm run scan` runs `@n8n/scan-community-package` 0.44.0 from `tools/scan`, its own locked install
(`npm run scan:install`; not a devDependency, since it brings TypeScript 6, which takes `.bin/tsc`).
`test/dist.test.mjs` runs it when `SP_SCAN` is set (CI sets it); `publish.yml` runs it in a job of its
own, with no secret and no OIDC token, which the publish job needs. The node's output is unchanged (`npm run local-run`).

### 0.1.1 published and scanned (2026-11-22)

- `0.1.1` published by `publish.yml` (tag `0.1.1`, commit `4aa0a54`): the `scan` job (no secret, no
  OIDC token) then the `publish` job, with provenance (SLSA v1). `latest` is `0.1.1`.
- `npx @n8n/scan-community-package n8n-nodes-silverpoint@0.1.1`: *has passed all security checks* —
  provenance, the attested source (`github.com/ecrespo/n8n-nodes-silverpoint@4aa0a54`), its lint and the
  package's. Installed from npm, it renders SVG and Interactive HTML with engine 0.11.1.
- npm set-up done by the maintainer: `0.1.0` deprecated ("Use 0.1.1 or later: 0.1.0 fails n8n's
  community-package scanner."); the `NPM_TOKEN` secret deleted; Trusted Publisher set (GitHub Actions,
  `ecrespo/n8n-nodes-silverpoint`, `publish.yml`, no environment); `@silverpoint:developers` given
  read-write on the package (an unscoped package stays owned by its user, not listed under the org).
- Trusted Publishing is not exercised yet: the next tag is the first release without a token. If it
  fails at `npm publish`, nothing is published; check the Trusted Publisher with `npm trust list`.

### UX guidelines (N8N-T-10, 0.1.2)

- Reviewed against https://docs.n8n.io/integrations/creating-nodes/build/reference/ux-guidelines/.
  Credentials, CRUD operations, Resource Locator, delete output and Simplify do not apply (no service).
- Errors: `nodes/Silverpoint/messages.ts` turns a `SpecError` (role, chart, prop, size, other) or a
  field without rows into a message naming the parameter by its display name ("The rows have no field
  'losses', set in 'Value Field'"), `[Item X]` with rows from a field, and a description of what to
  change; never the words error, problem, failure or mistake. `run.ts` throws `ChartFailure` /
  `RowsFailure`. Fixed on the way: with rows from a field, a field without rows said `Item 0` for
  every item.
- Copy: `scripts/copy.mjs`, applied by `make-properties.mjs` to the catalog's summaries and option docs:
  a prop in backticks becomes the parameter that sets it in single quotes (`sizeKey` → 'Size Field',
  `scaleMax` → 'Scale Max'), the React-only "drillable through `rootId` and `onRootChange`" goes, ∝ is
  spelled out, US spelling, boolean descriptions as "Whether to …; on by default"; the option `chrome`
  is shown as *Frame*; field names in single quotes.
- The local n8n run (`npm run local-run`) shows the new message under *Continue On Fail*.

### Open

- N8N-T-09: submit `n8n-nodes-silverpoint@0.1.2` through the n8n Creator Portal.
- N8N-OQ-1, to ask there (bundle size: the bundled engine is 1.1 MB of CommonJS, fonts and the
  standalone script included; the packed package is 489 kB, 1.7 MB unpacked).


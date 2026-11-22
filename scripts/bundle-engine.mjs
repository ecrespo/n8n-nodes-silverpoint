// N8N-DD-01 (as implemented): esbuild bundles the vendored module build of @silverpoint/embed — the
// DOM-free render and specFromTable, with EB Garamond, tree-shaken to what the node calls — and the standalone script's text (for
// Interactive HTML) into one CommonJS file the node requires. Written to nodes/Silverpoint/engine/
// (for the tests and tsc) and, after `n8n-node build`, copied into dist by scripts/after-build.mjs.
import { build } from 'esbuild';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = `${root}nodes/Silverpoint/engine/silverpoint-engine.js`;
mkdirSync(`${root}nodes/Silverpoint/engine`, { recursive: true });
const { version } = JSON.parse(readFileSync(`${root}vendor/host-catalog.json`, 'utf8'));

await build({
  stdin: {
    contents: [
      // Only what the node calls: the browser client (<silverpoint-chart>, mount) and the conformance
      // kit (Web Crypto) stay out, so dist passes the community-package scanner (N8N-REQ-010).
      "export { renderToHTML, renderToSVG, specErrorMessage, specFromTable, validateSpec, version } from './vendor/silverpoint-embed.full.mjs';",
      "export { default as STANDALONE_SCRIPT } from './vendor/silverpoint-embed.full.js';",
    ].join('\n'),
    resolveDir: root,
    sourcefile: 'engine-entry.mjs',
  },
  loader: { '.js': 'text' },
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  outfile: out,
  legalComments: 'inline',
  banner: { js: `/*! silverpoint engine for n8n: @silverpoint/embed ${version}, bundled (MIT; EB Garamond OFL-1.1) */` },
  logLevel: 'warning',
});
console.log(`engine ${version} → nodes/Silverpoint/engine/silverpoint-engine.js`);

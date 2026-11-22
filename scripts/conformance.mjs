// N8N-REQ-011 (H-4): the conformance kit against the engine as shipped — loaded from dist, through
// the compiled node's own engine module, in Node — over the pinned vendor/conformance.json.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const { engine } = require(`${root}dist/nodes/Silverpoint/engine.js`);
const cases = JSON.parse(readFileSync(`${root}vendor/conformance.json`, 'utf8'));

const result = await engine.conformance((spec) => {
  const out = engine.renderToSVG(spec);
  if (!out.ok) throw new Error(engine.specErrorMessage(out.error));
  return out.value.svg;
}, undefined, cases);
console.log(`conformance ${cases.version} (dist): ${result.passed} passed, ${result.failed.length} failed`);
for (const f of result.failed) console.log(`  ${f.name}: expected ${f.expected}, got ${f.actual}`);
process.exit(result.failed.length === 0 && engine.version === cases.version ? 0 : 1);

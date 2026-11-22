// N8N-REQ-011 (H-4): the conformance kit against the engine as shipped — loaded from dist, through
// the compiled node's own engine module, in Node — over the pinned vendor/conformance.json.
// The kit's runner (render each case, compare the SHA-256 of the SVG) is run here with node:crypto:
// the bundle leaves the kit out, since it reaches for globalThis.crypto, which the community-package
// scanner refuses (N8N-REQ-010).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const { engine } = require(`${root}dist/nodes/Silverpoint/engine.js`);
const cases = JSON.parse(readFileSync(`${root}vendor/conformance.json`, 'utf8'));
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

let passed = 0;
const failed = [];
for (const c of cases.cases) {
	let actual;
	try {
		const out = engine.renderToSVG(c.spec);
		if (!out.ok) throw new Error(engine.specErrorMessage(out.error));
		actual = sha256(out.value.svg);
	} catch (error) {
		actual = `error: ${error.message}`;
	}
	if (actual === c.sha256) passed++;
	else failed.push({ name: c.name, expected: c.sha256, actual });
}
console.log(`conformance ${cases.version} (dist): ${passed} passed, ${failed.length} failed`);
for (const f of failed) console.log(`  ${f.name}: expected ${f.expected}, got ${f.actual}`);
process.exit(failed.length === 0 && engine.version === cases.version ? 0 : 1);

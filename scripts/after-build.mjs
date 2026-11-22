// After `n8n-node build` (which empties dist): the bundled engine beside the compiled node.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const from = `${root}nodes/Silverpoint/engine/silverpoint-engine.js`;
if (!existsSync(from)) throw new Error('after-build: run scripts/bundle-engine.mjs first');
mkdirSync(`${root}dist/nodes/Silverpoint/engine`, { recursive: true });
copyFileSync(from, `${root}dist/nodes/Silverpoint/engine/silverpoint-engine.js`);
console.log('after-build: engine copied into dist/nodes/Silverpoint/engine/');

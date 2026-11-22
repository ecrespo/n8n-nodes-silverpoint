// N8N-REQ-010, N8N-REQ-011, N8N-Art. 1 (N8N-T-02): the built package requires nothing outside itself
// and n8n-workflow, declares no dependencies, and the conformance kit passes against dist.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { builtinModules } from 'node:module';
import { describe, expect, test } from 'vitest';
const walk = (dir) =>
	readdirSync(dir).flatMap((n) =>
		statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)],
	);
const built = existsSync('dist/nodes/Silverpoint/Silverpoint.node.js');
describe.runIf(built)('dist', () => {
	test('N8N-Art. 1 · no run-time dependencies', () => {
		const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
		expect(pkg.dependencies).toBeUndefined();
		expect(Object.keys(pkg.peerDependencies)).toEqual(['n8n-workflow']);
	});
	test('N8N-REQ-010 · every require is relative, a Node built-in or n8n-workflow', () => {
		const outside = [];
		for (const file of walk('dist').filter((f) => f.endsWith('.js'))) {
			for (const m of readFileSync(file, 'utf8').matchAll(/require\((["'])([^"']+)\1\)/g)) {
				const id = m[2];
				if (
					id.startsWith('.') ||
					id === 'n8n-workflow' ||
					builtinModules.includes(id.replace(/^node:/, ''))
				)
					continue;
				outside.push(`${file}: ${id}`);
			}
		}
		expect(outside).toEqual([]);
	});
	test("N8N-REQ-010 · the package passes n8n's community-package scanner (its local scan)", () => {
		// Without vitest's NODE_ENV=test: eslint-plugin-n8n-nodes-base reads it as its own test mode
		// and then takes every file for a node file.
		const env = { ...process.env };
		delete env.NODE_ENV;
		let out;
		try {
			out = execFileSync('npm', ['run', '--silent', 'scan'], {
				encoding: 'utf8',
				stdio: 'pipe',
				env,
			});
		} catch (error) {
			out = `${error.stdout}${error.stderr}`;
		}
		expect(out).not.toMatch(/violations|problems?\b|error/i);
		expect(out).toMatch(/passed|no issues|✅/i);
	}, 120_000);
	test('N8N-REQ-011 · the conformance kit passes against the engine as loaded from dist', () => {
		const out = execFileSync('node', ['scripts/conformance.mjs'], { encoding: 'utf8' });
		expect(out).toMatch(/76 passed, 0 failed/);
	});
});

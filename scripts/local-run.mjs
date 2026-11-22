// N8N-T-08: the built package in a real n8n, without a server or a database to keep. `npm pack`s the
// package, installs it into a throw-away n8n home (as Settings → Community Nodes would), imports
// examples/local-run.workflow.json, runs it with `n8n execute` in the official image and prints each
// Silverpoint node's output (long markup shortened). Needs Docker; run `npm run build` first.
//   node scripts/local-run.mjs [--image docker.n8n.io/n8nio/n8n:stable] [--workflow examples/demo.workflow.json]
import { execFileSync } from 'node:child_process';
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const image = args.includes('--image')
	? args[args.indexOf('--image') + 1]
	: 'docker.n8n.io/n8nio/n8n:stable';
const workflowFile = args.includes('--workflow')
	? args[args.indexOf('--workflow') + 1]
	: 'examples/local-run.workflow.json';
// `n8n import:workflow` takes one workflow or an array of them; the first is the one run.
const workflow = [JSON.parse(readFileSync(join(ROOT, workflowFile), 'utf8'))].flat()[0];
const workflowId = workflow.id;
const work = mkdtempSync(join(tmpdir(), 'sp-n8n-'));
const home = join(work, 'home');
const pkgDir = join(home, 'nodes/node_modules/n8n-nodes-silverpoint');

try {
	mkdirSync(pkgDir, { recursive: true });
	execFileSync('npm', ['pack', '--silent', '--pack-destination', work], {
		cwd: ROOT,
		stdio: ['ignore', 'ignore', 'inherit'],
	});
	const tgz = readdirSync(work).find((f) => f.endsWith('.tgz'));
	execFileSync('tar', ['-xzf', join(work, tgz), '-C', pkgDir, '--strip-components=1']);
	writeFileSync(
		join(home, 'nodes/package.json'),
		JSON.stringify({
			name: 'installed-nodes',
			private: true,
			dependencies: { 'n8n-nodes-silverpoint': '*' },
		}),
	);
	copyFileSync(join(ROOT, workflowFile), join(work, 'wf.json'));
	const { uid, gid } = userInfo();
	const stdout = execFileSync(
		'docker',
		[
			'run',
			'--rm',
			'-u',
			`${uid}:${gid}`,
			'-v',
			`${home}:/home/node/.n8n`,
			'-v',
			`${join(work, 'wf.json')}:/wf.json:ro`,
			'-e',
			'N8N_DIAGNOSTICS_ENABLED=false',
			'--entrypoint',
			'sh',
			image,
			'-c',
			`n8n import:workflow --input=/wf.json >/dev/null 2>&1 && n8n execute --id=${workflowId} --rawOutput`,
		],
		{ encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
	);
	// n8n prints log lines before the JSON; the run is the first line that opens an object.
	const run = JSON.parse(stdout.slice(stdout.search(/^\{/m)));
	const result = run.data.resultData;
	console.log(`n8n run: ${run.status}${result.error ? ` — ${result.error.message}` : ''}`);
	let failed = run.status !== 'success';
	for (const [name, runs] of Object.entries(result.runData)) {
		const node = workflow.nodes.find((n) => n.name === name);
		if (node?.type !== 'n8n-nodes-silverpoint.silverpoint') continue;
		const [first] = runs;
		console.log(`\n## ${name} (${first.executionStatus})`);
		if (first.error) failed = true;
		for (const item of first.data?.main?.[0] ?? []) {
			const json = { ...item.json };
			for (const key of ['svg', 'html'])
				if (typeof json[key] === 'string')
					json[key] = `${json[key].slice(0, 40)}… (${json[key].length} chars)`;
			const binary =
				item.binary &&
				Object.fromEntries(
					Object.entries(item.binary).map(([k, v]) => [
						k,
						{ fileName: v.fileName, mimeType: v.mimeType, fileSize: v.fileSize },
					]),
				);
			console.log(
				JSON.stringify({ json, ...(binary ? { binary } : {}), pairedItem: item.pairedItem }),
			);
		}
	}
	process.exitCode = failed ? 1 : 0;
} finally {
	if (args.includes('--keep')) console.log(`\nkept ${work}`);
	else rmSync(work, { recursive: true, force: true });
}

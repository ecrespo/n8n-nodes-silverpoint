// N8N-REQ-001, N8N-REQ-002, N8N-REQ-004 (N8N-T-03): parameters generated from the pinned host catalog.
// Tests are .mjs so that n8n's strict lint (which covers every .ts file) applies to the node alone.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
	appearanceProperties,
	CHART_PARAMS,
	chartProperties,
} from '../nodes/Silverpoint/properties.generated';
const catalog = JSON.parse(readFileSync('vendor/host-catalog.json', 'utf8'));
const bindable = catalog.charts.filter((c) => c.binding !== 'none');
describe('generated properties', () => {
	test('N8N-REQ-001 · the Chart parameter lists every bindable chart, grouped by family, with its summary', () => {
		const chart = chartProperties.find((p) => p.name === 'chart');
		const options = chart.options;
		expect(options.map((o) => o.value).sort()).toEqual(bindable.map((c) => c.slug).sort());
		const names = options.map((o) => o.name);
		expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
		const line = options.find((o) => o.value === 'line-chart');
		expect(line.name).toMatch(/^Lines: Line Chart$/);
		expect(line.description).toBe(
			catalog.charts.find((c) => c.slug === 'line-chart').summary.replace(/\.$/, ''),
		);
	});
	test('N8N-REQ-002 · one field-name parameter per role, required marked, shown for its chart only', () => {
		for (const chart of bindable) {
			const plan = CHART_PARAMS[chart.slug];
			expect(plan.roles.map((r) => r.id)).toEqual(chart.roles.map((r) => r.id));
			for (const role of plan.roles) {
				const prop = chartProperties.find((p) => p.name === role.param);
				expect(prop.type).toBe('string');
				expect(prop.required ?? false).toBe(role.required);
				expect(prop.displayOptions?.show?.chart).toEqual([chart.slug]);
			}
		}
	});
	test('N8N-REQ-002 · the chart options are typed parameters in a collection for that chart', () => {
		const plan = CHART_PARAMS['line-chart'];
		const collection = chartProperties.find((p) => p.name === plan.optionsParam);
		expect(collection.type).toBe('collection');
		const curve = collection.options.find((o) => o.name === 'curve');
		expect(curve.type).toBe('options');
		expect(curve.options.map((o) => o.value).sort()).toEqual([
			'linear',
			'monotone',
			'natural',
			'step',
		]);
		const connect = collection.options.find((o) => o.name === 'connectNulls');
		expect(connect.type).toBe('boolean');
	});
	test('N8N-REQ-004 · appearance from the catalog: substrate filtered by ground', () => {
		const ground = appearanceProperties.find((p) => p.name === 'ground');
		expect(ground.options.map((o) => o.value)).toEqual(
			catalog.appearance.grounds.map((g) => g.name),
		);
		for (const g of catalog.appearance.grounds) {
			const substrate = appearanceProperties.find(
				(p) => p.name === 'substrate' && p.displayOptions?.show?.ground?.[0] === g.name,
			);
			expect(substrate.options.map((o) => o.value).sort()).toEqual(
				g.substrates.map((s) => s.name).sort(),
			);
		}
	});
	test('H-3 · the generated file is current', () => {
		expect(() =>
			execFileSync('node', ['scripts/make-properties.mjs', '--check'], { stdio: 'pipe' }),
		).not.toThrow();
	});
});

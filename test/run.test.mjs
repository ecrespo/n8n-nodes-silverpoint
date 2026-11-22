// N8N-REQ-003, -005, -006, -007, -008 (N8N-T-04..07): rows, outputs, errors and diagnostics.
import { describe, expect, test } from 'vitest';
import { engine } from '../nodes/Silverpoint/engine';
import { chartFor, outputFor, rowsFor } from '../nodes/Silverpoint/run';
const items = [
	{ json: { team: 'A', wins: 12, extra: 1 } },
	{ json: { team: 'B', wins: 9, extra: 2 } },
];
const base = {
	chart: 'bar-chart',
	roles: { x: 'team', value: 'wins' },
	options: { title: 'Wins' },
	appearance: {},
	size: {},
};
describe('rows', () => {
	test("N8N-REQ-003 · rows from items: every input item's JSON is one row", () => {
		expect(rowsFor(items, { source: 'items' })).toEqual([[items[0].json, items[1].json]]);
	});
	test('N8N-REQ-003 · rows from a field: one chart per item', () => {
		const nested = [{ json: { rows: [{ a: 1 }] } }, { json: { rows: [{ a: 2 }, { a: 3 }] } }];
		expect(rowsFor(nested, { source: 'field', field: 'rows' })).toEqual([
			[{ a: 1 }],
			[{ a: 2 }, { a: 3 }],
		]);
	});
	test('N8N-REQ-003 · a field that is not an array of objects is an error naming it', () => {
		expect(() => rowsFor([{ json: { rows: 3 } }], { source: 'field', field: 'rows' })).toThrow(
			/rows/,
		);
	});
});
describe('spec', () => {
	test('binds through specFromTable: only mapped columns travel', () => {
		const spec = chartFor(engine, [items[0].json, items[1].json], base);
		expect(spec).toEqual({
			chart: 'bar-chart',
			data: [
				{ team: 'A', wins: 12 },
				{ team: 'B', wins: 9 },
			],
			props: { title: 'Wins', xKey: 'team', valueKey: 'wins' },
		});
	});
	test('a multiple role takes comma-separated field names', () => {
		const rows = [
			{ m: 'A', mass: 9, price: 800 },
			{ m: 'B', mass: 11, price: 650 },
		];
		const spec = chartFor(engine, rows, {
			...base,
			chart: 'parallel-coordinates-chart',
			roles: { label: 'm', dimensions: 'mass, price' },
			options: {},
		});
		expect(spec.props).toMatchObject({ dimensions: ['mass', 'price'] });
	});
	test("N8N-REQ-007 · a missing role or column is an error with the SpecError's message", () => {
		expect(() =>
			chartFor(engine, [items[0].json], { ...base, roles: { x: 'team', value: 'losses' } }),
		).toThrow(/bar-chart: the table has no column "losses"/);
		expect(() => chartFor(engine, [items[0].json], { ...base, roles: { x: 'team' } })).toThrow(
			/value/,
		);
	});
});
describe('outputs', () => {
	const spec = chartFor(engine, [items[0].json, items[1].json], {
		...base,
		size: { width: 480 },
		id: 'wins',
	});
	test('N8N-REQ-005 · SVG: the bytes of renderToSVG, a file named from the id, text on request', () => {
		const out = outputFor(engine, spec, { output: 'svg', alsoAsText: true, embedFonts: false });
		const direct = engine.renderToSVG(spec, {});
		expect(direct.ok && out.text).toBe(direct.ok ? direct.value.svg : void 0);
		expect(out.fileName).toBe('wins.svg');
		expect(out.mimeType).toBe('image/svg+xml');
		expect(out.json.svg).toBe(out.text);
	});
	test('N8N-REQ-005 · Embed fonts maps to embedFonts', () => {
		const plain = outputFor(engine, spec, { output: 'svg', alsoAsText: false, embedFonts: false });
		const fonts = outputFor(engine, spec, { output: 'svg', alsoAsText: false, embedFonts: true });
		expect(fonts.text.length).toBeGreaterThan(plain.text.length + 1e4);
		expect(fonts.text).toContain('@font-face');
		expect(plain.json.svg).toBeUndefined();
	});
	test('N8N-REQ-006 · HTML: the static document; Interactive HTML: the script inlined', () => {
		const html = outputFor(engine, spec, { output: 'html', alsoAsText: false, embedFonts: false });
		expect(html.json.html).toMatch(/^<!doctype html>/);
		expect(html.json.html).toContain('class="sp-embed"');
		expect(html.json.html).not.toContain('data-sp-embed');
		const live = outputFor(engine, spec, {
			output: 'interactiveHtml',
			alsoAsText: false,
			embedFonts: false,
		});
		expect(live.json.html).toContain('<div data-sp-embed><script type="application/json">');
		expect(live.json.html.length).toBeGreaterThan(4e5);
		expect(live.json.html.endsWith('<\/script></body></html>')).toBe(true);
		expect(live.json.html).not.toMatch(/<script src="https?:/);
	});
	test("N8N-REQ-008 · every warning diagnostic goes into the item's JSON", () => {
		const stub = {
			...engine,
			renderToSVG: () => ({
				ok: true,
				value: { svg: '<svg/>' },
				diagnostics: [{ code: 'SP001', severity: 'warn', message: 'm' }],
			}),
		};
		const out = outputFor(stub, spec, { output: 'svg', alsoAsText: false, embedFonts: false });
		expect(out.json.diagnostics).toEqual([{ code: 'SP001', severity: 'warn', message: 'm' }]);
	});
});

// N8N-REQ-005..009 (N8N-T-05..08): the node's execute(), as n8n calls it, with Continue On Fail.
import { describe, expect, test } from 'vitest';
import { Silverpoint } from '../nodes/Silverpoint/Silverpoint.node';
function context(items, params, continueOnFail = false) {
	return {
		getInputData: () => items,
		getNodeParameter: (name, _i, fallback) => (name in params ? params[name] : fallback),
		continueOnFail: () => continueOnFail,
		getNode: () => ({
			name: 'Silverpoint',
			type: 'n8n-nodes-silverpoint.silverpoint',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			id: 'n',
		}),
		helpers: {
			prepareBinaryData: async (data, fileName, mimeType) => ({
				data: data.toString('base64'),
				fileName,
				mimeType,
				fileSize: String(data.length),
			}),
		},
	};
}
const items = [{ json: { team: 'A', wins: 12 } }, { json: { team: 'B', wins: 9 } }];
const params = {
	chart: 'bar-chart',
	source: 'items',
	barChartX: 'team',
	barChartValue: 'wins',
	barChartOptions: { title: 'Wins' },
	ground: 'silverpoint',
	substrate: 'cream',
	appearance: {},
	size: {},
	output: 'svg',
	binaryPropertyName: 'chart',
	alsoAsText: false,
	embedFonts: false,
	chartId: 'wins',
};
describe('execute', () => {
	const node = new Silverpoint();
	test('N8N-REQ-009 · usable as a tool, the description telling a model what to pass', () => {
		expect(node.description.usableAsTool).toBe(true);
		expect(node.description.description).toMatch(/rows/i);
	});
	test('N8N-REQ-005 · rows from items \u2192 one item with the SVG as a binary property', async () => {
		const [out] = await node.execute.call(context(items, params));
		expect(out).toHaveLength(1);
		const binary = out[0].binary.chart;
		expect(binary.mimeType).toBe('image/svg+xml');
		expect(binary.fileName).toBe('wins.svg');
		expect(Buffer.from(binary.data, 'base64').toString('utf8')).toMatch(/^<svg/);
		expect(out[0].pairedItem).toEqual([{ item: 0 }, { item: 1 }]);
		expect(out[0].json.chart).toBe('bar-chart');
	});
	test('N8N-REQ-003 · rows from a field \u2192 one chart per item', async () => {
		const nested = [
			{ json: { rows: items.map((i) => i.json) } },
			{ json: { rows: [items[0].json] } },
		];
		const [out] = await node.execute.call(
			context(nested, { ...params, source: 'field', field: 'rows', output: 'html' }),
		);
		expect(out).toHaveLength(2);
		expect(out[1].json.html).toMatch(/^<!doctype html>/);
		expect(out[1].pairedItem).toEqual({ item: 1 });
	});
	test('N8N-REQ-007 · an error is a NodeOperationError with the item index', async () => {
		const nested = [
			{ json: { rows: items.map((i) => i.json) } },
			{ json: { rows: [{ team: 'C' }] } },
		];
		await expect(
			node.execute.call(context(nested, { ...params, source: 'field', field: 'rows' })),
		).rejects.toMatchObject({
			name: 'NodeOperationError',
			message: "The rows have no field 'wins', set in 'Value Field'",
			description: expect.stringMatching(/'Value Field'/),
			context: { itemIndex: 1 },
		});
	});
	test('N8N-REQ-003 · a field without rows names the item it is in, not the first', async () => {
		const nested = [{ json: { rows: items.map((i) => i.json) } }, { json: { rows: 3 } }];
		await expect(
			node.execute.call(context(nested, { ...params, source: 'field', field: 'rows' })),
		).rejects.toMatchObject({
			message: "The field 'rows' does not hold an array of objects",
			context: { itemIndex: 1 },
		});
	});
	test('N8N-REQ-007 · a chart the list does not offer points back to the list', async () => {
		await expect(
			node.execute.call(context(items, { ...params, chart: 'nope' })),
		).rejects.toMatchObject({
			message: "'nope' is not a chart this node can draw",
			description: expect.stringMatching(/'Chart'/),
		});
	});
	test("N8N-REQ-007 · Continue On Fail emits the error as the item's JSON", async () => {
		const nested = [
			{ json: { rows: [{ team: 'C' }] } },
			{ json: { rows: items.map((i) => i.json) } },
		];
		const [out] = await node.execute.call(
			context(nested, { ...params, source: 'field', field: 'rows' }, true),
		);
		expect(out).toHaveLength(2);
		expect(out[0].json.error).toBe("The rows have no field 'wins', set in 'Value Field'");
		expect(out[1].binary?.chart).toBeDefined();
	});
	test('N8N-REQ-007 · Continue On Fail with rows from items pairs the error with every item', async () => {
		const [out] = await node.execute.call(
			context(items, { ...params, barChartValue: 'losses' }, true),
		);
		expect(out).toHaveLength(1);
		expect(out[0].json.error).toBe("The rows have no field 'losses', set in 'Value Field'");
		expect(out[0].pairedItem).toEqual([{ item: 0 }, { item: 1 }]);
	});
});

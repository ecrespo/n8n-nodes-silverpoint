// N8N-REQ-007 (N8N-T-10): a failed binding or render, told as n8n's UX guidelines ask — what happened,
// naming the parameter by its display name, and a description of what to change (n8n itself adds
// "[item N]" from the error's itemIndex, so the message carries no item number); never the words error, problem, failure or mistake.
import { describe, expect, test } from 'vitest';
import { ChartFailure, explain, RowsFailure } from '../nodes/Silverpoint/messages';
const ctx = {
	chart: 'bar-chart',
	roles: { x: 'team', value: 'losses' },
	source: 'items',
	rowCount: 2,
};
const role = (missing, unknownColumns) =>
	new ChartFailure({ kind: 'role', missing, unknownColumns }, 'engine message');
const BANNED = /error|problem|failure|mistake/i;
const check = (out) => {
	expect(out.message).not.toMatch(BANNED);
	expect(out.description).not.toMatch(BANNED);
	return out;
};
describe('explain', () => {
	test('N8N-REQ-007 · an unknown column names the field and the parameter that set it', () => {
		const out = check(explain(role([], ['losses']), ctx));
		expect(out.message).toBe("The rows have no field 'losses', set in 'Value Field'");
		expect(out.description).toMatch(/'Value Field'/);
		expect(out.description).toMatch(/case-sensitive/);
	});
	test('N8N-REQ-007 · several unknown columns, several parameters', () => {
		const out = check(
			explain(role([], ['team', 'losses']), { ...ctx, roles: { x: 'team', value: 'losses' } }),
		);
		expect(out.message).toBe(
			"The rows have no fields 'team', 'losses', set in 'X Field', 'Value Field'",
		);
	});
	test('N8N-REQ-007 · one chart per item: no item number in the message (n8n adds it)', () => {
		const out = check(explain(role([], ['losses']), { ...ctx, source: 'field' }));
		expect(out.message).toBe("The rows have no field 'losses', set in 'Value Field'");
		expect(out.message).not.toMatch(/\[item/i);
	});
	test('N8N-REQ-007 · a missing role names its parameter', () => {
		const out = check(explain(role(['value'], []), { ...ctx, roles: { x: 'team' } }));
		expect(out.message).toBe("No field is set in 'Value Field'");
		expect(out.description).toMatch(/'Value Field'/);
	});
	test('N8N-REQ-007 · no rows at all', () => {
		const out = check(
			explain(role([], ['team', 'losses']), { ...ctx, source: 'field', rowCount: 0 }),
		);
		expect(out.message).toBe('There are no rows to draw');
		expect(out.description).toMatch(/'Field'/);
	});
	test('N8N-REQ-007 · an option the chart does not declare', () => {
		const out = check(
			explain(new ChartFailure({ kind: 'prop', props: ['curve'] }, 'm'), {
				...ctx,
				roles: { x: 'team', value: 'wins' },
			}),
		);
		expect(out.message).toBe("The Bar Chart has no option 'curve'");
		expect(out.description).toMatch(/'Options'/);
	});
	test('N8N-REQ-007 · a size out of range, with the range', () => {
		const out = check(
			explain(
				new ChartFailure({ kind: 'size', width: 100 }, 'width 100 is outside 160..1600.'),
				ctx,
			),
		);
		expect(out.message).toBe("'Width' must be between 160 and 1600 pixels, not 100");
		expect(out.description).toMatch(/'Size'/);
	});
	test('N8N-REQ-007 · an unknown chart, with the suggestion by its name in the list', () => {
		const out = check(
			explain(
				new ChartFailure({ kind: 'chart', chart: 'gauge-chart', suggestions: ['gauge-arc'] }, 'm'),
				{ ...ctx, chart: 'gauge-chart' },
			),
		);
		expect(out.message).toBe("'gauge-chart' is not a chart this node can draw");
		expect(out.description).toMatch(/'Chart'.*Gauge Arc/);
	});
	test('N8N-REQ-003 · a field without an array of rows', () => {
		const out = check(
			explain(new RowsFailure('data.rows'), { ...ctx, source: 'field' }),
		);
		expect(out.message).toBe("The field 'data.rows' does not hold an array of objects");
		expect(out.description).toMatch(/'Field'/);
	});
	test('N8N-REQ-007 · any other engine message is kept, with a description', () => {
		const out = check(
			explain(new ChartFailure({ kind: 'shape', message: 'x' }, 'values must be numbers.'), ctx),
		);
		expect(out.message).toBe(
			'The Bar Chart cannot be drawn from these rows: values must be numbers',
		);
		expect(out.description).toMatch(/'Options'/);
	});
	test('a foreign exception keeps its message', () => {
		expect(explain(new Error('boom'), ctx)).toEqual({ message: 'boom' });
	});
});

// N8N-REQ-001, N8N-REQ-002 (N8N-T-10): the generated parameters read as n8n's UX guidelines ask —
// no code jargon (backticks, prop names, ∝), parameter names in single quotes, US spelling, boolean
// descriptions as "Whether …".
import { describe, expect, test } from 'vitest';
import { Silverpoint } from '../nodes/Silverpoint/Silverpoint.node';
import {
	appearanceProperties,
	CHART_PARAMS,
	chartProperties,
} from '../nodes/Silverpoint/properties.generated';
const walk = (props) =>
	props.flatMap((p) => [p, ...(Array.isArray(p.options) ? walk(p.options) : [])]);
const all = walk([...new Silverpoint().description.properties, ...appearanceProperties]);
const texts = all.flatMap((p) => [p.displayName, p.name, p.description].filter(Boolean));
const descriptions = all.map((p) => p.description).filter(Boolean);
const chartOption = (slug) => chartProperties[0].options.find((o) => o.value === slug);
const option = (slug, name) =>
	chartProperties
		.find((p) => p.name === CHART_PARAMS[slug].optionsParam)
		.options.find((o) => o.name === name);
describe('copy (n8n UX guidelines)', () => {
	test('N8N-REQ-001 · no code jargon in any description', () => {
		for (const d of descriptions) {
			expect(d).not.toMatch(/`|∝|onRootChange|host catalog|Whether:|Whether to use /);
		}
	});
	test('N8N-REQ-001 · US spelling', () => {
		for (const t of texts) expect(t).not.toMatch(/centre|centred|normalis|labell|colour/i);
	});
	test('N8N-REQ-001 · a prop named in a summary is the parameter that sets it, in single quotes', () => {
		expect(chartOption('bubble-chart').description).toBe("Circles whose area encodes 'Size Field'");
		expect(chartOption('heatmap-chart').description).toBe(
			"Labeled rows of values, normalized against 'Scale Max'",
		);
		expect(chartOption('sunburst-chart').description).toBe('A hierarchy as rings of arcs');
		expect(chartOption('coxcomb-chart').description).toBe(
			'Equal angles, sector area proportional to value',
		);
	});
	test('N8N-REQ-002 · boolean options read "Whether to …", the default in words', () => {
		expect(option('diverging-bar-chart', 'percent').description).toBe(
			'Whether to normalize each row to 100 %; on by default',
		);
		for (const p of all.filter((x) => x.type === 'boolean')) {
			expect(p.description).toMatch(/^Whether /);
		}
	});
	test('N8N-REQ-002 · the frame option is named for what it does', () => {
		const frame = option('bar-chart', 'chrome');
		expect(frame.displayName).toBe('Frame');
	});
	test('N8N-REQ-005 · a field named in a description is in single quotes', () => {
		const alsoAsText = all.find((p) => p.name === 'alsoAsText');
		expect(alsoAsText.description).toBe(
			"Whether to also put the SVG markup in the JSON field 'svg'",
		);
	});
});

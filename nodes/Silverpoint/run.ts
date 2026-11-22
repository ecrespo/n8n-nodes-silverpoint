// What the node does with one table (N8N-REQ-003, -005, -006, -007, -008), free of n8n's context so
// it can be tested alone. N8N-Art. 2: it reads only its arguments and returns its output.
import type { ChartSpec, Diagnostic, Engine } from './engine';

export interface ChartParams {
	readonly chart: string;
	readonly roles: Readonly<Record<string, string>>;
	readonly options: Readonly<Record<string, unknown>>;
	readonly appearance: Readonly<Record<string, string>>;
	readonly size: { readonly width?: number; readonly height?: number };
	readonly id?: string;
	readonly multiple?: ReadonlySet<string>;
}

export interface OutputParams {
	readonly output: 'svg' | 'html' | 'interactiveHtml';
	readonly alsoAsText: boolean;
	readonly embedFonts: boolean;
}

export interface ChartOutput {
	readonly json: {
		chart: string;
		id?: string;
		svg?: string;
		html?: string;
		diagnostics: Diagnostic[];
	};
	readonly text: string;
	readonly fileName: string;
	readonly mimeType: string;
}

type Row = Record<string, unknown>;
const isRow = (value: unknown): value is Row =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** The tables to draw: all items' JSON as one table, or the array at `field` of each item. */
export function rowsFor(
	items: readonly { readonly json: Row }[],
	source: { readonly source: 'items' | 'field'; readonly field?: string },
): Row[][] {
	if (source.source === 'items') return [items.map((item) => item.json)];
	const field = source.field ?? '';
	return items.map((item, index) => {
		const value = field
			.split('.')
			.reduce<unknown>((at, key) => (isRow(at) ? at[key] : undefined), item.json);
		if (!Array.isArray(value) || !value.every(isRow)) {
			throw new Error(
				`Item ${index}: the field "${field}" must hold an array of objects (one per row).`,
			);
		}
		return value;
	});
}

const fieldList = (text: string): string[] =>
	text
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

/** The ChartSpec binding the table, through the engine's specFromTable; an Error with its message. */
export function chartFor(engine: Engine, rows: readonly Row[], params: ChartParams): ChartSpec {
	const roles: Record<string, string | string[]> = {};
	for (const [id, value] of Object.entries(params.roles)) {
		if (typeof value !== 'string' || value.trim() === '') continue;
		const fields = fieldList(value);
		roles[id] = fields.length > 1 || params.multiple?.has(id) ? fields : fields[0];
	}
	const size: { width?: number; height?: number } = {};
	if (params.size.width) size.width = params.size.width;
	if (params.size.height) size.height = params.size.height;
	const result = engine.specFromTable({
		chart: params.chart,
		table: { rows },
		roles,
		options: params.options,
		appearance: params.appearance,
		size,
		...(params.id ? { id: params.id } : {}),
	});
	if (!result.ok) throw new Error(`${params.chart}: ${engine.specErrorMessage(result.error)}`);
	return result.value;
}

/** The chart as SVG (binary, and text on request) or as an HTML document, with its diagnostics. */
export function outputFor(engine: Engine, spec: ChartSpec, params: OutputParams): ChartOutput {
	const id = typeof spec.id === 'string' ? spec.id : undefined;
	const base = { chart: spec.chart, ...(id ? { id } : {}) };
	if (params.output === 'svg') {
		const result = engine.renderToSVG(spec, params.embedFonts ? { embedFonts: true } : {});
		if (!result.ok) throw new Error(`${spec.chart}: ${engine.specErrorMessage(result.error)}`);
		const svg = result.value.svg;
		return {
			json: {
				...base,
				...(params.alsoAsText ? { svg } : {}),
				diagnostics: [...result.diagnostics],
			},
			text: svg,
			fileName: `${id ?? spec.chart}.svg`,
			mimeType: 'image/svg+xml',
		};
	}
	const interactive = params.output === 'interactiveHtml';
	const result = engine.renderToHTML(spec, {
		...(interactive ? { interactive: true, script: { inline: engine.STANDALONE_SCRIPT } } : {}),
		...(params.embedFonts ? { embedFonts: true } : {}),
	});
	if (!result.ok) throw new Error(`${spec.chart}: ${engine.specErrorMessage(result.error)}`);
	const html = result.value.html;
	return {
		json: { ...base, html, diagnostics: [...result.diagnostics] },
		text: html,
		fileName: `${id ?? spec.chart}.html`,
		mimeType: 'text/html',
	};
}

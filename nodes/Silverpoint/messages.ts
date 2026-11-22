// N8N-REQ-007: a failed binding or render told as n8n's UX guidelines ask — what happened, naming the
// parameter by its display name, and a description of what to change. No item number: n8n appends
// "[item N]" itself from the NodeOperationError's itemIndex. N8N-Art. 2: it reads only its arguments and the generated parameters.
import type { SpecError } from './engine';
import { CHART_PARAMS, chartProperties } from './properties.generated';

/** The engine refused the binding or the render; `specError` is its SpecError. */
export class ChartFailure extends Error {
	constructor(
		readonly specError: SpecError,
		message: string,
	) {
		super(message);
		this.name = 'ChartFailure';
	}
}

/** The field chosen under Rows does not hold an array of objects. */
export class RowsFailure extends Error {
	constructor(readonly field: string) {
		super(`the field "${field}" must hold an array of objects (one per row).`);
		this.name = 'RowsFailure';
	}
}

/** A chart the node's parameters do not list (set by an expression). */
export const unknownChart = (chart: string, catalog: string) =>
	new ChartFailure(
		{ kind: 'chart', chart, suggestions: [] },
		`${chart}: not in host catalog ${catalog}.`,
	);

export interface ExplainContext {
	readonly chart: string;
	readonly roles: Readonly<Record<string, string>>;
	readonly source: 'items' | 'field';
	readonly rowCount: number;
}

export interface Explained {
	readonly message: string;
	readonly description?: string;
}

const quoted = (names: readonly string[]) => names.map((n) => `'${n}'`).join(', ');
const plain = (text: string) => text.trim().replace(/\.$/, '');
const chartOptions = (chartProperties[0]?.options ?? []) as ReadonlyArray<{
	name: string;
	value: string;
}>;
const chartTitle = (slug: string) => {
	const name = chartOptions.find((o) => o.value === slug)?.name;
	return name ? name.replace(/^[^:]*:\s*/, '') : slug;
};
const displayName = (param: string) =>
	chartProperties.find((p) => p.name === param)?.displayName ?? param;
const optionName = (chart: string, option: string) => {
	const plan = CHART_PARAMS[chart];
	const collection = plan && chartProperties.find((p) => p.name === plan.optionsParam);
	const options = (collection?.options ?? []) as ReadonlyArray<{
		name: string;
		displayName?: string;
	}>;
	return options.find((o) => o.name === option)?.displayName ?? option;
};
const fieldsOf = (value: string) =>
	value
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

function explainRole(error: SpecError, ctx: ExplainContext): Explained {
	const plan = CHART_PARAMS[ctx.chart];
	const roleParam = (id: string) => displayName(plan?.roles.find((r) => r.id === id)?.param ?? id);
	const missing = (error.missing as string[] | undefined) ?? [];
	const unknown = (error.unknownColumns as string[] | undefined) ?? [];
	if (missing.length === 0 && ctx.rowCount === 0) {
		return {
			message: 'There are no rows to draw',
			description:
				ctx.source === 'field'
					? "The array in the field named under 'Field' is empty; check the previous node's output."
					: "The node received no items; check the previous node's output.",
		};
	}
	const messages: string[] = [];
	const descriptions: string[] = [];
	if (missing.length > 0) {
		const params = missing.map(roleParam);
		messages.push(`No field is set in ${quoted(params)}`);
		descriptions.push(
			`Enter in ${quoted(params)} the name of the input field that holds ${missing.length > 1 ? 'those values' : 'that value'}.`,
		);
	}
	if (unknown.length > 0) {
		const params = [
			...new Set(
				Object.entries(ctx.roles)
					.filter(([, value]) => fieldsOf(value ?? '').some((f) => unknown.includes(f)))
					.map(([id]) => roleParam(id)),
			),
		];
		const where = params.length > 0 ? `, set in ${quoted(params)}` : '';
		messages.push(
			`The rows have no field${unknown.length > 1 ? 's' : ''} ${quoted(unknown)}${where}`,
		);
		descriptions.push(
			`Check the names in ${params.length > 0 ? quoted(params) : 'the field parameters'} against the input's field names; they are case-sensitive.`,
		);
	}
	return { message: messages.join('; '), description: descriptions.join(' ') };
}

function explainSpec(error: SpecError, engineMessage: string, ctx: ExplainContext): Explained {
	switch (error.kind) {
		case 'role':
			return explainRole(error, ctx);
		case 'chart': {
			const suggestions = ((error.suggestions as string[] | undefined) ?? []).map(
				(slug) => chartOptions.find((o) => o.value === slug)?.name ?? slug,
			);
			return {
				message: `'${String(error.chart)}' is not a chart this node can draw`,
				description: `Choose a chart from the 'Chart' list${suggestions.length > 0 ? `, such as ${quoted(suggestions)}` : ''}.`,
			};
		}
		case 'prop': {
			const props = ((error.props as string[] | undefined) ?? []).map((p) =>
				optionName(ctx.chart, p),
			);
			return {
				message: `The ${chartTitle(ctx.chart)} has no option${props.length > 1 ? 's' : ''} ${quoted(props)}`,
				description: `Remove ${quoted(props)} from 'Options'.`,
			};
		}
		case 'size': {
			const parts = [
				...engineMessage.matchAll(/(width|height) (-?[\d.]+) is outside (\d+)\.\.(\d+)/g),
			];
			const names = parts.map((m) => (m[1] === 'width' ? 'Width' : 'Height'));
			return {
				message:
					parts.length > 0
						? parts
								.map(
									(m, i) => `'${names[i]}' must be between ${m[3]} and ${m[4]} pixels, not ${m[2]}`,
								)
								.join('; ')
						: plain(engineMessage),
				description: `Change ${names.length > 0 ? quoted(names) : 'the values'} under 'Size'.`,
			};
		}
		default:
			return {
				message: `The ${chartTitle(ctx.chart)} cannot be drawn from these rows: ${plain(engineMessage)}`,
				description:
					"Check that each field set above holds the kind of value its role expects (as the parameter's description says), and the values under 'Options'.",
			};
	}
}

/** The message and description for what was thrown while drawing one chart. */
export function explain(thrown: unknown, ctx: ExplainContext): Explained {
	if (thrown instanceof ChartFailure) {
		return explainSpec(thrown.specError, thrown.message.replace(/^[\w-]+: /, ''), ctx);
	}
	if (thrown instanceof RowsFailure) {
		return {
			message: `The field '${thrown.field}' does not hold an array of objects`,
			description:
				"Set 'Field' to the name of a field holding an array of objects, one per row; use dots for nested fields (e.g. data.rows).",
		};
	}
	return { message: thrown instanceof Error ? thrown.message : String(thrown) };
}

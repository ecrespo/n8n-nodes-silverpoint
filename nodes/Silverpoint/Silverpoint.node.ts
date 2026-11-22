import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { engine } from './engine';
import {
	appearanceProperties,
	CHART_PARAMS,
	chartProperties,
	ENGINE_VERSION,
} from './properties.generated';
import { explain, unknownChart } from './messages';
import { chartFor, type OutputParams, outputFor, rowsFor } from './run';

export class Silverpoint implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Silverpoint',
		name: 'silverpoint',
		icon: { light: 'file:silverpoint.svg', dark: 'file:silverpoint.dark.svg' },
		group: ['transform'],
		version: [1],
		subtitle: '={{$parameter["chart"]}}',
		description:
			'Draw a silverpoint chart from rows as SVG or HTML. Pass rows (one object per row) and, for each role, the name of the field that holds it.',
		defaults: { name: 'Silverpoint' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		properties: [
			...chartProperties,
			{
				displayName: 'Rows',
				name: 'source',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'From Items',
						value: 'items',
						description: "Every input item's JSON is one row; one chart for all items",
					},
					{
						name: 'From a Field',
						value: 'field',
						description: 'An array of rows at a field of each item; one chart per item',
					},
				],
				default: 'items',
			},
			{
				displayName: 'Field',
				name: 'field',
				type: 'string',
				required: true,
				default: 'rows',
				placeholder: 'e.g. rows',
				description: 'The field holding the array of rows (dots for nested fields)',
				displayOptions: { show: { source: ['field'] } },
			},
			...appearanceProperties,
			{
				displayName: 'Output',
				name: 'output',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'HTML', value: 'html', description: 'A static HTML document with the chart' },
					{
						name: 'Interactive HTML',
						value: 'interactiveHtml',
						description: 'An HTML document with the script inlined: keyboard, pointer and resizing',
					},
					{ name: 'SVG', value: 'svg', description: 'An SVG file as a binary property' },
				],
				default: 'svg',
			},
			{
				displayName: 'Put Output File in Field',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				description: 'The name of the binary property to write the SVG to',
				displayOptions: { show: { output: ['svg'] } },
			},
			{
				displayName: 'Also as Text',
				name: 'alsoAsText',
				type: 'boolean',
				default: false,
				description: "Whether to also put the SVG markup in the JSON field 'svg'",
				displayOptions: { show: { output: ['svg'] } },
			},
			{
				displayName: 'Embed Fonts',
				name: 'embedFonts',
				type: 'boolean',
				default: false,
				description: 'Whether to embed EB Garamond, so the output draws the same anywhere',
			},
			{
				displayName: 'Chart ID',
				name: 'chartId',
				type: 'string',
				default: '',
				description: 'Optional ID of the chart; also names the SVG file',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const source = this.getNodeParameter('source', 0) as 'items' | 'field';
		const out: INodeExecutionData[] = [];
		// One chart for all items, or one per item; parameters are read at the chart's own item.
		const groups: { index: number; paired: number[] }[] =
			source === 'items'
				? [{ index: 0, paired: items.map((_, i) => i) }]
				: items.map((_, i) => ({ index: i, paired: [i] }));

		for (const group of groups) {
			const index = group.index;
			const pairedItem =
				source === 'items' ? group.paired.map((item) => ({ item })) : { item: index };
			let chart = '';
			const roles: Record<string, string> = {};
			let rowCount = 0;
			try {
				const field =
					source === 'field' ? (this.getNodeParameter('field', index) as string) : undefined;
				const tables = rowsFor(source === 'items' ? items : [items[index]], { source, field });
				rowCount = tables[0].length;
				chart = this.getNodeParameter('chart', index) as string;
				const plan = CHART_PARAMS[chart];
				if (!plan) throw unknownChart(chart, ENGINE_VERSION);
				for (const role of plan.roles)
					roles[role.id] = this.getNodeParameter(role.param, index, '') as string;
				const ground = this.getNodeParameter('ground', index) as string;
				const appearance = {
					ground,
					substrate: this.getNodeParameter('substrate', index) as string,
					...(this.getNodeParameter('appearance', index, {}) as Record<string, string>),
				};
				const chartId = this.getNodeParameter('chartId', index, '') as string;
				const spec = chartFor(engine, tables[0], {
					chart,
					roles,
					options: this.getNodeParameter(plan.optionsParam, index, {}) as IDataObject,
					appearance,
					size: this.getNodeParameter('size', index, {}) as { width?: number; height?: number },
					...(chartId ? { id: chartId } : {}),
					multiple: new Set(plan.roles.filter((r) => r.multiple).map((r) => r.id)),
				});
				const params: OutputParams = {
					output: this.getNodeParameter('output', index) as OutputParams['output'],
					alsoAsText: this.getNodeParameter('alsoAsText', index, false) as boolean,
					embedFonts: this.getNodeParameter('embedFonts', index, false) as boolean,
				};
				const result = outputFor(engine, spec, params);
				const item: INodeExecutionData = {
					json: result.json as unknown as IDataObject,
					pairedItem,
				};
				if (params.output === 'svg') {
					const property = this.getNodeParameter('binaryPropertyName', index, 'data') as string;
					item.binary = {
						[property]: await this.helpers.prepareBinaryData(
							Buffer.from(result.text, 'utf8'),
							result.fileName,
							result.mimeType,
						),
					};
				}
				out.push(item);
			} catch (error) {
				// N8N-REQ-007: n8n appends "[item N]" itself from itemIndex below.
				const { message, description } = explain(error, { chart, roles, source, rowCount });
				if (this.continueOnFail()) {
					out.push({ json: { error: message }, pairedItem });
					continue;
				}
				throw new NodeOperationError(this.getNode(), message, {
					itemIndex: index,
					...(description ? { description } : {}),
				});
			}
		}
		return [out];
	}
}

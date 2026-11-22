// The bundled engine (N8N-DD-01): @silverpoint/embed's DOM-free functions and the standalone script's
// text, from ./engine/silverpoint-engine.js, which scripts/bundle-engine.mjs writes at build time.

export type ChartSpec = { chart: string; [key: string]: unknown };
export interface Diagnostic {
	readonly code: string;
	readonly severity: 'warn' | 'error';
	readonly message: string;
}
export type SpecError = { readonly kind: string; readonly [key: string]: unknown };
export type SpecResult<T> =
	| { readonly ok: true; readonly value: T; readonly diagnostics: readonly Diagnostic[] }
	| { readonly ok: false; readonly error: SpecError; readonly diagnostics: readonly Diagnostic[] };

export interface TableBinding {
	readonly chart: string;
	readonly table: { readonly rows: readonly Record<string, unknown>[] };
	readonly roles: Readonly<Record<string, string | readonly string[]>>;
	readonly options?: Readonly<Record<string, unknown>>;
	readonly appearance?: Readonly<Record<string, string>>;
	readonly size?: { readonly width?: number; readonly height?: number };
	readonly id?: string;
}

export interface Engine {
	readonly version: string;
	readonly STANDALONE_SCRIPT: string;
	specFromTable(binding: TableBinding): SpecResult<ChartSpec>;
	renderToSVG(spec: ChartSpec, options?: { embedFonts?: boolean }): SpecResult<{ svg: string }>;
	renderToHTML(
		spec: ChartSpec,
		options?: {
			interactive?: boolean;
			script?: { inline: string } | 'none';
			embedFonts?: boolean;
			title?: string;
		},
	): SpecResult<{ html: string }>;
	specErrorMessage(error: SpecError): string;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const engine: Engine = require('./engine/silverpoint-engine.js');

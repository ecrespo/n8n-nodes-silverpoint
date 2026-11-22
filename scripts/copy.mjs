// N8N-REQ-001, N8N-REQ-002: the catalog's copy (written for React and the docs) rewritten for n8n's UX
// guidelines — no code jargon, a prop named by the parameter that sets it in single quotes, US
// spelling, boolean descriptions as "Whether …". Used by make-properties.mjs.

const US = [
	[/\bcentred\b/g, 'centered'],
	[/\bCentred\b/g, 'Centered'],
	[/\bcentre\b/g, 'center'],
	[/\bCentre\b/g, 'Center'],
	[/\blabelled\b/g, 'labeled'],
	[/\bLabelled\b/g, 'Labeled'],
	[/\bnormalis(e|es|ed|ing)\b/g, 'normaliz$1'],
	[/\bNormalis(e|es|ed|ing)\b/g, 'Normaliz$1'],
	[/\bcolour(s?)\b/g, 'color$1'],
	[/\bColour(s?)\b/g, 'Color$1'],
];

/** Display names the catalog's labels are replaced with: option name → display name. */
export const LABELS = { chrome: 'Frame' };

/**
 * One line of copy for a description: `name` in backticks becomes the parameter that sets it,
 * `'Size Field'` or `'Scale Max'` (see `nameOf`), a React-only clause goes, ∝ is spelled out.
 */
export function copy(text, nameOf = () => undefined) {
	let t = text
		.replace(/\s*\(REQ-\d+(?:, REQ-\d+)*\)/g, '')
		// Drilling is the React component's, through its controlled props; n8n draws one state.
		.replace(/,?\s*drillable through `rootId` and `onRootChange`/g, '')
		.replace(/\s*∝\s*/g, ' proportional to ')
		.replace(/`([^`]+)`/g, (_, name) => {
			const param = nameOf(name);
			return param ? `'${param}'` : name;
		});
	for (const [from, to] of US) t = t.replace(from, to);
	return t.trim();
}

/** A boolean's description: "Draws marks; `true` by default" → "Whether to draw marks; on by default". */
export function whether(doc, label) {
	if (!doc) {
		const l = label.toLowerCase();
		return /ed$/.test(l) ? `Whether the chart is ${l}` : `Whether to ${l}`;
	}
	if (doc.startsWith('Whether')) return doc;
	const t = doc
		.replace(/;?\s*\btrue by default\b/, '; on by default')
		.replace(/;?\s*\bfalse by default\b/, '; off by default');
	const [verb, ...rest] = t.split(' ');
	const base = verb
		.toLowerCase()
		.replace(/(ch|sh|ss|x)es$/, '$1')
		.replace(/s$/, '');
	return `Whether to ${[base, ...rest].join(' ')}`;
}

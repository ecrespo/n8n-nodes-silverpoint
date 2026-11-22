// N8N-DD-02 (H-3): writes nodes/Silverpoint/properties.generated.ts from vendor/host-catalog.json —
// the Chart list, per chart its role and option parameters, and the appearance parameters.
// `--check` fails when the checked-in file differs from a fresh generation.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const FILE = `${root}nodes/Silverpoint/properties.generated.ts`;
const catalog = JSON.parse(readFileSync(`${root}vendor/host-catalog.json`, 'utf8'));

const pascal = (s) => s.replace(/(^|[-_\s])(\w)/g, (_, __, c) => c.toUpperCase());
const camel = (s) => pascal(s).replace(/^\w/, (c) => c.toLowerCase());
const titleCase = (s) => s.replace(/(^|[\s-])(\w)/g, (m) => m.toUpperCase()).replace(/\bOf\b|\bAnd\b|\bOr\b|\bThe\b|\bA\b/g, (w, i) => (i === 0 ? w : w.toLowerCase()));
const words = (s) => titleCase(s.replace(/[_-]+/g, ' '));
const sentence = (s) => {
  const t = s.replace(/`/g, '').replace(/\s*\(REQ-\d+(?:, REQ-\d+)*\)/g, '').trim();
  return t.length === 0 ? '' : /[.!?]$/.test(t) ? t : `${t}.`;
};
const byName = (a, b) => a.name.localeCompare(b.name);
const FAMILY = (f) => words(f);

function optionProperty(option) {
  const base = { displayName: titleCase(option.label), name: option.name };
  const description = sentence(option.doc);
  if (option.kind === 'enum') {
    return {
      ...base,
      type: 'options',
      options: option.values.map((v) => ({ name: words(v), value: v })).sort(byName),
      default: option.default ?? option.values[0],
      ...(description ? { description } : {}),
    };
  }
  if (option.kind === 'boolean') return { ...base, type: 'boolean', default: option.default ?? false, ...(description ? { description: description.startsWith('Whether') ? description : `Whether: ${description}` } : { description: `Whether to use ${option.label.toLowerCase()}` }) };
  if (option.kind === 'number') return { ...base, type: 'number', default: option.default ?? 0, ...(description ? { description } : {}) };
  return { ...base, type: 'string', default: option.default ?? '', ...(description ? { description } : {}) };
}

function chartsPart() {
  const bindable = catalog.charts.filter((c) => c.binding !== 'none');
  const plan = {};
  const properties = [
    {
      displayName: 'Chart',
      name: 'chart',
      type: 'options',
      noDataExpression: true,
      options: bindable.map((c) => ({ name: `${FAMILY(c.family)}: ${titleCase(c.title)}`, value: c.slug, description: c.summary || c.title })).sort(byName),
      default: 'bar-chart',
      description: 'The silverpoint chart to draw; the list is the pinned host catalog',
    },
  ];
  for (const chart of bindable) {
    const key = camel(chart.slug);
    const roles = chart.roles.map((role) => ({ id: role.id, param: `${key}${pascal(role.id)}`, multiple: role.multiple, required: role.required }));
    plan[chart.slug] = { roles, optionsParam: `${key}Options` };
    for (const [i, role] of chart.roles.entries()) {
      const kind = `${role.kind}, ${role.dataType}`;
      properties.push({
        displayName: `${titleCase(role.label)} Field${role.multiple ? 's' : ''}`,
        name: roles[i].param,
        type: 'string',
        ...(role.required ? { required: true } : {}),
        default: '',
        placeholder: role.multiple ? 'e.g. field1, field2' : 'e.g. fieldName',
        description: `${role.multiple ? 'Comma-separated names of the fields' : 'Name of the field'} for the ${role.label.toLowerCase()} role (${kind})${role.required ? '' : '; optional'}`,
        displayOptions: { show: { chart: [chart.slug] } },
      });
    }
    const own = chart.options.map(optionProperty).sort((a, b) => a.displayName.localeCompare(b.displayName));
    const common = catalog.common.filter((o) => !chart.options.some((x) => x.name === o.name)).map(optionProperty);
    properties.push({
      displayName: 'Options',
      name: `${key}Options`,
      type: 'collection',
      placeholder: 'Add Option',
      default: {},
      displayOptions: { show: { chart: [chart.slug] } },
      options: [...own, ...common].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    });
  }
  return { plan, properties };
}

function appearancePart() {
  const { grounds, modes, palettes } = catalog.appearance;
  const properties = [
    { displayName: 'Ground', name: 'ground', type: 'options', options: grounds.map((g) => ({ name: g.label, value: g.name })), default: grounds[0].name, description: 'The paper and ink the chart is drawn on' },
  ];
  for (const ground of grounds) {
    properties.push({
      displayName: 'Substrate',
      name: 'substrate',
      type: 'options',
      options: ground.substrates.map((s) => ({ name: s.label, value: s.name })).sort(byName),
      default: ground.substrates[0].name,
      description: `The ${ground.label.toLowerCase()} ground's paper tone`,
      displayOptions: { show: { ground: [ground.name] } },
    });
  }
  properties.push({
    displayName: 'Appearance',
    name: 'appearance',
    type: 'collection',
    placeholder: 'Add Appearance Option',
    default: {},
    options: [
      { displayName: 'Mode', name: 'mode', type: 'options', options: modes.map((m) => ({ name: m.label, value: m.name })).sort(byName), default: modes[0].name, description: 'Ink, or precision for high contrast' },
      { displayName: 'Palette', name: 'palette', type: 'options', options: palettes.map((p) => ({ name: p.label, value: p.name })).sort(byName), default: palettes[0].name, description: 'The tones a series is drawn in' },
    ],
  });
  properties.push({
    displayName: 'Size',
    name: 'size',
    type: 'collection',
    placeholder: 'Add Size',
    default: {},
    options: [
      { displayName: 'Height', name: 'height', type: 'number', typeOptions: { minValue: 1 }, default: 320, description: 'Height in pixels' },
      { displayName: 'Width', name: 'width', type: 'number', typeOptions: { minValue: 1 }, default: 640, description: 'Width in pixels' },
    ],
  });
  return properties;
}

function render() {
  const { plan, properties } = chartsPart();
  const lines = [
    `// Generated by scripts/make-properties.mjs from host catalog ${catalog.version}. Do not edit (N8N-DD-02, H-3).`,
    "import type { INodeProperties } from 'n8n-workflow';",
    '',
    `export const ENGINE_VERSION = ${JSON.stringify(catalog.version)};`,
    '',
    'export interface RolePlan {',
    '\treadonly id: string;',
    '\treadonly param: string;',
    '\treadonly multiple: boolean;',
    '\treadonly required: boolean;',
    '}',
    '',
    `export const CHART_PARAMS: Readonly<Record<string, { readonly roles: readonly RolePlan[]; readonly optionsParam: string }>> = ${JSON.stringify(plan)};`,
    '',
    `export const chartProperties: INodeProperties[] = ${JSON.stringify(properties)};`,
    '',
    `export const appearanceProperties: INodeProperties[] = ${JSON.stringify(appearancePart())};`,
    '',
  ];
  return lint(prettier(lines.join('\n')));
}

const prettier = (text) => execFileSync(`${root}node_modules/.bin/prettier`, ['--stdin-filepath', FILE], { input: text, encoding: 'utf8', cwd: root });

/** n8n's own lint fixes (display names in title case, descriptions without a final period, …), so the
 * generated file passes `n8n-node lint` as written; then prettier again over what they changed. */
function lint(text) {
  let out;
  try {
    out = execFileSync(`${root}node_modules/.bin/eslint`, ['--stdin', '--stdin-filename', FILE, '--fix-dry-run', '--format', 'json'], { input: text, encoding: 'utf8', cwd: root, maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    out = error.stdout; // eslint exits 1 when problems remain; the JSON still carries the fixed output
  }
  const [result] = JSON.parse(out);
  const left = result.messages.filter((m) => m.severity === 2);
  if (left.length > 0) throw new Error(`generated properties still fail lint:\n${left.map((m) => `  ${m.line}: ${m.message} (${m.ruleId})`).join('\n')}`);
  return prettier(result.output ?? text);
}

const text = render();
if (process.argv.includes('--check')) {
  if (readFileSync(FILE, 'utf8') !== text) {
    console.log('stale: nodes/Silverpoint/properties.generated.ts — run `npm run generate`');
    process.exit(1);
  }
  console.log('properties current');
} else {
  writeFileSync(FILE, text);
  console.log(`wrote nodes/Silverpoint/properties.generated.ts (${catalog.version})`);
}

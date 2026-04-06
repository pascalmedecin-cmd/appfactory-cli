#!/usr/bin/env npx tsx
/**
 * Genere 4 pages HTML Tailwind de presentation client depuis project.yaml.
 * Usage : npx tsx scripts/generate-previews.ts [chemin/vers/project.yaml] [--output dir]
 * Par defaut : template/project.yaml, sortie dans previews/
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Parse args: [yaml-path] [--output dir]
const args = process.argv.slice(2);
const outputIdx = args.indexOf('--output');
let outputDir: string | undefined;
if (outputIdx !== -1) {
	outputDir = args[outputIdx + 1];
	args.splice(outputIdx, 2);
}

const yamlPath = args[0]
	? resolve(args[0])
	: resolve(ROOT, 'template', 'project.yaml');

const PREVIEWS = outputDir ? resolve(outputDir) : resolve(ROOT, 'previews');

interface Entity {
	name: string;
	label: string;
	icon?: string;
	fields?: { key: string; label: string; type: string; required?: boolean; options?: string[] }[];
	relations?: { target: string; type: string; label: string }[];
}

interface Page {
	href: string;
	label: string;
	icon?: string;
	features?: string[];
	metrics?: string[];
}

interface PipelineEtape {
	key: string;
	label: string;
	icon?: string;
	color?: string;
}

interface ScoringRule {
	name: string;
	points: number;
	condition: string;
}

interface Config {
	app: { name: string; slug: string; description: string; locale?: string };
	branding: { primary: string; primary_light?: string; primary_dark?: string; accent?: string; font?: string; logo?: string };
	auth?: { provider: string; allowed_domains?: string[] };
	entities?: Entity[];
	pages?: { primary?: Page[]; secondary?: Page[] };
	pipeline?: { etapes: PipelineEtape[] };
	scoring?: { max_points?: number; rules?: ScoringRule[]; labels?: Record<string, number>; [k: string]: unknown };
	prospection?: { sources?: Record<string, { label: string; enabled?: boolean }> };
	signaux?: { types?: { key: string; label: string }[] };
	navigation?: { primary?: Page[]; secondary?: Page[] };
	cron?: unknown;
}

// --- Read YAML ---
const raw = readFileSync(yamlPath, 'utf-8');
const config = yaml.load(raw) as Config;

const { app, branding } = config;
const font = branding.font || 'DM Sans';
const primary = branding.primary || '#2F5A9E';
const primaryLight = branding.primary_light || '#F0F4F8';
const primaryDark = branding.primary_dark || '#0A1628';
const accent = branding.accent || primary;

// --- HTML helpers ---
function escHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function materialIcon(name: string): string {
	return `<span class="material-symbols-outlined text-2xl">${escHtml(name)}</span>`;
}

function htmlShell(title: string, body: string, navActive: string): string {
	const navItems = [
		{ file: 'pitch', label: 'Pitch' },
		{ file: 'entities', label: 'Entites' },
		{ file: 'pages', label: 'Pages' },
		{ file: 'specs', label: 'Recapitulatif' },
	];

	const nav = navItems
		.map(n => {
			const active = n.file === navActive;
			const cls = active
				? 'border-b-2 border-white text-white font-semibold'
				: 'text-white/70 hover:text-white';
			const dir = n.file === navActive ? '.' : `../${n.file}`;
			return `<a href="${dir}/index.html" class="px-4 py-2 ${cls} transition-colors">${escHtml(n.label)}</a>`;
		})
		.join('\n          ');

	return `<!DOCTYPE html>
<html lang="${escHtml(app.locale || 'fr')}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)} — ${escHtml(app.name)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL@24,400,0" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: '${primary}',
            'primary-light': '${primaryLight}',
            'primary-dark': '${primaryDark}',
            accent: '${accent}',
          },
          fontFamily: {
            sans: ['${font}', 'system-ui', 'sans-serif'],
          },
        },
      },
    };
  </script>
  <style>
    body { font-family: '${font}', system-ui, sans-serif; }
    .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'opsz' 24; vertical-align: middle; }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">
  <!-- Header -->
  <header class="bg-primary text-white shadow-lg">
    <div class="max-w-6xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold">${escHtml(app.name)}</h1>
        <span class="text-sm text-white/60">Presentation client</span>
      </div>
      <nav class="flex gap-1 mt-3 -mb-px">
          ${nav}
      </nav>
    </div>
  </header>

  <!-- Content -->
  <main class="max-w-6xl mx-auto px-6 py-10">
    ${body}
  </main>

  <!-- Footer -->
  <footer class="border-t mt-16 py-6 text-center text-sm text-gray-400">
    ${escHtml(app.name)} — Document de cadrage genere par AppFactory
  </footer>
</body>
</html>`;
}

// --- Page 1: Pitch ---
function generatePitch(): string {
	const features: string[] = [];
	if (config.pipeline) features.push('Pipeline commercial');
	if (config.prospection?.sources) features.push('Prospection multi-sources');
	if (config.signaux?.types?.length) features.push('Signaux d\'affaires');
	if (config.scoring) features.push('Scoring automatique');

	const nav = config.navigation || config.pages;
	const pageCount = (nav?.primary?.length || 0) + (nav?.secondary?.length || 0);
	const entityCount = config.entities?.length || 0;

	const body = `
    <div class="text-center mb-12">
      <h2 class="text-4xl font-bold text-primary-dark mb-4">${escHtml(app.name)}</h2>
      <p class="text-xl text-gray-600 max-w-2xl mx-auto">${escHtml(app.description)}</p>
    </div>

    <!-- Key numbers -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
      <div class="bg-white rounded-xl shadow p-6 text-center">
        <div class="text-3xl font-bold text-primary">${pageCount}</div>
        <div class="text-sm text-gray-500 mt-1">Pages</div>
      </div>
      <div class="bg-white rounded-xl shadow p-6 text-center">
        <div class="text-3xl font-bold text-primary">${entityCount || '—'}</div>
        <div class="text-sm text-gray-500 mt-1">Entites</div>
      </div>
      <div class="bg-white rounded-xl shadow p-6 text-center">
        <div class="text-3xl font-bold text-primary">${features.length}</div>
        <div class="text-sm text-gray-500 mt-1">Modules</div>
      </div>
      <div class="bg-white rounded-xl shadow p-6 text-center">
        <div class="text-3xl font-bold text-primary">${escHtml(app.locale || 'fr')}</div>
        <div class="text-sm text-gray-500 mt-1">Locale</div>
      </div>
    </div>

    ${features.length > 0 ? `
    <!-- Features -->
    <div class="bg-white rounded-xl shadow p-8 mb-12">
      <h3 class="text-2xl font-semibold text-primary-dark mb-6">Modules inclus</h3>
      <div class="grid md:grid-cols-2 gap-4">
        ${features.map(f => `
        <div class="flex items-center gap-3 p-4 bg-primary-light rounded-lg">
          ${materialIcon('check_circle')}
          <span class="font-medium">${escHtml(f)}</span>
        </div>`).join('')}
      </div>
    </div>` : ''}

    <!-- Stack -->
    <div class="bg-white rounded-xl shadow p-8">
      <h3 class="text-2xl font-semibold text-primary-dark mb-6">Stack technique</h3>
      <div class="grid md:grid-cols-3 gap-6 text-center">
        <div class="p-4">
          ${materialIcon('code')}
          <div class="font-semibold mt-2">SvelteKit + Tailwind</div>
          <div class="text-sm text-gray-500">Frontend performant</div>
        </div>
        <div class="p-4">
          ${materialIcon('database')}
          <div class="font-semibold mt-2">Supabase</div>
          <div class="text-sm text-gray-500">PostgreSQL + Auth + API</div>
        </div>
        <div class="p-4">
          ${materialIcon('cloud')}
          <div class="font-semibold mt-2">Vercel</div>
          <div class="text-sm text-gray-500">Deploy + Preview + CDN</div>
        </div>
      </div>
    </div>`;

	return htmlShell('Pitch', body, 'pitch');
}

// --- Page 2: Entities ---
function generateEntities(): string {
	const entities = config.entities || [];

	// Fallback: derive entities from navigation if no explicit entities
	if (entities.length === 0) {
		const nav = config.navigation?.primary || config.pages?.primary || [];
		const body = `
    <h2 class="text-3xl font-bold text-primary-dark mb-8">Schema des donnees</h2>
    <div class="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
      <p class="text-amber-800">${materialIcon('info')} Les entites seront definies lors du skill <code>generate</code> a partir des pages configurees.</p>
    </div>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${nav.filter(p => p.href !== '/').map(p => `
      <div class="bg-white rounded-xl shadow p-6">
        <div class="flex items-center gap-3 mb-3">
          ${p.icon ? materialIcon(p.icon) : ''}
          <h3 class="text-lg font-semibold">${escHtml(p.label)}</h3>
        </div>
        <p class="text-sm text-gray-500">Table derivee de la page ${escHtml(p.label)}</p>
      </div>`).join('')}
    </div>`;
		return htmlShell('Entites', body, 'entities');
	}

	const body = `
    <h2 class="text-3xl font-bold text-primary-dark mb-8">Schema des donnees</h2>
    <div class="grid md:grid-cols-2 gap-8">
      ${entities.map(e => `
      <div class="bg-white rounded-xl shadow overflow-hidden">
        <div class="bg-primary text-white px-6 py-4 flex items-center gap-3">
          ${e.icon ? materialIcon(e.icon) : ''}
          <h3 class="text-lg font-semibold">${escHtml(e.label)}</h3>
          <span class="ml-auto text-sm text-white/60">${escHtml(e.name)}</span>
        </div>
        ${e.fields?.length ? `
        <div class="p-6">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500 border-b">
                <th class="pb-2">Champ</th>
                <th class="pb-2">Type</th>
                <th class="pb-2">Requis</th>
              </tr>
            </thead>
            <tbody>
              ${e.fields.map(f => `
              <tr class="border-b border-gray-100">
                <td class="py-2 font-medium">${escHtml(f.label)}</td>
                <td class="py-2 text-gray-500">${escHtml(f.type)}</td>
                <td class="py-2">${f.required ? '<span class="text-primary font-semibold">Oui</span>' : '<span class="text-gray-400">Non</span>'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>` : '<div class="p-6 text-gray-400 text-sm">Champs a definir</div>'}
        ${e.relations?.length ? `
        <div class="px-6 pb-4">
          <div class="text-xs text-gray-400 uppercase tracking-wide mb-2">Relations</div>
          ${e.relations.map(r => `
          <div class="flex items-center gap-2 text-sm py-1">
            ${materialIcon('link')}
            <span>${escHtml(r.label)}</span>
            <span class="text-gray-400">→ ${escHtml(r.target)}</span>
            <span class="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded">${escHtml(r.type)}</span>
          </div>`).join('')}
        </div>` : ''}
      </div>`).join('')}
    </div>`;

	return htmlShell('Entites', body, 'entities');
}

// --- Page 3: Pages ---
function generatePages(): string {
	const nav = config.navigation || config.pages;
	const primaryPages = nav?.primary || [];
	const secondaryPages = nav?.secondary || [];
	const pipeline = config.pipeline;

	const body = `
    <h2 class="text-3xl font-bold text-primary-dark mb-8">Pages et navigation</h2>

    <!-- Navigation primary -->
    <div class="bg-white rounded-xl shadow p-8 mb-8">
      <h3 class="text-xl font-semibold text-primary-dark mb-6">Navigation principale</h3>
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${primaryPages.map(p => `
        <div class="border-2 border-gray-200 rounded-lg p-5 hover:border-primary transition-colors">
          <div class="flex items-center gap-3 mb-2">
            ${p.icon ? materialIcon(p.icon) : ''}
            <span class="font-semibold text-lg">${escHtml(p.label)}</span>
          </div>
          <div class="text-sm text-gray-500">${escHtml(p.href)}</div>
          ${p.features ? `<div class="flex flex-wrap gap-1 mt-3">${p.features.map(f => `<span class="text-xs bg-primary-light text-primary px-2 py-0.5 rounded">${escHtml(f)}</span>`).join('')}</div>` : ''}
          ${p.metrics ? `<div class="flex flex-wrap gap-1 mt-3">${p.metrics.map(m => `<span class="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">${escHtml(m)}</span>`).join('')}</div>` : ''}
        </div>`).join('')}
      </div>
    </div>

    ${secondaryPages.length > 0 ? `
    <!-- Navigation secondary -->
    <div class="bg-white rounded-xl shadow p-8 mb-8">
      <h3 class="text-xl font-semibold text-primary-dark mb-6">Navigation secondaire</h3>
      <div class="flex gap-4">
        ${secondaryPages.map(p => `
        <div class="border border-gray-200 rounded-lg p-4 flex items-center gap-3">
          ${p.icon ? materialIcon(p.icon) : ''}
          <span>${escHtml(p.label)}</span>
        </div>`).join('')}
      </div>
    </div>` : ''}

    ${pipeline ? `
    <!-- Pipeline -->
    <div class="bg-white rounded-xl shadow p-8">
      <h3 class="text-xl font-semibold text-primary-dark mb-6">Pipeline commercial</h3>
      <div class="flex gap-2 overflow-x-auto pb-2">
        ${pipeline.etapes.map((e, i) => `
        <div class="flex items-center gap-2">
          <div class="min-w-[140px] border-2 border-gray-200 rounded-lg p-4 text-center">
            ${e.icon ? materialIcon(e.icon) : ''}
            <div class="font-medium mt-1">${escHtml(e.label)}</div>
          </div>
          ${i < pipeline.etapes.length - 1 ? '<span class="text-gray-300 text-2xl">→</span>' : ''}
        </div>`).join('')}
      </div>
    </div>` : ''}`;

	return htmlShell('Pages', body, 'pages');
}

// --- Page 4: Specs recap ---
function generateSpecs(): string {
	const sections: string[] = [];

	// App
	sections.push(`
    <div class="bg-white rounded-xl shadow p-8 mb-6">
      <h3 class="text-xl font-semibold text-primary-dark mb-4">Application</h3>
      <dl class="grid grid-cols-2 gap-4 text-sm">
        <div><dt class="text-gray-500">Nom</dt><dd class="font-medium">${escHtml(app.name)}</dd></div>
        <div><dt class="text-gray-500">Slug</dt><dd class="font-mono">${escHtml(app.slug)}</dd></div>
        <div class="col-span-2"><dt class="text-gray-500">Description</dt><dd>${escHtml(app.description)}</dd></div>
        <div><dt class="text-gray-500">Locale</dt><dd>${escHtml(app.locale || 'fr')}</dd></div>
        <div><dt class="text-gray-500">Auth</dt><dd>${escHtml(config.auth?.provider || 'google')} OAuth</dd></div>
      </dl>
    </div>`);

	// Branding
	sections.push(`
    <div class="bg-white rounded-xl shadow p-8 mb-6">
      <h3 class="text-xl font-semibold text-primary-dark mb-4">Branding</h3>
      <div class="flex gap-4 mb-4">
        <div class="flex items-center gap-2">
          <div class="w-10 h-10 rounded-lg shadow-inner" style="background:${primary}"></div>
          <div class="text-sm"><div class="text-gray-500">Primary</div><div class="font-mono text-xs">${escHtml(primary)}</div></div>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-10 h-10 rounded-lg shadow-inner" style="background:${accent}"></div>
          <div class="text-sm"><div class="text-gray-500">Accent</div><div class="font-mono text-xs">${escHtml(accent)}</div></div>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-10 h-10 rounded-lg shadow-inner" style="background:${primaryDark}"></div>
          <div class="text-sm"><div class="text-gray-500">Dark</div><div class="font-mono text-xs">${escHtml(primaryDark)}</div></div>
        </div>
      </div>
      <div class="text-sm text-gray-500">Police : <span class="font-medium text-gray-700">${escHtml(font)}</span></div>
    </div>`);

	// Scoring
	if (config.scoring) {
		const s = config.scoring;
		sections.push(`
    <div class="bg-white rounded-xl shadow p-8 mb-6">
      <h3 class="text-xl font-semibold text-primary-dark mb-4">Scoring</h3>
      <div class="text-sm mb-4">Score maximum : <span class="font-bold text-primary">${s.max_points || '—'} points</span></div>
      ${s.labels ? `
      <div class="flex gap-3">
        ${Object.entries(s.labels).map(([label, seuil]) => `
        <div class="px-4 py-2 rounded-full text-sm font-medium ${label === 'chaud' ? 'bg-red-100 text-red-700' : label === 'tiede' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}">
          ${escHtml(label)} ≥ ${seuil}
        </div>`).join('')}
      </div>` : ''}
    </div>`);
	}

	// Prospection sources
	if (config.prospection?.sources) {
		const sources = config.prospection.sources;
		sections.push(`
    <div class="bg-white rounded-xl shadow p-8 mb-6">
      <h3 class="text-xl font-semibold text-primary-dark mb-4">Sources de prospection</h3>
      <div class="grid md:grid-cols-2 gap-3">
        ${Object.entries(sources).map(([key, src]) => `
        <div class="flex items-center gap-3 p-3 rounded-lg ${src.enabled !== false ? 'bg-green-50' : 'bg-gray-50'}">
          <span class="w-2 h-2 rounded-full ${src.enabled !== false ? 'bg-green-500' : 'bg-gray-300'}"></span>
          <span class="font-medium text-sm">${escHtml(src.label)}</span>
          <span class="ml-auto text-xs text-gray-400">${escHtml(key)}</span>
        </div>`).join('')}
      </div>
    </div>`);
	}

	// Signaux
	if (config.signaux?.types?.length) {
		sections.push(`
    <div class="bg-white rounded-xl shadow p-8 mb-6">
      <h3 class="text-xl font-semibold text-primary-dark mb-4">Signaux d'affaires</h3>
      <div class="flex flex-wrap gap-2">
        ${config.signaux.types.map(t => `<span class="px-3 py-1.5 bg-primary-light text-primary rounded-full text-sm font-medium">${escHtml(t.label)}</span>`).join('')}
      </div>
    </div>`);
	}

	// Cron
	if (config.cron) {
		sections.push(`
    <div class="bg-white rounded-xl shadow p-8 mb-6">
      <h3 class="text-xl font-semibold text-primary-dark mb-4">Automatisations</h3>
      <div class="text-sm">
        ${Object.entries(config.cron as Record<string, { path: string; schedule: string }>).map(([name, job]) => `
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-2">
          ${materialIcon('schedule')}
          <span class="font-medium">${escHtml(name)}</span>
          <span class="text-gray-500">${escHtml(job.path)}</span>
          <span class="ml-auto font-mono text-xs bg-gray-200 px-2 py-1 rounded">${escHtml(job.schedule)}</span>
        </div>`).join('')}
      </div>
    </div>`);
	}

	const body = `
    <h2 class="text-3xl font-bold text-primary-dark mb-8">Recapitulatif des specifications</h2>
    <p class="text-gray-500 mb-8">Ce document resume l'ensemble des specs validees pour <strong>${escHtml(app.name)}</strong>. Il sert de reference pour la phase de generation.</p>
    ${sections.join('')}

    <!-- Validation -->
    <div class="bg-primary-light border-2 border-primary rounded-xl p-8 text-center mt-12">
      <h3 class="text-xl font-semibold text-primary-dark mb-2">Pret pour la generation</h3>
      <p class="text-gray-600">Si ces specifications sont validees, l'etape suivante est le skill <code>/generate</code> qui produira le scaffold SvelteKit complet.</p>
    </div>`;

	return htmlShell('Recapitulatif', body, 'specs');
}

// --- Write files ---
const pages = [
	{ dir: 'pitch', fn: generatePitch },
	{ dir: 'entities', fn: generateEntities },
	{ dir: 'pages', fn: generatePages },
	{ dir: 'specs', fn: generateSpecs },
];

for (const { dir, fn } of pages) {
	const outDir = resolve(PREVIEWS, dir);
	mkdirSync(outDir, { recursive: true });
	const html = fn();
	const outPath = resolve(outDir, 'index.html');
	writeFileSync(outPath, html, 'utf-8');
	console.log(`  ${dir}/index.html`);
}

console.log(`\n4 previews generes dans ${PREVIEWS}/`);
console.log(`Ouvrir : open ${PREVIEWS}/pitch/index.html`);

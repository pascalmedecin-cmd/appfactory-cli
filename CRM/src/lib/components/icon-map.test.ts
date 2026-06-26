import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

/**
 * Garde anti-régression ICON_MAP (SIGNAL Bloc C, 2026-06-26).
 *
 * Le composant <Icon> rend `ICON_MAP[name] ?? FALLBACK_ICON`. Tout nom d'icône absent
 * du map tombe sur FALLBACK_ICON (CircleHelp) et s'affiche en « ? » EN PROD, sans
 * jamais lever d'erreur de build/type. Ce test échoue si un nom littéral utilisé dans
 * l'UI n'est pas mappé. Il aurait attrapé le bug `picture_as_pdf` (Bloc C) et les 10
 * icônes « ? » mappées le 2026-06-26 (bug_report, desktop_windows, domain, event,
 * inbox, inventory_2, monitor_heart, open_in_full, phone, place).
 *
 * Couvre les 3 voies par lesquelles un nom littéral atteint <Icon> :
 *   (a) littéral direct      : <Icon name="add" />
 *   (b) branche de ternaire  : <Icon name={ok ? 'check' : 'error'} />
 *   (c) feeder data `icon:`  : { icon: 'phone' }  (rendu via <Icon name={x.icon} />)
 * Les indirections par variable pure (<Icon name={item.icon}>) ne sont pas vérifiables
 * statiquement ; elles sont couvertes par (c), au site de définition de la donnée.
 */

const here = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(here, '../../'); // .../src/lib/components -> .../src
const ICON_MAP_FILE = join(here, 'icon-map.ts');

/** Clés réelles de l'objet ICON_MAP, parsées depuis le source (sans importer lucide). */
function readIconMapKeys(): Set<string> {
	const text = readFileSync(ICON_MAP_FILE, 'utf8');
	const start = text.indexOf('ICON_MAP');
	const open = text.indexOf('{', start);
	const close = text.indexOf('\n};', open);
	expect(start, 'ICON_MAP introuvable dans icon-map.ts').toBeGreaterThan(-1);
	expect(close, 'fin du bloc ICON_MAP introuvable').toBeGreaterThan(open);
	const block = text.slice(open + 1, close);
	const keys = new Set<string>();
	for (const m of block.matchAll(/^\s*([a-z_][a-z0-9_]*)\s*:/gm)) keys.add(m[1]);
	return keys;
}

/** Tous les fichiers source pertinents (hors tests et build). */
function sourceFiles(): string[] {
	const out: string[] = [];
	for (const rel of readdirSync(SRC_DIR, { recursive: true }) as string[]) {
		const p = String(rel).replace(/\\/g, '/');
		if (p.includes('.svelte-kit/')) continue;
		if (p.endsWith('.test.ts') || p.endsWith('.d.ts')) continue;
		if (!p.endsWith('.svelte') && !p.endsWith('.ts')) continue;
		out.push(join(SRC_DIR, p));
	}
	return out;
}

type Usage = { name: string; file: string; kind: string };

/** Extrait tout nom d'icône littéral atteignant <Icon> dans un fichier. */
function extractIconNames(text: string, file: string): Usage[] {
	const found: Usage[] = [];
	const rel = file.slice(file.indexOf('/src/') + 1);

	// (a) littéral direct : <Icon ... name="X"> / name='X'
	for (const m of text.matchAll(/<Icon\b[^>]*?\bname\s*=\s*(["'])([a-z0-9_]+)\1/g)) {
		found.push({ name: m[2], file: rel, kind: 'literal' });
	}

	// (b) expression <Icon ... name={ EXPR }> : on récupère les chaînes littérales qui
	// sont une branche de ternaire (précédées de ? ou :) ou l'expression entière.
	for (const m of text.matchAll(/<Icon\b[^>]*?\bname\s*=\s*\{([\s\S]*?)\}/g)) {
		const expr = m[1].trim();
		const whole = expr.match(/^(["'])([a-z0-9_]+)\1$/);
		if (whole) {
			found.push({ name: whole[2], file: rel, kind: 'expr-literal' });
			continue;
		}
		for (const b of expr.matchAll(/[?:]\s*(["'])([a-z0-9_]+)\1/g)) {
			found.push({ name: b[2], file: rel, kind: 'ternary' });
		}
	}

	// (c) feeder data : `icon: 'X'` (rendu indirectement via <Icon name={...}>)
	for (const m of text.matchAll(/\bicon\s*:\s*(["'])([a-z0-9_]+)\1/g)) {
		found.push({ name: m[2], file: rel, kind: 'feeder' });
	}

	return found;
}

describe('ICON_MAP : tout nom d’icône utilisé dans l’UI doit être mappé', () => {
	const keys = readIconMapKeys();

	it('parse un nombre plausible de clés (garde-fou de parsing)', () => {
		expect(keys.size).toBeGreaterThan(120);
		expect(keys.has('add')).toBe(true);
		expect(keys.has('close')).toBe(true);
	});

	it('aucun nom littéral atteignant <Icon> n’est absent d’ICON_MAP', () => {
		const files = sourceFiles();
		expect(files.length).toBeGreaterThan(30);

		const usages: Usage[] = [];
		for (const f of files) usages.push(...extractIconNames(readFileSync(f, 'utf8'), f));

		const offenders = usages.filter((u) => !keys.has(u.name));
		// dédup (name -> 1ʳᵉ occurrence) pour un message lisible
		const byName = new Map<string, Usage>();
		for (const o of offenders) if (!byName.has(o.name)) byName.set(o.name, o);

		const report = [...byName.values()]
			.map((o) => `  - "${o.name}" (${o.kind}) ex: ${o.file}`)
			.join('\n');

		expect(
			byName.size,
			byName.size === 0
				? ''
				: `Icônes utilisées mais absentes d'ICON_MAP (rendront « ? » en prod) :\n${report}\n` +
						`→ Ajoute chaque nom dans src/lib/components/icon-map.ts (avec son import lucide).`,
		).toBe(0);
	});
});

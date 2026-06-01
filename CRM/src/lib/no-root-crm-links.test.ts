import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Garde-fou AC-024 (réorg portail 2026-06-01) : aucun lien interne vers une page CRM
 * ne doit rester à la racine. Les pages CRM vivent sous `/crm/*` ; un lien racine
 * (`/pipeline`, `/log?/create`...) ne « marche » que via le filet 308 temporaire
 * (`CRM_LEGACY_PREFIXES` dans hooks.server.ts), conçu pour les favoris externes des
 * fondateurs — pas pour la navigation interne. Tout lien interne passe par `CRM_BASE`.
 *
 * Capture href= / goto() / fetch() / action= ET les propriétés d'objet `href: '/...'`.
 * Régression de référence : QA 360 portail 2026-06-01 — 11 liens racine oubliés par le
 * reprefixage ciblé (TriageQueue, LeadExpress, PipelineQuickAdvance, FeedbackForm,
 * FeedbackTable, QuickActionsFooter), détectés par bug-hunter.
 */
const CRM_PAGES = [
	'contacts',
	'entreprises',
	'pipeline',
	'prospection',
	'signaux',
	'veille',
	'reporting',
	'aide',
	'log',
	'dashboard'
];

// `(href|goto|action|fetch)` suivi de `=`/`:`/`(`, puis d'un littéral `'/pagename...'`.
// Un lien correct `'/crm/contacts'` ou `` `${CRM_BASE}/contacts` `` ne matche pas
// (le caractère qui suit le quote/backtick est `c`(rm) ou `$`, pas une page racine).
const ROOT_LINK = new RegExp(
	`(href|goto|action|fetch)\\s*[=:(]\\s*['"\`]/(${CRM_PAGES.join('|')})(['"?/\`])`
);

function collectSources(dir: string, acc: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		if (name === 'node_modules' || name === '.svelte-kit') continue;
		const full = join(dir, name);
		const st = statSync(full);
		if (st.isDirectory()) {
			collectSources(full, acc);
		} else if (
			(name.endsWith('.svelte') || name.endsWith('.ts')) &&
			!name.endsWith('.test.ts') &&
			!name.endsWith('.d.ts') &&
			name !== 'database.types.ts'
		) {
			acc.push(full);
		}
	}
	return acc;
}

describe('AC-024 liens internes CRM centralisés sous /crm', () => {
	it('aucun lien interne vers une page CRM ne reste à la racine', () => {
		const offenders: string[] = [];
		for (const file of collectSources('src')) {
			const lines = readFileSync(file, 'utf8').split('\n');
			lines.forEach((line, i) => {
				if (ROOT_LINK.test(line)) offenders.push(`${file}:${i + 1}  ${line.trim()}`);
			});
		}
		expect(offenders, `liens CRM à la racine (doivent passer par CRM_BASE) :\n${offenders.join('\n')}`).toEqual([]);
	});
});

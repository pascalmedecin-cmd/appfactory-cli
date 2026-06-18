import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Garde-fou cohérence FR (Vague 1, SPEC_VAGUE1_COHERENCE § 2) : aucun enum technique
 * (`statut`, `statut_traitement`, `etape_pipeline`, `type_signal`) ne doit être rendu
 * BRUT à l'écran ou dans un aria-label. Tout affichage passe par un helper de libellé FR
 * (source unique) : `statutLabel` / `statutVariant` (prospection-utils, signauxFormat),
 * `formatTypeLabel` (signauxFormat), `etapeLabel` (pipelineFormat).
 *
 * Régression de référence : B1 (pipeline « appel_offres »), B2 (terrain « negociation »),
 * B3 (aria-label prospection « statut interesse »), B4 (dashboard RelancesList « negociation »)
 * — détectées par cartographie 2026-06-18, corrigées en Vague 1.
 *
 * Détecte un rendu brut = une chaîne de propriété se TERMINANT par l'enum, rendue
 * directement dans une moustache `{ … }` (avec fallback `?? '…'` toléré) OU interpolée
 * dans un template literal `${ … }` (cas aria-label). Un appel d'aide
 * (`etapeLabel(x.etape_pipeline)`), une comparaison (`x.statut !== 'y'`), un argument de
 * fonction (`typeIcon(x.type_signal)`) ou une clé d'objet (`{ statut: x }`) ne matchent pas.
 *
 * PÉRIMÈTRE (à ne pas surestimer) : scan LIGNE PAR LIGNE des fichiers `.svelte` UNIQUEMENT.
 * Donc NON couverts : (1) un rendu d'enum étalé sur deux lignes physiques ; (2) une fuite
 * d'enum dans un helper d'aria-label `.ts` importé (ex. `signauxFormat.ts:signalAriaLabel`,
 * aujourd'hui correct via `formatTypeLabel`/`statutLabel`). C'est le cas mono-ligne en
 * `.svelte` (le plus fréquent, et la cible littérale de la spec § 4) qui est garanti.
 */
const ENUM_FIELDS = ['statut_traitement', 'etape_pipeline', 'type_signal', 'statut'] as const;

// Chaîne de propriété qui se termine par l'enum : `a.b.enum`, `a?.enum`, `a['x'].enum`.
const CHAIN = `[\\w$]+(?:\\??\\.[\\w$]+|\\[[^\\]]*\\])*\\??\\.(?:${ENUM_FIELDS.join('|')})`;

// Rendu moustache direct : `{ <chain> }` ou `{ <chain> ?? 'literal' }`.
const MUSTACHE = new RegExp(`\\{\\s*${CHAIN}\\s*(?:\\?\\?\\s*['"\`][^'"\`]*['"\`]\\s*)?\\}`);
// Interpolation dans un template literal : `${ <chain> }` (cas aria-label B3).
const INTERP = new RegExp(`\\$\\{\\s*${CHAIN}\\s*\\}`);

/** Vrai si la ligne contient un rendu d'enum brut. Pure, testable en isolation. */
export function hasBruteEnumRender(line: string): boolean {
	return MUSTACHE.test(line) || INTERP.test(line);
}

function collectSvelte(dir: string, acc: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		if (name === 'node_modules' || name === '.svelte-kit') continue;
		const full = join(dir, name);
		const st = statSync(full);
		if (st.isDirectory()) collectSvelte(full, acc);
		else if (name.endsWith('.svelte')) acc.push(full);
	}
	return acc;
}

describe('garde cohérence FR : aucun enum brut rendu (Vague 1 § 2)', () => {
	// --- Auto-validation : la garde DOIT détecter les régressions B1-B4 (rouge sans fix) ---
	it('détecte un rendu brut en moustache (B1/B2/B4)', () => {
		expect(hasBruteEnumRender('{o.etape_pipeline}')).toBe(true);
		expect(hasBruteEnumRender("\t\t\t<span class=\"etape\">{o.etape_pipeline}</span>")).toBe(true);
		expect(hasBruteEnumRender("{relance.etape_pipeline ?? '—'}")).toBe(true);
		expect(hasBruteEnumRender('{selectedOpp.signaux_affaires.type_signal} -- x')).toBe(true);
		expect(hasBruteEnumRender('{lead.statut}')).toBe(true);
	});

	it('détecte une interpolation brute en template literal (B3 aria-label)', () => {
		expect(hasBruteEnumRender('parts.push(`statut ${lead.statut}`);')).toBe(true);
		expect(hasBruteEnumRender('aria-label={`étape ${o.etape_pipeline}`}')).toBe(true);
	});

	// --- Pas de faux positif : les rendus corrects via helper ne matchent pas ---
	it('ignore les rendus via helper de libellé', () => {
		expect(hasBruteEnumRender('{etapeLabel(o.etape_pipeline)}')).toBe(false);
		expect(hasBruteEnumRender('{formatTypeLabel(selectedOpp.signaux_affaires.type_signal)}')).toBe(false);
		expect(hasBruteEnumRender('{statutLabel(lead.statut)}')).toBe(false);
		expect(hasBruteEnumRender('parts.push(`statut ${statutLabel(lead.statut)}`);')).toBe(false);
		expect(hasBruteEnumRender('{etapeLabel(relance.etape_pipeline) || \'—\'}')).toBe(false);
	});

	it('ignore comparaisons, arguments de fonction, clés d objet, affectations', () => {
		expect(hasBruteEnumRender("{#if selectedSignal.statut_traitement !== 'converti'}")).toBe(false);
		expect(hasBruteEnumRender('<Icon name={typeIcon(signal.type_signal)} />')).toBe(false);
		expect(hasBruteEnumRender('q = q.neq(\'statut\', \'transfere\');')).toBe(false);
		expect(hasBruteEnumRender('{ statut: lead.statut }')).toBe(false);
		expect(hasBruteEnumRender("statut_traitement = selectedSignal.statut_traitement ?? 'nouveau';")).toBe(false);
		expect(hasBruteEnumRender("const enrichables = data.leads.filter(l => l.statut !== 'transfere');")).toBe(false);
	});

	// --- Scan réel : zéro rendu brut dans le code (vert avec les fixes Vague 1) ---
	it('aucun enum brut rendu dans les fichiers .svelte', () => {
		const offenders: string[] = [];
		for (const file of collectSvelte('src')) {
			readFileSync(file, 'utf8')
				.split('\n')
				.forEach((line, i) => {
					if (hasBruteEnumRender(line)) offenders.push(`${file}:${i + 1}  ${line.trim()}`);
				});
		}
		expect(
			offenders,
			`enums rendus bruts (doivent passer par un helper de libellé FR) :\n${offenders.join('\n')}`
		).toEqual([]);
	});
});

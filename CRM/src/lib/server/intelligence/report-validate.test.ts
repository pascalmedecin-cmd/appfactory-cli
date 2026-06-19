import { describe, it, expect } from 'vitest';
import { partitionReport, MAX_DROPPED_RATIO } from './report-validate';

// Article conforme de référence (même forme que schema.test.ts).
const validItem = {
	rank: 1,
	title: 'Appel d offres école Vaud - vitrage sécurité',
	summary:
		'La commune de Lausanne publie un AO pour la rénovation de vitrages sur trois bâtiments scolaires.',
	filmpro_relevance: 'Cible ERP directe, zone prioritaire VD, segment école.',
	maturity: 'etabli' as const,
	theme: 'films_securite' as const,
	geo_scope: 'suisse_romande' as const,
	source: {
		name: 'SIMAP',
		url: 'https://www.simap.ch/example-123',
		published_at: '2026-04-10T08:00:00Z'
	},
	deep_dive: null,
	segment: 'erp' as const,
	actionability: 'action_directe' as const,
	search_terms: [
		{ kind: 'simap' as const, canton: 'VD' as const, query: 'école rénovation vitrage', label: 'SIMAP VD · école rénovation vitrage' },
		{ kind: 'zefix' as const, canton: 'VD' as const, query: 'Losinger Marazzi', label: 'Zefix VD · Losinger Marazzi' }
	]
};

const validMeta = {
	week_label: '2026-W15',
	generated_at: '2026-04-10T08:00:00Z',
	compliance_tag: 'OK FilmPro' as const,
	executive_summary:
		'Semaine dominée par des signaux AO cantonaux et une avancée réglementaire sur l enveloppe du bâtiment.'
};

const validImpacts = [
	{ axis: 'diagnostic' as const, note: 'Renforcer la grille de diagnostic sur les ERP scolaires.' }
];

function item(rank: number, overrides: Record<string, unknown> = {}) {
	return { ...validItem, rank, title: `Signal pertinent numéro ${rank}`, ...overrides };
}

function report(items: unknown[], overrides: Record<string, unknown> = {}) {
	return { meta: validMeta, items, impacts_filmpro: validImpacts, ...overrides };
}

const badUrl = (rank: number) => item(rank, { source: { ...validItem.source, url: 'pas-une-url' } });
const oneChip = (rank: number) => item(rank, { search_terms: [validItem.search_terms[0]] });

describe('partitionReport', () => {
	// Critère 1 : incident W23 — un article à 1 seul chip est désormais CONSERVÉ.
	it('garde un article qui n a qu un seul search_term (préférence reclassée)', () => {
		const r = partitionReport(report([item(1), oneChip(2)]));
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.report.items).toHaveLength(2);
		expect(r.dropped).toHaveLength(0);
	});

	// Critère 2 : violation d'intégrité (URL) — article écarté individuellement, les autres gardés.
	// (4 articles, 1 écarté = 25 % < seuil, pour isoler le drop du garde anti-dérive.)
	it('écarte un article à URL invalide et garde les autres', () => {
		const r = partitionReport(report([item(1), item(2), item(3), badUrl(4)]));
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.report.items).toHaveLength(3);
		expect(r.report.items.find((i) => i.rank === 4)).toBeUndefined();
		expect(r.dropped).toHaveLength(1);
		expect(r.dropped[0].violations).toMatch(/url/i);
	});

	// Critère 3 : zéro fabrication — un résumé trop court est écarté, jamais complété.
	it('écarte un article au résumé trop court sans le réparer', () => {
		const r = partitionReport(report([item(1), item(2), item(3), item(4, { summary: 'trop court' })]));
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.report.items).toHaveLength(3);
		expect(r.report.items.every((i) => i.summary === validItem.summary)).toBe(true);
	});

	// Critère 4 : happy path inchangé.
	it('garde tous les articles quand ils sont tous valides', () => {
		const r = partitionReport(report([item(1), item(2), item(3)]));
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.report.items).toHaveLength(3);
		expect(r.dropped).toHaveLength(0);
	});

	// Critère 5 : chaque article gardé est pleinement conforme (transform schéma appliquée).
	it('applique les transforms du schéma sur les articles gardés (date normalisée)', () => {
		const r = partitionReport(report([item(1, { source: { ...validItem.source, published_at: '2026-04-10' } })]));
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.report.items[0].source.published_at).toBe('2026-04-10T00:00:00Z');
	});

	// Critère 6a (révisé 06-19, incident W25) : ratio élevé MAIS ≥1 valide => on PUBLIE
	// ce qui est bon. Le ratio n'est plus bloquant (il ne protégeait pas le zéro-hallu,
	// les articles gardés repassent url-verify + cross-check) : juste un warning loggé.
	// 4/6 = 66% écartés, 2 valides restent → édition publiée avec 2 articles.
	it('publie les articles valides même si le ratio dépasse 30% (publier ce qui est bon)', () => {
		const r = partitionReport(report([badUrl(1), badUrl(2), badUrl(3), badUrl(4), item(5), item(6)]));
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.report.items).toHaveLength(2);
		expect(r.dropped).toHaveLength(4);
	});

	// Critère 6b (révisé 06-19) : 2/5 = 40 % écartés mais 3 valides restent → publié.
	it('publie les 3 valides quand 40 % sont écartés (ratio non bloquant)', () => {
		const r = partitionReport(report([badUrl(1), badUrl(2), item(3), item(4), item(5)]));
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.report.items).toHaveLength(3);
		expect(r.dropped).toHaveLength(2);
	});

	// Critère 6c (révisé 06-19) : « 0 valide » est désormais la SEULE garde bloquante
	// (le modèle a émis des candidats mais aucun n'est exploitable) => échec.
	it('échoue uniquement si tous les articles sont écartés (0 valide)', () => {
		const r = partitionReport(report([badUrl(1)]));
		expect(r.ok).toBe(false);
	});

	// Régression incident W25 (cron 2026-06-19) : 1 bon article complet SANS chips
	// (0 search_term) + 1 coquille (summary vide, source factice) → l'édition doit
	// PUBLIER le bon article. Avant le fix : 1/2 = 50% > 30% faisait tout échouer, et
	// le bon article était lui-même rejeté pour 0 chip (search_terms min(1)).
	it('publie le bon article malgré une coquille restante (régression W25)', () => {
		const bon = item(1, { search_terms: [] });
		const coquille = {
			...item(2),
			title: 'x',
			summary: '',
			filmpro_relevance: '',
			source: { name: 'x', url: 'https://x.test/a', published_at: '2026-04-10' },
			search_terms: []
		};
		const r = partitionReport(report([bon, coquille]));
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.report.items).toHaveLength(1);
		expect(r.report.items[0].rank).toBe(1);
		expect(r.dropped).toHaveLength(1);
	});

	// Critère 6d : sous le seuil => édition produite (1 écarté sur 10).
	it('produit l édition si peu d articles sont écartés', () => {
		const items = [item(1), item(2), item(3), item(4), item(5), item(6), item(7), item(8), item(9), badUrl(10)];
		const r = partitionReport(report(items));
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.report.items).toHaveLength(9);
		expect(r.dropped).toHaveLength(1);
	});

	// Critère 7a (révisé 06-19) : week_label mal formé est DÉCORATIF (réécrit serveur)
	// → ne fait plus échouer l'édition (« publier ce qui est bon »).
	it('ne fait pas échouer l édition si week_label est mal formé (décoratif, réécrit serveur)', () => {
		const r = partitionReport(report([item(1)], { meta: { ...validMeta, week_label: 'BAD' } }));
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.report.items).toHaveLength(1);
	});

	// La SEULE fatalité restante : emit_report qui n'est même pas un objet exploitable.
	it('échoue si l emit_report n est même pas un objet', () => {
		expect(partitionReport('pas un objet').ok).toBe(false);
		expect(partitionReport(null).ok).toBe(false);
		expect(partitionReport(42).ok).toBe(false);
	});

	// Critère 7b (révisé 06-19) : impact non conforme écarté INDIVIDUELLEMENT, l'édition survit.
	it('écarte un impact non conforme individuellement sans faire échouer l édition', () => {
		const r = partitionReport(
			report([item(1)], { impacts_filmpro: [{ axis: 'AXE_INEXISTANT', note: 'x' }] })
		);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.report.impacts_filmpro).toHaveLength(0);
	});

	it('garde les impacts valides et écarte les invalides (cap 3)', () => {
		const r = partitionReport(
			report([item(1)], {
				impacts_filmpro: [
					{ axis: 'diagnostic', note: 'Note valide pour le diagnostic ERP scolaire.' },
					{ axis: 'AXE_INEXISTANT', note: 'invalide' }
				]
			})
		);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.report.impacts_filmpro).toHaveLength(1);
		expect(r.report.impacts_filmpro[0].axis).toBe('diagnostic');
	});

	// Critère 8 : semaine creuse légitime (0 article émis) => succès, pas d'échec.
	it('accepte une semaine creuse (0 article) sans échouer', () => {
		const r = partitionReport(report([]));
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.report.items).toHaveLength(0);
		expect(r.dropped).toHaveLength(0);
	});

	it('expose le seuil ratio validé', () => {
		expect(MAX_DROPPED_RATIO).toBeCloseTo(0.3);
	});

	// --- Décision Pascal 2026-06-19 « publier ce qui est bon » : seuil absolu retiré ---

	it('publie 11 bons articles malgré 4 écarts sur 15 candidats (seuil absolu retiré)', () => {
		const items: unknown[] = [];
		for (let i = 1; i <= 11; i++) items.push(item(i));
		items.push(badUrl(12), badUrl(13), badUrl(14), badUrl(15)); // 4/15 = 27% < 30%
		const r = partitionReport(report(items));
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.report.items).toHaveLength(11);
		expect(r.dropped).toHaveLength(4);
	});

	it('clampe un executive_summary trop court (5 chars) au lieu d échouer', () => {
		const r = partitionReport(
			report([item(1)], { meta: { ...validMeta, executive_summary: 'court' } })
		);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.report.meta.executive_summary).toBe('court');
	});

	it('remplace un executive_summary vide par un placeholder non vide', () => {
		const r = partitionReport(
			report([item(1)], { meta: { ...validMeta, executive_summary: '   ' } })
		);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.report.meta.executive_summary.length).toBeGreaterThan(0);
	});

	it('tronque un executive_summary trop long à 2000 caractères', () => {
		const r = partitionReport(
			report([item(1)], { meta: { ...validMeta, executive_summary: 'a'.repeat(3000) } })
		);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.report.meta.executive_summary.length).toBe(2000);
	});

	it('fallback compliance_tag invalide vers Non exploitable sans échouer', () => {
		const r = partitionReport(
			report([item(1)], { meta: { ...validMeta, compliance_tag: 'TAG_INEXISTANT' } })
		);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.report.meta.compliance_tag).toBe('Non exploitable');
	});

	// --- Bloc 3 (audit 360 racine 2026-06-19) : generated_at ré-écrit serveur,
	// donc un format off ne doit plus faire échouer toute l'édition (pré-normalisé).
	it('ne fait pas échouer l édition si generated_at a un offset (+02:00) au lieu de Z', () => {
		const r = partitionReport(
			report([item(1)], { meta: { ...validMeta, generated_at: '2026-04-10T08:00:00+02:00' } })
		);
		expect(r.ok).toBe(true);
	});

	it('ne fait pas échouer l édition si generated_at est une date seule (YYYY-MM-DD)', () => {
		const r = partitionReport(
			report([item(1)], { meta: { ...validMeta, generated_at: '2026-04-10' } })
		);
		expect(r.ok).toBe(true);
	});

	it('ne fait pas échouer l édition si generated_at est absurde (sera réécrit serveur)', () => {
		const r = partitionReport(
			report([item(1)], { meta: { ...validMeta, generated_at: 'pas une date' } })
		);
		expect(r.ok).toBe(true);
	});

	it('garde un article dont la date a un offset ISO (+02:00) au lieu de Z', () => {
		const r = partitionReport(
			report([
				item(1, { source: { ...validItem.source, published_at: '2026-04-10T08:00:00+02:00' } })
			])
		);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.report.items).toHaveLength(1);
	});
});

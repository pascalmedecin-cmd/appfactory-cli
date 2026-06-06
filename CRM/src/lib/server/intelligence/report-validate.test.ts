import { describe, it, expect } from 'vitest';
import { partitionReport, MAX_DROPPED_ABSOLUTE, MAX_DROPPED_RATIO } from './report-validate';

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

	// Critère 6a : seuil absolu — plus de 3 articles écartés => échec bruyant.
	it('échoue si plus de 3 articles sont écartés', () => {
		const r = partitionReport(report([badUrl(1), badUrl(2), badUrl(3), badUrl(4), item(5), item(6)]));
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.dropped).toHaveLength(4);
	});

	// Critère 6b : seuil ratio — plus de 30 % écartés (mais <= 3 en absolu) => échec.
	it('échoue si plus de 30 % des articles sont écartés', () => {
		const r = partitionReport(report([badUrl(1), badUrl(2), item(3), item(4), item(5)]));
		expect(r.ok).toBe(false); // 2/5 = 40 %
	});

	// Critère 6c : tous écartés (0 article valide) => échec.
	it('échoue si tous les articles sont écartés', () => {
		const r = partitionReport(report([badUrl(1)]));
		expect(r.ok).toBe(false);
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

	// Critère 7a : meta invalide => échec global (garde-fou niveau édition).
	it('échoue si meta est invalide', () => {
		const r = partitionReport(report([item(1)], { meta: { ...validMeta, week_label: 'BAD' } }));
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.error).toMatch(/meta|structure|édition/i);
	});

	// Critère 7b : impacts_filmpro invalide => échec global.
	it('échoue si impacts_filmpro est invalide', () => {
		const r = partitionReport(report([item(1)], { impacts_filmpro: [{ axis: 'AXE_INEXISTANT', note: 'x' }] }));
		expect(r.ok).toBe(false);
	});

	// Critère 8 : semaine creuse légitime (0 article émis) => succès, pas d'échec.
	it('accepte une semaine creuse (0 article) sans échouer', () => {
		const r = partitionReport(report([]));
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.report.items).toHaveLength(0);
		expect(r.dropped).toHaveLength(0);
	});

	it('expose les seuils validés', () => {
		expect(MAX_DROPPED_ABSOLUTE).toBe(3);
		expect(MAX_DROPPED_RATIO).toBeCloseTo(0.3);
	});
});

import { describe, it, expect } from 'vitest';
import { scoreRelevance, demoteGenericRelevance, GENERIC_RANK_PENALTY } from './relevance-net';
import type { IntelligenceItem } from './schema';

describe('scoreRelevance', () => {
	it('détecte un so-what concret (segment + action)', () => {
		const s = scoreRelevance(
			'Opportunité pour les bureaux tertiaires exposés sud : relancer les régies avec un argumentaire film solaire.'
		);
		expect(s.namesSegment).toBe(true);
		expect(s.namesAction).toBe(true);
		expect(s.generic).toBe(false);
	});

	it('insensible aux accents (école, régie, opportunité)', () => {
		const s = scoreRelevance('Cibler les ecoles et regies, belle opportunite.');
		expect(s.namesSegment).toBe(true);
		expect(s.namesAction).toBe(true);
		expect(s.generic).toBe(false);
	});

	it('non générique si seulement un segment', () => {
		const s = scoreRelevance('Pertinent pour le segment résidentiel haut de gamme.');
		expect(s.namesSegment).toBe(true);
		expect(s.generic).toBe(false);
	});

	it('non générique si seulement une action', () => {
		const s = scoreRelevance('Bon angle pour prospecter ce trimestre.');
		expect(s.namesAction).toBe(true);
		expect(s.generic).toBe(false);
	});

	it('générique si ni segment ni action', () => {
		const s = scoreRelevance(
			"Tendance de fond du marché du vitrage à l'échelle mondiale, à garder en tête."
		);
		expect(s.generic).toBe(true);
	});

	it("pas de faux positif « erp » par sous-chaîne (interpreter, superpose)", () => {
		// « erp » est contenu dans interpreter/superpose : la limite de mot l'empêche.
		const s = scoreRelevance('Il faut interpreter les superpositions de tendances du marché.');
		expect(s.namesSegment).toBe(false);
		expect(s.generic).toBe(true);
	});

	it('« ERP » en mot plein nomme bien le segment', () => {
		expect(scoreRelevance('Pertinent pour les ERP de la région.').namesSegment).toBe(true);
	});
});

function mk(rank: number, relevance: string): IntelligenceItem {
	return {
		rank,
		title: `Item de test numéro ${rank}`,
		summary: 'Résumé suffisamment long pour le schéma de validation des items de veille.',
		filmpro_relevance: relevance,
		maturity: 'etabli',
		theme: 'films_solaires',
		geo_scope: 'suisse_romande',
		source: { name: 'Src', url: `https://ex.com/${rank}`, published_at: '2026-06-18T00:00:00Z' },
		deep_dive: null,
		segment: 'tertiaire',
		actionability: 'veille_active',
		search_terms: []
	};
}

describe('demoteGenericRelevance', () => {
	it('pénalise le rank des items génériques, garde les concrets intacts', () => {
		const concret = mk(1, 'Relancer les régies avec un argumentaire film solaire.');
		const generique = mk(2, 'Tendance mondiale du verre à observer.');
		const { items, demotedCount } = demoteGenericRelevance([concret, generique]);
		expect(demotedCount).toBe(1);
		expect(items[0].rank).toBe(1); // concret inchangé
		expect(items[1].rank).toBe(2 + GENERIC_RANK_PENALTY); // générique rétrogradé
	});

	it('ne supprime jamais d items (rétrogradation, pas rejet)', () => {
		const { items } = demoteGenericRelevance([
			mk(1, 'Tendance mondiale.'),
			mk(2, 'Autre tendance globale.')
		]);
		expect(items).toHaveLength(2);
	});
});

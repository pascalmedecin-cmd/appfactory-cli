import { describe, it, expect } from 'vitest';
import {
	scoreRelevance,
	orderByFilmproImportance,
	filmproImportancePenalty,
	GENERIC_PENALTY
} from './relevance-net';
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

const CONCRET = 'Relancer les régies avec un argumentaire film solaire.';
const GENERIQUE = 'Tendance mondiale du verre à observer.';

function mk(
	rank: number,
	relevance: string,
	over: Partial<Pick<IntelligenceItem, 'geo_scope' | 'actionability' | 'maturity'>> = {}
): IntelligenceItem {
	return {
		rank,
		title: `Item de test numéro ${rank}`,
		summary: 'Résumé suffisamment long pour le schéma de validation des items de veille.',
		filmpro_relevance: relevance,
		maturity: over.maturity ?? 'etabli',
		theme: 'films_solaires',
		geo_scope: over.geo_scope ?? 'suisse_romande',
		source: { name: 'Src', url: `https://ex.com/${rank}`, published_at: '2026-06-18T00:00:00Z' },
		deep_dive: null,
		segment: 'tertiaire',
		actionability: over.actionability ?? 'veille_active',
		search_terms: []
	};
}

describe('filmproImportancePenalty', () => {
	it('local action_directe etabli concret = 0 (le plus important)', () => {
		const p = filmproImportancePenalty(
			mk(1, CONCRET, { geo_scope: 'suisse_romande', actionability: 'action_directe', maturity: 'etabli' })
		);
		expect(p).toBe(0);
	});

	it('monde a_surveiller speculatif concret = somme graduée (profil Vitro/Fraunhofer)', () => {
		const p = filmproImportancePenalty(
			mk(1, CONCRET, { geo_scope: 'monde', actionability: 'a_surveiller', maturity: 'speculatif' })
		);
		// a_surveiller(4) + monde(4) + speculatif(2) = 10
		expect(p).toBe(10);
	});

	it('so-what générique : pénalité dominante, peu importe l ancrage local', () => {
		const p = filmproImportancePenalty(
			mk(1, GENERIQUE, { geo_scope: 'suisse_romande', actionability: 'action_directe', maturity: 'etabli' })
		);
		expect(p).toBe(GENERIC_PENALTY);
		expect(p).toBeGreaterThan(
			filmproImportancePenalty(
				mk(1, CONCRET, { geo_scope: 'monde', actionability: 'a_surveiller', maturity: 'speculatif' })
			)
		);
	});
});

describe('orderByFilmproImportance', () => {
	it('le local actionnable remonte devant la nouveauté monde lointaine (grief W25)', () => {
		// distant = profil Vitro/Fraunhofer : monde + a_surveiller + speculatif, MAIS rank LLM 1.
		const distant = mk(1, 'Cibler le segment tertiaire avec ce nouveau matériau.', {
			geo_scope: 'monde',
			actionability: 'a_surveiller',
			maturity: 'speculatif'
		});
		// local = romand actionnable, rank LLM moins bon (3).
		const local = mk(3, 'Relancer les régies avec un diagnostic film solaire.', {
			geo_scope: 'suisse_romande',
			actionability: 'action_directe'
		});
		const { items, reorderedCount } = orderByFilmproImportance([distant, local]);
		const ordered = [...items].sort((a, b) => a.rank - b.rank);
		expect(ordered[0].source.url).toBe(local.source.url);
		expect(ordered[1].source.url).toBe(distant.source.url);
		expect(reorderedCount).toBeGreaterThan(0);
	});

	it('un so-what générique tombe sous un concret moins bien ancré', () => {
		const concreteMonde = mk(2, 'Cibler le tertiaire avec une offre dédiée.', {
			geo_scope: 'monde',
			actionability: 'a_surveiller',
			maturity: 'speculatif'
		});
		const genericLocal = mk(1, 'Tendance de fond du marché à observer.', {
			geo_scope: 'suisse_romande',
			actionability: 'action_directe'
		});
		const { items, demotedCount } = orderByFilmproImportance([genericLocal, concreteMonde]);
		expect(demotedCount).toBe(1);
		const ordered = [...items].sort((a, b) => a.rank - b.rank);
		expect(ordered[0].source.url).toBe(concreteMonde.source.url);
	});

	it('départage par rank LLM à importance égale (ordre LLM préservé)', () => {
		const a = mk(1, CONCRET, { geo_scope: 'suisse_romande', actionability: 'action_directe' });
		const b = mk(2, 'Cibler les bureaux avec une offre.', {
			geo_scope: 'suisse_romande',
			actionability: 'action_directe'
		});
		const { items, reorderedCount } = orderByFilmproImportance([a, b]);
		const ordered = [...items].sort((x, y) => x.rank - y.rank);
		expect(ordered[0].source.url).toBe(a.source.url);
		expect(ordered[1].source.url).toBe(b.source.url);
		expect(reorderedCount).toBe(0);
	});

	it('ne supprime jamais d items (rétrogradation, pas rejet)', () => {
		const { items } = orderByFilmproImportance([
			mk(1, GENERIQUE),
			mk(2, 'Autre tendance globale.'),
			mk(3, CONCRET)
		]);
		expect(items).toHaveLength(3);
	});

	it('robuste aux ranks LLM dupliqués (reorderedCount cohérent, rien perdu)', () => {
		// Le schema n'impose pas l'unicité du rank : 3 items à rank=1.
		const a = mk(1, CONCRET, { geo_scope: 'suisse_romande', actionability: 'action_directe' }); // pénalité 0
		const b = mk(1, 'Cibler le tertiaire avec une offre.', {
			geo_scope: 'monde',
			actionability: 'a_surveiller',
			maturity: 'speculatif'
		}); // pénalité 10
		const c = mk(1, CONCRET, { geo_scope: 'suisse', actionability: 'veille_active' }); // pénalité 3
		const { items, reorderedCount } = orderByFilmproImportance([a, b, c]);
		expect(items).toHaveLength(3);
		expect(reorderedCount).toBeGreaterThanOrEqual(0);
		expect(reorderedCount).toBeLessThanOrEqual(3);
		// Ordre d'importance attendu : a (0) < c (3) < b (10).
		const ordered = [...items].sort((x, y) => x.rank - y.rank);
		expect(ordered.map((i) => i.source.url)).toEqual([a.source.url, c.source.url, b.source.url]);
	});

	it('rank synthétique : générique très au-dessus du concret le plus faible', () => {
		const generic = mk(1, GENERIQUE, { geo_scope: 'monde', actionability: 'a_surveiller', maturity: 'speculatif' });
		const concret = mk(15, CONCRET, { geo_scope: 'monde', actionability: 'a_surveiller', maturity: 'speculatif' });
		const [g, c] = orderByFilmproImportance([generic, concret]).items;
		expect(g.rank).toBeGreaterThan(c.rank);
	});
});

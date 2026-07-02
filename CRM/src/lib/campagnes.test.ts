import { describe, it, expect } from 'vitest';
import { filterProspectsCampagne, type ProspectCampagne } from './campagnes';

/**
 * Filtre local du panneau « Prospects de la campagne » (pur, sans réseau).
 * Contrat : match sur raison sociale OU localité, insensible à la casse, requête vide -> tout
 * (copie neuve, jamais la référence d'origine), localité null tolérée.
 */
function p(id: string, raison_sociale: string, localite: string | null): ProspectCampagne {
	return { id, raison_sociale, adresse: null, npa: null, localite, statut: 'vide', score_pertinence: null, source: 'zefix', source_url: null, description: null };
}

const LIST: ProspectCampagne[] = [
	p('L1', 'Boutique Léman', 'Genève'),
	p('L2', 'Régie du Lac', 'Lausanne'),
	p('L3', 'Vitrerie Alpina', null),
];

describe('filterProspectsCampagne (filtre local du panneau prospects)', () => {
	it('requête vide ou blanche -> toute la liste, en copie neuve', () => {
		const out = filterProspectsCampagne(LIST, '   ');
		expect(out).toEqual(LIST);
		expect(out).not.toBe(LIST); // copie : le consommateur peut trier/muter sans toucher la source
	});

	it('matche la raison sociale, insensible à la casse ET aux accents (base romande)', () => {
		expect(filterProspectsCampagne(LIST, 'boutique').map((x) => x.id)).toEqual(['L1']);
		expect(filterProspectsCampagne(LIST, 'RÉGIE').map((x) => x.id)).toEqual(['L2']);
		expect(filterProspectsCampagne(LIST, 'regie').map((x) => x.id)).toEqual(['L2']); // sans accent
	});

	it('matche la localité (accents inclus), et tolère une localité null', () => {
		expect(filterProspectsCampagne(LIST, 'lausanne').map((x) => x.id)).toEqual(['L2']);
		expect(filterProspectsCampagne(LIST, 'geneve').map((x) => x.id)).toEqual(['L1']); // « Genève » sans accent
		expect(filterProspectsCampagne(LIST, 'alpina').map((x) => x.id)).toEqual(['L3']); // null ne jette pas
	});

	it('aucun match -> liste vide', () => {
		expect(filterProspectsCampagne(LIST, 'zurich')).toEqual([]);
	});
});

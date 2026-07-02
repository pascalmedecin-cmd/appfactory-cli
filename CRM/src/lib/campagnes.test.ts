import { describe, it, expect } from 'vitest';
import { filterProspectsCampagne, toPublicProspect, type ProspectCampagne } from './campagnes';

/**
 * Filtre local du panneau « Prospects de la campagne » (pur, sans réseau).
 * Contrat : match sur raison sociale OU localité, insensible à la casse, requête vide -> tout
 * (copie neuve, jamais la référence d'origine), localité null tolérée.
 */
function p(id: string, raison_sociale: string, localite: string | null): ProspectCampagne {
	return { id, raison_sociale, adresse: null, npa: null, localite, statut: 'vide', score_pertinence: null, source: 'zefix', source_url: null, description: null, google_types: null, groupe_id: null, validation_statut: null };
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

/**
 * Minimisation publique : la page /validation/<token> ne doit exposer QUE l'indispensable.
 * Le test de forme casse si un champ sensible (score, statut, source, description, google_types,
 * groupe_id) fuit un jour par recopie accidentelle du select serveur.
 */
describe('toPublicProspect (source unique de la minimisation publique)', () => {
	const full: ProspectCampagne = {
		id: 'L1',
		raison_sociale: 'Régie du Lac SA',
		adresse: 'Quai des Fleurs 12',
		npa: '1006',
		localite: 'Lausanne',
		statut: 'a_contacter',
		score_pertinence: 9,
		source: 'google_places',
		source_url: 'https://maps.google.com/?cid=1',
		description: 'DESCRIPTION SENSIBLE',
		google_types: ['real_estate_agency', 'establishment'],
		groupe_id: 'g1',
		validation_statut: 'garder',
	};

	it('expose EXACTEMENT les clés {adresse, decision, id, mapsUrl, nom}', () => {
		expect(Object.keys(toPublicProspect(full)).sort()).toEqual([
			'adresse',
			'decision',
			'id',
			'mapsUrl',
			'nom',
		]);
	});

	it('aucune clé sensible ne transite', () => {
		const pub = toPublicProspect(full) as unknown as Record<string, unknown>;
		for (const k of ['score_pertinence', 'statut', 'source', 'source_url', 'description', 'google_types', 'groupe_id', 'raison_sociale']) {
			expect(k in pub).toBe(false);
		}
	});

	it('projette nom/adresse/mapsUrl/decision correctement', () => {
		expect(toPublicProspect(full)).toEqual({
			id: 'L1',
			nom: 'Régie du Lac SA',
			adresse: 'Quai des Fleurs 12, 1006 Lausanne',
			mapsUrl: 'https://maps.google.com/?cid=1',
			decision: 'garder',
		});
	});

	it('mapsUrl null hors google_places ; decision null si non vérifié', () => {
		const pub = toPublicProspect({ ...full, source: 'zefix', validation_statut: null });
		expect(pub.mapsUrl).toBe(null);
		expect(pub.decision).toBe(null);
	});

	it('adresse composée robuste quand des champs manquent', () => {
		expect(toPublicProspect({ ...full, adresse: null, npa: null, localite: 'Sion' }).adresse).toBe('Sion');
		expect(toPublicProspect({ ...full, adresse: null, npa: null, localite: null }).adresse).toBe('');
	});
});

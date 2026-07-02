import { describe, it, expect } from 'vitest';
import {
	GROUPE_NOM_MAX,
	SANS_GROUPE_LABEL,
	humanizeGoogleType,
	typePrincipal,
	sortGroupes,
	groupeCounts,
	filterByGroupe,
	groupeSuggestions
} from './campagne-groupes';
import { sourceLabel } from './prospection-utils';
import type { ProspectCampagne } from './campagnes';

/**
 * Logique PURE des groupes de campagne (compteurs, filtre, tri, suggestions de
 * pré-remplissage). Contrats gelés : suggestions sur les SANS-GROUPE uniquement (le
 * pré-remplissage ne déplace jamais un prospect classé), tri déterministe, borne 24.
 */
function p(
	id: string,
	over: Partial<ProspectCampagne> = {}
): ProspectCampagne {
	return {
		id,
		raison_sociale: `Prospect ${id}`,
		adresse: null,
		npa: null,
		localite: null,
		statut: 'vide',
		score_pertinence: null,
		source: 'zefix',
		source_url: null,
		description: null,
		google_types: null,
		groupe_id: null,
		...over
	};
}

describe('constantes', () => {
	it('borne du nom = 24 (stress test étiquette de transition, ne pas changer sans re-mesurer)', () => {
		expect(GROUPE_NOM_MAX).toBe(24);
	});
	it('libellé sans groupe unique (étiquettes + PDF + panneau)', () => {
		expect(SANS_GROUPE_LABEL).toBe('Sans groupe');
	});
});

describe('humanizeGoogleType / typePrincipal', () => {
	it('humanise un token snake_case sans inventer de traduction', () => {
		expect(humanizeGoogleType('real_estate_agency')).toBe('Real estate agency');
		expect(humanizeGoogleType('')).toBe('');
	});
	it('type principal = 1er de la colonne structurée, null sinon', () => {
		expect(typePrincipal({ google_types: ['a_b', 'c_d'] })).toBe('a_b');
		expect(typePrincipal({ google_types: [] })).toBe(null);
		expect(typePrincipal({ google_types: null })).toBe(null);
	});
});

describe('sortGroupes', () => {
	it('alphabétique fr insensible à la casse, copie neuve (source non mutée)', () => {
		const src = [{ nom: 'écoles' }, { nom: 'Régies' }, { nom: 'architectes' }];
		const out = sortGroupes(src);
		expect(out.map((g) => g.nom)).toEqual(['architectes', 'écoles', 'Régies']);
		expect(src.map((g) => g.nom)).toEqual(['écoles', 'Régies', 'architectes']);
	});
});

describe('groupeCounts / filterByGroupe', () => {
	const list = [p('a', { groupe_id: 'g1' }), p('b', { groupe_id: 'g1' }), p('c', { groupe_id: 'g2' }), p('d')];

	it('compte par groupe + sans groupe', () => {
		const { byId, none } = groupeCounts(list);
		expect(byId.get('g1')).toBe(2);
		expect(byId.get('g2')).toBe(1);
		expect(none).toBe(1);
	});

	it('filtre null -> tout (copie), none -> sans groupe, id -> le groupe', () => {
		const all = filterByGroupe(list, null);
		expect(all).toEqual(list);
		expect(all).not.toBe(list);
		expect(filterByGroupe(list, 'none').map((x) => x.id)).toEqual(['d']);
		expect(filterByGroupe(list, 'g1').map((x) => x.id)).toEqual(['a', 'b']);
	});
});

describe('groupeSuggestions (pré-remplissage « + Groupe »)', () => {
	it('ignore les prospects déjà classés (ne déplace jamais un prospect d’un groupe)', () => {
		const list = [
			p('a', { source: 'google_places', google_types: ['real_estate_agency'], groupe_id: 'g1' }),
			p('b', { source: 'google_places', google_types: ['real_estate_agency'] })
		];
		const s = groupeSuggestions(list);
		expect(s).toHaveLength(1);
		expect(s[0]).toMatchObject({ key: 'type:real_estate_agency', count: 1, leadIds: ['b'] });
	});

	it('type Google principal pour les leads Google ; source pour les autres (infos externes)', () => {
		const list = [
			p('a', { source: 'google_places', google_types: ['architect', 'establishment'] }),
			p('b', { source: 'google_places', google_types: ['architect'] }),
			p('c', { source: 'zefix' }),
			p('d', { source: 'google_places', google_types: null }) // Google sans types -> compté par source
		];
		const s = groupeSuggestions(list);
		expect(s[0]).toMatchObject({ key: 'type:architect', label: 'Architect', count: 2, leadIds: ['a', 'b'] });
		const zefix = s.find((x) => x.key === 'source:zefix');
		expect(zefix).toMatchObject({ label: sourceLabel('zefix'), count: 1, leadIds: ['c'] });
		expect(s.find((x) => x.key === 'source:google_places')?.leadIds).toEqual(['d']);
	});

	it('tri : compteur décroissant puis libellé (déterministe)', () => {
		const list = [
			p('a', { source: 'google_places', google_types: ['b_type'] }),
			p('b', { source: 'google_places', google_types: ['a_type'] }),
			p('c', { source: 'google_places', google_types: ['a_type'] })
		];
		expect(groupeSuggestions(list).map((x) => x.key)).toEqual(['type:a_type', 'type:b_type']);
	});

	it('liste vide -> aucune suggestion', () => {
		expect(groupeSuggestions([])).toEqual([]);
	});
});

import { describe, it, expect } from 'vitest';
import {
	entreprisesIndicators,
	filterEntreprisesByTab,
	entreprisesCountsByTab,
	emptyMessageForTab,
	readPersistedView,
	persistView,
	contactCountForEntreprise,
	type EntrepriseLite,
	type ContactForEntrepriseLite,
} from './entreprisesFormat';

const e = (id: string, statut: string | null, canton: string | null = 'GE'): EntrepriseLite => ({
	id,
	statut_qualification: statut,
	canton,
});

const c = (entreprise_id: string | null): ContactForEntrepriseLite => ({ entreprise_id });

describe('entreprisesIndicators', () => {
	it('compte total/qualifiees/avecContact/sansCanton', () => {
		const entreprises = [
			e('e1', 'qualifie', 'GE'),
			e('e2', 'qualifie', 'VD'),
			e('e3', 'nouveau', 'GE'),
			e('e4', null, null),
			e('e5', 'en_cours', null),
		];
		const contacts = [c('e1'), c('e1'), c('e3'), c(null)];
		const r = entreprisesIndicators(entreprises, contacts);
		expect(r.total).toBe(5);
		expect(r.qualifiees).toBe(2);
		expect(r.avecContact).toBe(2); // e1 et e3
		expect(r.sansCanton).toBe(2); // e4 et e5
	});

	it('renvoie 0 sur listes vides', () => {
		const r = entreprisesIndicators([], []);
		expect(r).toEqual({ total: 0, qualifiees: 0, avecContact: 0, sansCanton: 0 });
	});

	it('ignore canton vide string ""', () => {
		const r = entreprisesIndicators([e('e1', 'qualifie', '')], []);
		expect(r.sansCanton).toBe(1);
	});
});

describe('filterEntreprisesByTab', () => {
	const entreprises = [
		e('e1', 'qualifie'),
		e('e2', 'nouveau'),
		e('e3', null),
		e('e4', 'en_cours'),
	];
	const contacts = [c('e1'), c('e2')];

	it('toutes : aucun filtre', () => {
		expect(filterEntreprisesByTab(entreprises, contacts, 'toutes')).toHaveLength(4);
	});

	it('qualifiees : statut=qualifie', () => {
		const r = filterEntreprisesByTab(entreprises, contacts, 'qualifiees');
		expect(r.map((x) => x.id)).toEqual(['e1']);
	});

	it('a-qualifier : nouveau OU null', () => {
		const r = filterEntreprisesByTab(entreprises, contacts, 'a-qualifier');
		expect(r.map((x) => x.id).sort()).toEqual(['e2', 'e3']);
	});

	it('sans-contact : entreprise sans aucun contact rattaché', () => {
		const r = filterEntreprisesByTab(entreprises, contacts, 'sans-contact');
		expect(r.map((x) => x.id).sort()).toEqual(['e3', 'e4']);
	});

	it('toutes : retourne une copie (pas de mutation)', () => {
		const r = filterEntreprisesByTab(entreprises, contacts, 'toutes');
		expect(r).not.toBe(entreprises);
	});
});

describe('entreprisesCountsByTab', () => {
	it('compte chaque tab', () => {
		const entreprises = [
			e('e1', 'qualifie'),
			e('e2', 'nouveau'),
			e('e3', null),
			e('e4', 'en_cours'),
		];
		const contacts = [c('e1')];
		const counts = entreprisesCountsByTab(entreprises, contacts);
		expect(counts.toutes).toBe(4);
		expect(counts.qualifiees).toBe(1);
		expect(counts['a-qualifier']).toBe(2);
		expect(counts['sans-contact']).toBe(3); // e2, e3, e4
	});

	it('listes vides → counts à 0', () => {
		expect(entreprisesCountsByTab([], [])).toEqual({
			toutes: 0,
			qualifiees: 0,
			'a-qualifier': 0,
			'sans-contact': 0,
		});
	});
});

describe('emptyMessageForTab', () => {
	it('retourne un message dédié par tab', () => {
		expect(emptyMessageForTab('toutes')).toContain('Aucune entreprise');
		expect(emptyMessageForTab('qualifiees')).toContain('qualifiée');
		expect(emptyMessageForTab('a-qualifier')).toContain('qualifiées');
		expect(emptyMessageForTab('sans-contact')).toContain('contact');
	});
});

describe('readPersistedView / persistView', () => {
	function makeFakeStorage(initial: Record<string, string> = {}) {
		const map = new Map(Object.entries(initial));
		return {
			getItem: (k: string) => map.get(k) ?? null,
			setItem: (k: string, v: string) => map.set(k, v),
			get _map() { return map; },
		};
	}

	it('retourne table par défaut si storage null', () => {
		expect(readPersistedView(null)).toBe('table');
		expect(readPersistedView(undefined)).toBe('table');
	});

	it('retourne cards si stocké cards', () => {
		const storage = makeFakeStorage({ 'crm.entreprises.view': 'cards' });
		expect(readPersistedView(storage)).toBe('cards');
	});

	it('retourne table pour valeur invalide ou absente', () => {
		expect(readPersistedView(makeFakeStorage())).toBe('table');
		expect(readPersistedView(makeFakeStorage({ 'crm.entreprises.view': 'garbage' }))).toBe('table');
	});

	it('persistView écrit dans storage', () => {
		const storage = makeFakeStorage();
		persistView(storage, 'cards');
		expect(storage._map.get('crm.entreprises.view')).toBe('cards');
	});

	it('persistView no-op si storage null', () => {
		expect(() => persistView(null, 'table')).not.toThrow();
	});

	it('readPersistedView avale les exceptions storage', () => {
		const throwing = {
			getItem: () => {
				throw new Error('SecurityError');
			},
		};
		expect(readPersistedView(throwing)).toBe('table');
	});

	it('persistView avale les exceptions storage', () => {
		const throwing = {
			setItem: () => {
				throw new Error('QuotaExceededError');
			},
		};
		expect(() => persistView(throwing, 'cards')).not.toThrow();
	});
});

describe('contactCountForEntreprise', () => {
	it('compte les contacts rattachés', () => {
		const contacts = [c('e1'), c('e1'), c('e2'), c(null)];
		expect(contactCountForEntreprise('e1', contacts)).toBe(2);
		expect(contactCountForEntreprise('e2', contacts)).toBe(1);
		expect(contactCountForEntreprise('e3', contacts)).toBe(0);
	});
});

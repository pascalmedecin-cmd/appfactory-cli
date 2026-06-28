import { describe, it, expect } from 'vitest';
import {
	emptyMessageForTab,
	readPersistedView,
	persistView,
	contactCountForEntreprise,
	type ContactForEntrepriseLite,
} from './entreprisesFormat';

// Refonte serveur Bloc A : les agrégats (indicators/filterByTab/countsByTab) sont passés serveur.
// Leur sémantique (qualifiees / a-qualifier / sans-contact / sansCanton) est désormais couverte
// par `$lib/server/entreprises-query.test.ts` (apply-functions) + le test de `load` (counts).

const c = (entreprise_id: string | null): ContactForEntrepriseLite => ({ entreprise_id });

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

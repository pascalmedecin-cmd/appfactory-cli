import { describe, it, expect } from 'vitest';
import {
	parseChecklistState,
	serializeChecklistState,
	toggleStep,
	pruneChecklistState,
	checklistProgress,
	CHECKLIST_STORAGE_KEY
} from './checklist';

describe('CHECKLIST_STORAGE_KEY', () => {
	it('est versionnée', () => {
		expect(CHECKLIST_STORAGE_KEY).toMatch(/\.v\d+$/);
	});
});

describe('parseChecklistState', () => {
	it('retourne un ensemble vide pour null / undefined / chaîne vide', () => {
		expect([...parseChecklistState(null)]).toEqual([]);
		expect([...parseChecklistState(undefined)]).toEqual([]);
		expect([...parseChecklistState('')]).toEqual([]);
	});
	it('retourne un ensemble vide pour du JSON corrompu', () => {
		expect([...parseChecklistState('{not json')]).toEqual([]);
		expect([...parseChecklistState('"a string"')]).toEqual([]);
		expect([...parseChecklistState('42')]).toEqual([]);
	});
	it('ne garde que les chaînes d\'un tableau JSON', () => {
		const state = parseChecklistState('["a:1", "b:2", 3, null, "c:3"]');
		expect([...state].sort()).toEqual(['a:1', 'b:2', 'c:3']);
	});
});

describe('serializeChecklistState', () => {
	it('produit un tableau JSON trié, stable', () => {
		expect(serializeChecklistState(new Set(['z', 'a', 'm']))).toBe('["a","m","z"]');
		expect(serializeChecklistState(new Set())).toBe('[]');
	});
	it('fait l\'aller-retour sans perte', () => {
		const original = new Set(['onboarding:tour', 'onboarding:connexion']);
		expect([...parseChecklistState(serializeChecklistState(original))].sort()).toEqual(
			[...original].sort()
		);
	});
});

describe('toggleStep', () => {
	it('ajoute une étape absente, retire une étape présente', () => {
		const a = toggleStep(new Set(), 'x');
		expect(a.has('x')).toBe(true);
		const b = toggleStep(a, 'x');
		expect(b.has('x')).toBe(false);
	});
	it('ne mute pas l\'état d\'origine', () => {
		const original = new Set(['x']);
		const next = toggleStep(original, 'y');
		expect([...original]).toEqual(['x']);
		expect(next.has('y')).toBe(true);
		expect(next.has('x')).toBe(true);
	});
});

describe('pruneChecklistState', () => {
	it('ne garde que les clés encore déclarées', () => {
		const state = new Set(['a:1', 'a:2', 'a:obsolete']);
		expect([...pruneChecklistState(state, ['a:1', 'a:2'])].sort()).toEqual(['a:1', 'a:2']);
	});
	it('renvoie un ensemble vide si plus aucune clé n\'est valide', () => {
		expect([...pruneChecklistState(new Set(['x']), [])]).toEqual([]);
	});
	it('ne mute pas l\'état d\'origine', () => {
		const original = new Set(['a:1', 'a:obsolete']);
		const pruned = pruneChecklistState(original, ['a:1']);
		expect([...original].sort()).toEqual(['a:1', 'a:obsolete']);
		expect([...pruned]).toEqual(['a:1']);
	});
	it('est sans effet si toutes les clés sont valides', () => {
		const state = new Set(['a:1', 'a:2']);
		expect([...pruneChecklistState(state, ['a:1', 'a:2', 'a:3'])].sort()).toEqual(['a:1', 'a:2']);
	});
});

describe('checklistProgress', () => {
	it('compte les étapes cochées et calcule un pourcentage entier', () => {
		expect(checklistProgress(new Set(['a', 'b']), 4)).toEqual({ done: 2, total: 4, percent: 50 });
		expect(checklistProgress(new Set(['a']), 3)).toEqual({ done: 1, total: 3, percent: 33 });
		expect(checklistProgress(new Set(['a', 'b', 'c']), 3)).toEqual({ done: 3, total: 3, percent: 100 });
	});
	it('renvoie 0 % quand le total est nul', () => {
		expect(checklistProgress(new Set(['a']), 0)).toEqual({ done: 0, total: 0, percent: 0 });
		expect(checklistProgress(new Set(['a']), -3)).toEqual({ done: 0, total: -3, percent: 0 });
	});
	it('arrondit le pourcentage (pas de troncature)', () => {
		expect(checklistProgress(new Set(['a', 'b']), 3).percent).toBe(67); // 66.6… → 67
	});
	it('borne le nombre fait par le total (clé obsolète non nettoyée)', () => {
		expect(checklistProgress(new Set(['a', 'b', 'c']), 2)).toEqual({ done: 2, total: 2, percent: 100 });
	});
});

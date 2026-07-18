import { describe, it, expect } from 'vitest';
import {
	ACTIVITY_TYPES,
	ACTIVITY_TYPES_FILMPRO,
	ACTIVITY_TYPES_LED,
	ACTIVITY_TYPES_ALL,
	activityTypesFor,
	defaultActivityKey,
	gpActivityOptionsFor,
	GP_ACTIVITY_OPTIONS,
} from './activity-types';

describe('activity-types marque-aware (#5)', () => {
	it('FilmPro = 9 cibles, défaut regies_syndics', () => {
		expect(ACTIVITY_TYPES_FILMPRO.length).toBe(9);
		expect(defaultActivityKey('filmpro')).toBe('regies_syndics');
	});

	it('LED = 7 cibles, défaut agences_evenementielles', () => {
		expect(ACTIVITY_TYPES_LED.length).toBe(7);
		expect(defaultActivityKey('led')).toBe('agences_evenementielles');
	});

	it('rétro-compat : ACTIVITY_TYPES === FilmPro + GP_ACTIVITY_OPTIONS FilmPro (non-régression)', () => {
		expect(ACTIVITY_TYPES).toBe(ACTIVITY_TYPES_FILMPRO);
		expect(GP_ACTIVITY_OPTIONS.map((o) => o.key)).toEqual(ACTIVITY_TYPES_FILMPRO.map((a) => a.key));
	});

	it('activityTypesFor / gpActivityOptionsFor par marque', () => {
		expect(activityTypesFor('led')).toBe(ACTIVITY_TYPES_LED);
		expect(gpActivityOptionsFor('led').map((o) => o.label)).toContain('Monteurs de stands et agencement d’expositions');
		expect(gpActivityOptionsFor('filmpro').map((o) => o.label)).toContain('Régies immobilières et syndics de copropriété');
	});

	it('défaut sûr : marque inconnue → FilmPro', () => {
		// @ts-expect-error test du repli runtime
		expect(activityTypesFor('xxx')).toBe(ACTIVITY_TYPES_FILMPRO);
	});

	it('union = clés des 2 marques, chaque cible a un keyword (sauf other=null)', () => {
		const keys = ACTIVITY_TYPES_ALL.map((a) => a.key);
		expect(keys).toContain('regies_syndics');
		expect(keys).toContain('agences_evenementielles');
		expect(keys).toContain('signaletique_enseignes');
		for (const a of ACTIVITY_TYPES_ALL) {
			if (a.key === 'other') expect(a.keyword).toBeNull();
			else expect(typeof a.keyword).toBe('string');
		}
	});

	it('« other » présent (dernier) dans les 2 marques', () => {
		expect(activityTypesFor('filmpro').at(-1)?.key).toBe('other');
		expect(activityTypesFor('led').at(-1)?.key).toBe('other');
	});
});

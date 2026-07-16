import { describe, it, expect } from 'vitest';
import { isBandeauActive } from './pageBandeau';
import { DEFAULT_FEATURE_FLAGS } from '$lib/types/feature-flags';

const OFF = DEFAULT_FEATURE_FLAGS;
const ON = { ...DEFAULT_FEATURE_FLAGS, ffPageBandeau: true };

describe('isBandeauActive - source unique du bandeau de page', () => {
	it('faux si le flag est OFF, quelle que soit la route', () => {
		expect(isBandeauActive(OFF, '/crm/entreprises')).toBe(false);
		expect(isBandeauActive(null, '/crm/entreprises')).toBe(false);
		expect(isBandeauActive(undefined, '/crm/entreprises')).toBe(false);
	});

	it('vrai si flag ON ET route adoptée', () => {
		expect(isBandeauActive(ON, '/crm/entreprises')).toBe(true);
	});

	it('faux si flag ON mais route non adoptée', () => {
		expect(isBandeauActive(ON, '/crm/campagnes')).toBe(false);
		expect(isBandeauActive(ON, '/crm')).toBe(false);
	});

	it('match exact : ni slash final ni sous-route ne matchent', () => {
		expect(isBandeauActive(ON, '/crm/entreprises/')).toBe(false);
		expect(isBandeauActive(ON, '/crm/entreprises/123')).toBe(false);
	});
});

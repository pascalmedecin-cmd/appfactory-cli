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
		for (const route of [
			'/crm',
			'/crm/entreprises',
			'/crm/contacts',
			'/crm/pipeline',
			'/crm/signaux',
			'/crm/campagnes',
			'/crm/prospection',
			'/crm/reporting',
			'/crm/aide',
		]) {
			expect(isBandeauActive(ON, route)).toBe(true);
		}
	});

	it('faux si flag ON mais route non adoptée', () => {
		// Veille : identité magazine, traitement particulier (maquette à valider).
		expect(isBandeauActive(ON, '/crm/veille')).toBe(false);
		// Sous-routes détail : hors copy validée.
		expect(isBandeauActive(ON, '/crm/veille/123')).toBe(false);
		expect(isBandeauActive(ON, '/crm/campagnes/123')).toBe(false);
	});

	it('match exact : ni slash final ni sous-route ne matchent', () => {
		expect(isBandeauActive(ON, '/crm/entreprises/')).toBe(false);
		expect(isBandeauActive(ON, '/crm/entreprises/123')).toBe(false);
		// Le dashboard '/crm' matche en exact, jamais /crm/quelquechose via startsWith.
		expect(isBandeauActive(ON, '/crm/')).toBe(false);
	});
});

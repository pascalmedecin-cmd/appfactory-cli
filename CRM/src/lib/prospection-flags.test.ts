import { describe, it, expect } from 'vitest';
import {
	isProspectionSourceEnabled,
	filterEnabledSources,
	isProspectionFeatureEnabled,
} from './prospection-flags';

/**
 * V5 (2026-06-07) : la Prospection redevient un outil de recherche de contact à la demande.
 * Les imports de masse (Google Places, SIMAP, RegBL) et les features d'acquisition de masse
 * (recherches sauvegardées, alertes, enrichissement batch) sont coupés par flag.
 * Ces tests verrouillent l'état produit V5 (un retour en arrière délibéré devra les mettre à jour).
 */
describe('prospection-flags V5', () => {
	it('coupe les imports de masse (Google Places / SIMAP / RegBL)', () => {
		expect(isProspectionSourceEnabled('google_places')).toBe(false);
		expect(isProspectionSourceEnabled('simap')).toBe(false);
		expect(isProspectionSourceEnabled('regbl')).toBe(false);
	});

	it('garde la recherche nominale (zefix / search.ch) + terrain + veille', () => {
		expect(isProspectionSourceEnabled('zefix')).toBe(true);
		expect(isProspectionSourceEnabled('search_ch')).toBe(true);
		expect(isProspectionSourceEnabled('lead_express')).toBe(true);
		expect(isProspectionSourceEnabled('veille')).toBe(true);
	});

	it('source inconnue → false (pas de crash, défaut sûr)', () => {
		expect(isProspectionSourceEnabled('inconnue')).toBe(false);
	});

	it('filterEnabledSources ne garde que les sources actives (ordre préservé)', () => {
		expect(filterEnabledSources(['zefix', 'search_ch', 'google_places'])).toEqual(['zefix', 'search_ch']);
		expect(filterEnabledSources(['simap'])).toEqual([]);
		expect(filterEnabledSources(['regbl'])).toEqual([]);
		expect(filterEnabledSources(['lead_express', 'veille'])).toEqual(['lead_express', 'veille']);
	});

	it('features d\'acquisition de masse coupées', () => {
		expect(isProspectionFeatureEnabled('savedSearches')).toBe(false);
		expect(isProspectionFeatureEnabled('alerts')).toBe(false);
		expect(isProspectionFeatureEnabled('batchEnrichment')).toBe(false);
	});
});

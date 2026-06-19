import { describe, it, expect, vi } from 'vitest';

/**
 * Mini-projet Prospection P1 (2026-06-18) - preuve de RÉVERSIBILITÉ.
 *
 * Critère d'acceptation : « `sources.simap.enabled=true` (fixture) fait réapparaître l'onglet
 * sans autre modif. » On mocke `$lib/config` avec la source `simap` réactivée et on vérifie que
 * la visibilité dérivée (isProspectionTabVisible / visibleProspectionTabs / defaultProspectionTab)
 * réaffiche l'onglet SIMAP, sans toucher au code applicatif. L'état V5 nominal (simap masqué)
 * est lui couvert par `prospection-flags.test.ts` (config réelle, non mockée).
 */
vi.mock('$lib/config', () => ({
	config: {
		// Bloc minimal lu par prospection-utils au chargement du module (sinon crash à l'import).
		scoring: {
			labels: { chaud: 8, tiede: 4 },
			cantonsPrioritaires: { values: ['GE', 'VD', 'VS'] },
			cantonsSecondaires: { values: ['NE', 'FR', 'JU'] },
		},
		prospection: {
			sources: {
				zefix: { enabled: true },
				simap: { enabled: true }, // ← seule différence vs V5 : source réactivée
				search_ch: { enabled: true },
				regbl: { enabled: false },
				google_places: { enabled: false },
				lead_express: { enabled: true },
				veille: { enabled: true },
			},
			features: { savedSearches: false, alerts: false, batchEnrichment: false },
		},
	},
}));

import {
	isProspectionTabVisible,
	visibleProspectionTabs,
	defaultProspectionTab,
} from './prospection-flags';

describe('réversibilité onglets Prospection (P1) - config simap réactivée', () => {
	it('réactiver sources.simap.enabled=true fait réapparaître l\'onglet SIMAP, sans autre modif', () => {
		expect(isProspectionTabVisible('simap')).toBe(true);
		expect(visibleProspectionTabs()).toEqual(['simap', 'entreprises', 'terrain']);
	});

	it('regbl reste coupé → son onglet reste absent (la réversibilité est par-source)', () => {
		expect(isProspectionTabVisible('regbl')).toBe(false);
		expect(visibleProspectionTabs()).not.toContain('regbl');
	});

	it('le défaut redevient simap (premier onglet visible) une fois simap réactivé', () => {
		expect(defaultProspectionTab()).toBe('simap');
	});
});

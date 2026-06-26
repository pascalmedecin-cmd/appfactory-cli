import { describe, it, expect } from 'vitest';
import {
	isProspectionSourceEnabled,
	filterEnabledSources,
	isProspectionFeatureEnabled,
	isProspectionTabVisible,
	visibleProspectionTabs,
	defaultProspectionTab,
	isChipExecutable,
} from './prospection-flags';
import { ChipKindEnum } from './server/intelligence/schema';
import { config } from './config';

/**
 * V5 (2026-06-07) : la Prospection redevient un outil de recherche de contact à la demande.
 * SIMAP/RegBL (imports de masse redondants/inactionnables) et les features d'acquisition de masse
 * (recherches sauvegardées, alertes, enrichissement batch) restent coupés par flag.
 * P2 (2026-06-18) : Google Places est RÉTABLI (garde-fou quota visible, cap 900/mois = 0 débit).
 * Ces tests verrouillent l'état produit (un retour en arrière délibéré devra les mettre à jour).
 */
describe('prospection-flags V5 + P2', () => {
	it('coupe les imports de masse redondants/inactionnables (SIMAP / RegBL)', () => {
		expect(isProspectionSourceEnabled('simap')).toBe(false);
		expect(isProspectionSourceEnabled('regbl')).toBe(false);
	});

	it('garde la recherche nominale (zefix / search.ch / google_places) + terrain + veille', () => {
		expect(isProspectionSourceEnabled('zefix')).toBe(true);
		expect(isProspectionSourceEnabled('search_ch')).toBe(true);
		// P2 : Google Places rétabli (cap applicatif 900/mois, blocage 429 sans appel API).
		expect(isProspectionSourceEnabled('google_places')).toBe(true);
		expect(isProspectionSourceEnabled('lead_express')).toBe(true);
		expect(isProspectionSourceEnabled('veille')).toBe(true);
	});

	it('source inconnue → false (pas de crash, défaut sûr)', () => {
		expect(isProspectionSourceEnabled('inconnue')).toBe(false);
	});

	it('filterEnabledSources ne garde que les sources actives (ordre préservé)', () => {
		// P2 : google_places rétabli → conservé dans le filtre des sources de l'onglet Entreprises.
		expect(filterEnabledSources(['zefix', 'search_ch', 'google_places'])).toEqual(['zefix', 'search_ch', 'google_places']);
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

/**
 * Mini-projet Prospection P1 (2026-06-18) : la page n'expose plus que les onglets dont ≥1 source
 * est active. SIMAP/RegBL ayant toutes leurs sources coupées en V5, leurs onglets disparaissent.
 * La visibilité dérive des flags de source (réversible) — la réversibilité explicite (réactiver
 * simap dans config) est prouvée dans `prospection-tab-visibility.test.ts` (config mockée).
 */
describe('visibilité des onglets Prospection (P1)', () => {
	it('masque un onglet dont aucune source n\'est active (simap, regbl)', () => {
		expect(isProspectionTabVisible('simap')).toBe(false);
		expect(isProspectionTabVisible('regbl')).toBe(false);
	});

	it('garde un onglet avec ≥1 source active (entreprises via zefix/search.ch, terrain via lead_express/veille)', () => {
		expect(isProspectionTabVisible('entreprises')).toBe(true);
		expect(isProspectionTabVisible('terrain')).toBe(true);
	});

	it('visibleProspectionTabs ne renvoie que les onglets actifs, ordre canonique préservé', () => {
		expect(visibleProspectionTabs()).toEqual(['entreprises', 'terrain']);
	});

	it('defaultProspectionTab = premier onglet visible (entreprises, plus simap)', () => {
		expect(defaultProspectionTab()).toBe('entreprises');
	});
});


/**
 * Bloc C (2026-06-26) : un chip Veille n'est auto-exécutable que si sa source cible
 * (kind === clé de source) est active. Les chips RegBL/SIMAP (sources dormantes V5)
 * ne sont PAS exécutables -> l'UI propose la copie du terme et l'endpoint
 * from-intelligence renvoie 403 avant tout round-trip interne. Réversible par flag.
 */
describe('isChipExecutable (chips -> sources actives uniquement)', () => {
	it('chip zefix exécutable (seule source vivante)', () => {
		expect(isChipExecutable('zefix')).toBe(true);
	});
	it('chips simap / regbl NON exécutables (dormants V5)', () => {
		expect(isChipExecutable('simap')).toBe(false);
		expect(isChipExecutable('regbl')).toBe(false);
	});
	it('kind inconnu -> non exécutable (défaut sûr)', () => {
		expect(isChipExecutable('inconnue')).toBe(false);
	});
});

/**
 * Invariant central de Bloc C : isChipExecutable(kind) === isProspectionSourceEnabled(kind)
 * ne tient QUE si tout ChipKind est une vraie clé de config.prospection.sources. Sinon un
 * nouveau kind sans source correspondante serait silencieusement NON exécutable (défaut sûr
 * false), une dérive enum/config déguisée en état produit. Ce test convertit la dérive en échec.
 */
describe('invariant ChipKind sous-ensemble des clés config.prospection.sources', () => {
	it('chaque kind de chip correspond à une vraie source prospection', () => {
		const sourceKeys = Object.keys(config.prospection.sources);
		for (const kind of ChipKindEnum.options) {
			expect(sourceKeys).toContain(kind);
		}
	});
});

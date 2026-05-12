/**
 * Limites et quotas des API externes : source de vérité centralisée.
 *
 * search.ch : 1 000 req/mois, max 20 résultats/req (documenté officiellement)
 * Zefix : pas de limites publiées, maxEntries 250 (Swagger officiel), convention 1 req/sec
 * SIMAP : pas de limites publiées, accès public gratuit
 * RegBL : Level A public, fair use (geo.admin.ch)
 * Google Places (Text Search New) : facturé au SKU le plus cher du field mask. Avec
 *   nationalPhoneNumber + websiteUri → SKU Enterprise (~35 USD/1000 req), MAIS quota
 *   mensuel gratuit ~1 000 événements/mois sur ce SKU (changement Google mars 2025, qui a
 *   remplacé le crédit universel de 200 USD/mois). Cap applicatif 900 = sous le seuil
 *   gratuit → coût réel 0 USD à ce volume. Vérifié recherche web 2026-05-12.
 *   Sources : developers.google.com/maps/billing-and-pricing/{pricing,march-2025},
 *   woosmap.com/blog/google-maps-api-pricing-breakdown.
 */

export const API_LIMITS = {
	search_ch: {
		label: 'search.ch',
		monthlyQuota: 1000,
		maxResultsPerQuery: 20,
		/** Seuil d'avertissement (% du quota mensuel) */
		warningThreshold: 0.8,
		/** Seuil critique */
		criticalThreshold: 0.95,
		/** Délai entre requêtes batch (ms) */
		batchDelay: 500,
	},
	zefix: {
		label: 'Zefix',
		monthlyQuota: null as number | null, // pas de quota publié
		maxResultsPerQuery: 250,
		batchDelay: 300,
		/** Convention communautaire : 1 req/sec minimum */
		minInterval: 1000,
	},
	simap: {
		label: 'SIMAP',
		monthlyQuota: null as number | null, // pas de quota publié
		maxResultsPerQuery: null as number | null,
		batchDelay: 500,
	},
	google_places: {
		label: 'Google Places',
		/** Cap applicatif mensuel (refus 429 au-delà). Choisi sous le seuil gratuit Google (~1000/mois). */
		monthlyRequestCap: 900,
		/** Allocation mensuelle gratuite estimée sur le SKU Enterprise (Text Search New). */
		freeMonthlyAllowance: 1000,
		/** Coût indicatif au-delà du quota gratuit (USD/req, SKU Enterprise). Sert à l'affichage d'alerte uniquement. */
		costPerRequestUsdBeyondFree: 0.035,
		maxResultsPerQuery: 20,
		warningThreshold: 0.8,
		criticalThreshold: 0.95,
		batchDelay: 0,
	},
} as const;

/**
 * État du quota Google Places pour le mois courant, calculé depuis l'usage déjà consommé.
 * `remaining` = recherches encore disponibles avant le cap applicatif.
 */
export function googlePlacesQuotaStatus(used: number): {
	used: number;
	cap: number;
	remaining: number;
	exhausted: boolean;
	warning: string | null;
} {
	const cap = API_LIMITS.google_places.monthlyRequestCap;
	const remaining = Math.max(0, cap - used);
	const ratio = used / cap;
	let warning: string | null = null;
	if (ratio >= API_LIMITS.google_places.criticalThreshold) {
		warning = `Quota Google Places presque épuisé : ${used}/${cap} recherches ce mois.`;
	} else if (ratio >= API_LIMITS.google_places.warningThreshold) {
		warning = `Quota Google Places élevé : ${used}/${cap} recherches ce mois.`;
	}
	return { used, cap, remaining, exhausted: remaining <= 0, warning };
}

/** Nombre max de leads enrichissables en un batch pour rester dans les limites search.ch */
export const SEARCH_CH_SAFE_BATCH_SIZE = 50;

/**
 * Estime le coût en requêtes search.ch pour un batch d'enrichissement.
 * Chaque lead = 1 requête search.ch.
 */
export function estimateSearchChCost(leadCount: number): {
	requests: number;
	percentOfMonthly: number;
	warning: string | null;
} {
	const requests = leadCount;
	const percentOfMonthly = (requests / API_LIMITS.search_ch.monthlyQuota) * 100;

	let warning: string | null = null;
	if (percentOfMonthly >= 95) {
		warning = `Ce batch utiliserait ${percentOfMonthly.toFixed(0)}% de votre quota mensuel search.ch (${API_LIMITS.search_ch.monthlyQuota} requêtes/mois). Risque d'épuisement.`;
	} else if (percentOfMonthly >= 50) {
		warning = `Ce batch consommera ${requests} requêtes sur ${API_LIMITS.search_ch.monthlyQuota}/mois (${percentOfMonthly.toFixed(0)}%).`;
	}

	return { requests, percentOfMonthly, warning };
}

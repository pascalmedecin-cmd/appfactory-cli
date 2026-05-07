/**
 * Limites et quotas des API externes : source de vérité centralisée.
 *
 * search.ch : 1 000 req/mois, max 20 résultats/req (documenté officiellement)
 * Zefix : pas de limites publiées, maxEntries 250 (Swagger officiel), convention 1 req/sec
 * SIMAP : pas de limites publiées, accès public gratuit
 * RegBL : Level A public, fair use (geo.admin.ch)
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
} as const;

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

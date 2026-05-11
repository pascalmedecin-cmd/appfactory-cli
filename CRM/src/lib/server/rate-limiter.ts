/**
 * Rate limiter in-memory par clé (IP), fenêtre glissante simple.
 *
 * Extrait de `hooks.server.ts` (audit 360 M-14) pour :
 *  - implémenter une éviction LRU plutôt qu'un fail-closed quand la map est
 *    pleine (anti-DoS par rotation d'IP : un attaquant ne peut plus saturer
 *    la map et verrouiller tous les nouveaux clients légitimes) ;
 *  - rendre le comportement testable (cap injectable) ;
 *  - permettre un cleanup propre (HMR dev via `dispose()`).
 *
 * La Map JS conserve l'ordre d'insertion → `map.keys().next().value` est la
 * clé la plus ancienne. Pas un vrai LRU « par accès » (on ne réordonne pas sur
 * hit), mais suffisant : couplé au nettoyage périodique, la map reste bornée.
 */
export interface RateLimiter {
	/** Retourne `true` si la requête est autorisée, `false` si quota dépassé. */
	check(key: string): boolean;
	/** Arrête le timer de nettoyage périodique (à appeler en HMR dispose). */
	dispose(): void;
	/** Nombre d'entrées suivies (lecture seule, utile aux tests). */
	readonly size: number;
}

export interface RateLimiterOptions {
	/** Durée de la fenêtre en ms. */
	windowMs: number;
	/** Nombre max de requêtes autorisées par clé dans la fenêtre. */
	max: number;
	/** Plafond mémoire : nombre max d'entrées suivies (au-delà → éviction LRU). */
	mapCap: number;
	/** Intervalle du nettoyage périodique des entrées expirées (défaut 60 s). */
	cleanupIntervalMs?: number;
}

export function createRateLimiter(opts: RateLimiterOptions): RateLimiter {
	const { windowMs, max, mapCap } = opts;
	const map = new Map<string, { count: number; resetAt: number }>();

	function check(key: string): boolean {
		const now = Date.now();
		const entry = map.get(key);

		if (!entry || now > entry.resetAt) {
			// Audit 360 M-14 : éviction LRU si plein, au lieu de bloquer tout le monde.
			if (!entry && map.size >= mapCap) {
				const oldest = map.keys().next().value;
				if (oldest !== undefined) map.delete(oldest);
			}
			map.set(key, { count: 1, resetAt: now + windowMs });
			return true;
		}

		if (entry.count >= max) return false;
		entry.count++;
		return true;
	}

	const cleanup = setInterval(() => {
		const now = Date.now();
		for (const [k, e] of map) {
			if (now > e.resetAt) map.delete(k);
		}
	}, opts.cleanupIntervalMs ?? 60_000);

	// Ne pas garder le process Node en vie juste pour ce timer (no-op en edge runtime).
	if (typeof (cleanup as { unref?: () => void }).unref === 'function') {
		(cleanup as { unref: () => void }).unref();
	}

	return {
		check,
		dispose: () => clearInterval(cleanup),
		get size() {
			return map.size;
		}
	};
}

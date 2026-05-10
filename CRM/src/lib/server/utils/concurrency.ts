/**
 * Helper concurrence bornée pour les opérations bulk async (HEAD/GET URLs,
 * appels API tiers, etc.). Évite le `Promise.all(items.map(fn))` illimité
 * qui peut saturer les sockets et déclencher des bans IP côté serveurs cibles.
 *
 * Audit 360 V2b H-03 : `recheck-historical` bouclait sur 500+ items avec
 * Promise.all illimité → ban IP cron + timeout serveur.
 *
 * Implémentation : N workers consommant un index partagé. Préserve l'ordre
 * input → output (results[i] correspond à fn(items[i])). Erreurs propagées
 * via reject de la première Promise du worker (comportement Promise.all).
 */
export async function runWithConcurrency<T, R>(
	items: ReadonlyArray<T>,
	concurrency: number,
	fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
	if (concurrency < 1) {
		throw new Error(`runWithConcurrency: concurrency must be >= 1, got ${concurrency}`);
	}
	const results: R[] = new Array(items.length);
	let nextIndex = 0;

	async function worker(): Promise<void> {
		while (true) {
			const i = nextIndex++;
			if (i >= items.length) return;
			results[i] = await fn(items[i], i);
		}
	}

	const workerCount = Math.min(concurrency, items.length);
	const workers = Array.from({ length: workerCount }, () => worker());
	await Promise.all(workers);
	return results;
}

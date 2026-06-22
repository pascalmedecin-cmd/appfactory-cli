// Récupération d'URL mal-formée pour la veille FilmPro (2026-06-22, cause racine W25).
//
// Le modèle émet parfois une URL avec un suffixe de chemin PARASITE (type `/ts`,
// `/j`, `/sd`) qui 404 alors que l'article réel existe (W25 : 3 items « monde »
// perdus au filtre amont pour ce motif). On récupère l'URL réelle de deux façons,
// JAMAIS en fabriquant une URL :
//  1. matching contre les URLs réellement retournées par web_search (ground truth
//     présent dans les blocs web_search_tool_result de la réponse) ;
//  2. fallback : retrait d'un suffixe de chemin court parasite de l'URL DU MODÈLE
//     lui-même (on ne crée rien, on retire un bout).
//
// GARANTIES (refonte-lot1-lot2-spec.md AC-2, I3) :
//  - JAMAIS de substitution cross-domaine (un host différent = vraie altération →
//    on ne récupère pas. Cas 3M W25 : modèle `3m.com/.../b...013/j`, citation réelle
//    `3msuisse.ch/.../b...011/` → host différent → PAS récupéré, rejet correct).
//  - JAMAIS de substitution vers un chemin différent (seulement « même chemin à un
//    segment court parasite près »).
//  - Toute URL récupérée est RE-VÉRIFIÉE live par l'appelant (substituée seulement
//    si elle répond) ; le cross-check verbatim en aval reste le backstop (si la page
//    récupérée ne porte pas les faits annoncés → rejet).

/** Segment de chemin court alpha en fin d'URL, signature d'un suffixe parasite LLM. */
const TRAILING_JUNK_SEGMENT_RE = /\/([a-z]{1,3})$/i;

/** Codes langue/région ISO légitimes : NE PAS amputer en fallback (un /fr réel n'est pas parasite). */
const LOCALE_SEGMENTS = new Set(['fr', 'de', 'en', 'it', 'es', 'rm', 'nl', 'pt', 'ch', 'eu']);

function normHost(hostname: string): string {
	return hostname.toLowerCase().replace(/^www\./, '');
}

function stripTrailingSlash(path: string): string {
	return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

/**
 * Extrait toutes les URLs réelles des résultats web_search d'une réponse Anthropic.
 * Défensif : tolère toute forme inattendue (retourne [] plutôt que de throw).
 */
export function extractSearchResultUrls(raw: unknown): string[] {
	const out = new Set<string>();
	const msg = raw as { content?: unknown } | null;
	const content = msg && Array.isArray(msg.content) ? msg.content : [];
	for (const block of content) {
		const b = block as { type?: unknown; content?: unknown };
		if (b?.type !== 'web_search_tool_result') continue;
		const results = Array.isArray(b.content) ? b.content : [];
		for (const r of results) {
			const u = (r as { url?: unknown })?.url;
			if (typeof u === 'string' && /^https?:\/\//i.test(u)) out.add(u);
		}
	}
	return [...out];
}

/**
 * Tente de récupérer l'URL réelle d'un item dont l'URL a échoué (404/network),
 * sans rien fabriquer. Retourne une URL candidate (à re-vérifier par l'appelant)
 * ou null si aucune récupération sûre n'est possible.
 */
export function recoverUrl(failedUrl: string, knownUrls: readonly string[]): string | null {
	let failed: URL;
	try {
		failed = new URL(failedUrl);
	} catch {
		return null;
	}
	const fHost = normHost(failed.hostname);
	const fPath = stripTrailingSlash(failed.pathname);

	// 1. Citation match : même host + le chemin d'une URL réelle est le chemin émis
	//    amputé d'un segment court parasite (cas W25 /ts, /sd). Ground truth d'abord.
	for (const k of knownUrls) {
		let ku: URL;
		try {
			ku = new URL(k);
		} catch {
			continue;
		}
		if (normHost(ku.hostname) !== fHost) continue;
		const kPath = stripTrailingSlash(ku.pathname);
		if (kPath === fPath) return k; // identique (sécurité, ne devrait pas arriver)
		if (fPath.startsWith(kPath + '/')) {
			const extra = fPath.slice(kPath.length + 1);
			if (/^[a-z]{1,3}$/i.test(extra)) return k;
		}
	}

	// 2. Fallback : retirer le suffixe de chemin court parasite de l'URL DU MODÈLE.
	//    UNIQUEMENT si aucune citation n'est disponible (run dégradé, extraction
	//    impossible). Dès qu'on a la ground truth des citations et qu'AUCUNE ne
	//    matche le host, l'URL est suspecte (cas 3M altéré : host 3m.com absent des
	//    citations 3msuisse.ch) → on NE récupère PAS, l'item sera rejeté (anti-hallu).
	const junkMatch = knownUrls.length === 0 ? fPath.match(TRAILING_JUNK_SEGMENT_RE) : null;
	if (junkMatch && !LOCALE_SEGMENTS.has(junkMatch[1].toLowerCase())) {
		const stripped = stripTrailingSlash(fPath.replace(TRAILING_JUNK_SEGMENT_RE, ''));
		if (stripped && stripped !== fPath && stripped !== '/') {
			const rebuilt = new URL(failed.toString());
			rebuilt.pathname = stripped;
			return rebuilt.toString();
		}
	}

	return null;
}

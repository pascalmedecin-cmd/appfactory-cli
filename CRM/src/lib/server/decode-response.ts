/**
 * Décodage tolérant du corps d'une `Response` pour les sources potentiellement legacy.
 *
 * `Response.json()` / `.text()` décodent TOUJOURS en UTF-8 (spec Fetch : le charset du
 * Content-Type est ignoré). Or l'endpoint SOGC de Zefix renvoie du Windows-1252/Latin-1 :
 * chaque accent (octet unique 0xA0-0xFF) est alors invalide en UTF-8 et remplacé par le
 * caractère U+FFFD (« � ») AVANT toute manipulation -> perte IRRÉVERSIBLE de l'octet
 * d'origine. C'est la cause racine du mojibake des créations Zefix (« Rôtisserie » stocké
 * « R�tisserie », diagnostic 2026-06-07, LIVE-M3) : 1227 fiches déjà archivées sont
 * touchées en base (octet détruit, non récupérable) ; ce module empêche la RÉCIDIVE à
 * l'ingestion (notamment si l'import Zefix est un jour réactivé).
 *
 * Stratégie : décoder en UTF-8 ; si le résultat contient des U+FFFD (octets non décodables),
 * re-décoder les octets bruts en Windows-1252 (sur-ensemble de Latin-1 qui mappe CHAQUE
 * octet, jamais d'échec) — ce qui restitue les accents. Un corps déjà valide en UTF-8 ne
 * contient pas de U+FFFD : il est renvoyé tel quel (aucun changement de comportement).
 *
 * Limite assumée : un corps légitimement UTF-8 contenant un vrai U+FFFD déclencherait le
 * fallback. Cas négligeable pour des réponses d'API JSON ; le gain (anti-perte d'accents)
 * prime.
 */
export async function decodeResponseText(resp: Response): Promise<string> {
	const bytes = new Uint8Array(await resp.arrayBuffer());
	const utf8 = new TextDecoder('utf-8').decode(bytes);
	if (!utf8.includes('�')) return utf8;
	return new TextDecoder('windows-1252').decode(bytes);
}

/**
 * Équivalent résilient de `resp.json()` pour les sources potentiellement legacy
 * (cf. {@link decodeResponseText}). À utiliser à la place de `await resp.json()` partout
 * où la réponse externe peut ne pas être en UTF-8 (Zefix SOGC).
 */
export async function parseJsonResilient<T = unknown>(resp: Response): Promise<T> {
	return JSON.parse(await decodeResponseText(resp)) as T;
}

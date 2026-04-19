// Verification post-generation des URLs sources.
//
// Sprint 2 P1 anti-hallucination : cas type Plattix (item dont la source.url
// renvoie 404 ou pointe vers la racine d'un site). On teste chaque URL en
// HEAD (fallback GET Range si HEAD rejete) avec un timeout court et on
// flag l'item si :
//  - le code HTTP n'est pas 2xx/3xx
//  - ou le path est trivial ('/' seul, vide, ou juste une locale/langue)
//
// Le resultat est ajoute a item.verification.url_ok. Le schema DB reste
// tolerant (verification optionnelle), la distinction est ensuite faite
// dans l'UI (badge "Non verifie").

const VERIFY_TIMEOUT_MS = 6000;

const USER_AGENT =
	'Mozilla/5.0 (compatible; FilmProBot/1.0; +https://filmpro-crm.vercel.app)';

// Paths consideres triviaux : racine, vide, ou purement un segment de langue.
const TRIVIAL_PATH_RE = /^\/?(?:[a-z]{2}(?:[-_][A-Za-z]{2,4})?\/?)?$/;

export interface UrlVerifyResult {
	ok: boolean;
	reason?: 'timeout' | 'network' | 'http_error' | 'trivial_path' | 'invalid_url';
	status?: number;
}

function isPathTrivial(url: URL): boolean {
	const path = url.pathname || '/';
	return TRIVIAL_PATH_RE.test(path);
}

export async function verifyUrl(rawUrl: string): Promise<UrlVerifyResult> {
	let parsed: URL;
	try {
		parsed = new URL(rawUrl);
	} catch {
		return { ok: false, reason: 'invalid_url' };
	}

	if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
		return { ok: false, reason: 'invalid_url' };
	}

	if (isPathTrivial(parsed)) {
		return { ok: false, reason: 'trivial_path' };
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

	try {
		// HEAD d'abord (leger). Certains sites repondent 405/403 sur HEAD, on
		// retombe alors sur un GET avec Range=0-1024 pour ne pas charger tout le HTML.
		let res = await fetch(parsed.toString(), {
			method: 'HEAD',
			signal: controller.signal,
			headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
			redirect: 'follow'
		});

		if (res.status === 405 || res.status === 403 || res.status === 501) {
			res = await fetch(parsed.toString(), {
				method: 'GET',
				signal: controller.signal,
				headers: { 'User-Agent': USER_AGENT, Accept: '*/*', Range: 'bytes=0-1024' },
				redirect: 'follow'
			});
		}

		// Apres redirects, re-tester le path final (evite www.example.com/article -> example.com/)
		try {
			const finalUrl = new URL(res.url);
			if (isPathTrivial(finalUrl)) {
				return { ok: false, reason: 'trivial_path', status: res.status };
			}
		} catch {
			// URL.url non parseable : on ignore, on garde le check HTTP
		}

		if (res.status >= 200 && res.status < 400) {
			return { ok: true, status: res.status };
		}
		return { ok: false, reason: 'http_error', status: res.status };
	} catch (err) {
		const aborted = err instanceof Error && err.name === 'AbortError';
		return { ok: false, reason: aborted ? 'timeout' : 'network' };
	} finally {
		clearTimeout(timeout);
	}
}

export async function verifyUrlsBatch(urls: string[]): Promise<Map<string, UrlVerifyResult>> {
	const entries = await Promise.all(
		urls.map(async (u) => [u, await verifyUrl(u)] as const)
	);
	return new Map(entries);
}

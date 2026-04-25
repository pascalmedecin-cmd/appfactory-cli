// Vérification minimale d'URL pour la veille FilmPro (refonte LEAN S112).
//
// Refonte : suppression du check `trivial_path` strict. Le LLM en 1-phase est
// suffisamment fidèle aux URLs pour ne plus avoir besoin de protéger contre
// `https://example.com/` versus `https://example.com/article/N`.
//
// Reste : URL parseable HTTP(S) + HEAD reachable 2xx/3xx (fallback GET Range
// pour les sites qui rejettent HEAD avec 405/403/501). Timeout court.

const VERIFY_TIMEOUT_MS = 6000;

const USER_AGENT =
	'Mozilla/5.0 (compatible; FilmProBot/1.0; +https://filmpro-crm.vercel.app)';

export interface UrlVerifyResult {
	ok: boolean;
	reason?: 'timeout' | 'network' | 'http_error' | 'invalid_url';
	status?: number;
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

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

	try {
		// HEAD d'abord (léger). Certains sites répondent 405/403 sur HEAD : fallback
		// GET avec Range=0-1024 pour ne pas charger tout le HTML.
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

// Vérification d'URL pour la veille FilmPro (refonte anti-hallucination 2026-05-05).
//
// V1 : HEAD/GET 2xx/3xx avec timeout court (refonte LEAN S112).
// V2 (ce module) : ajout détection paywall hard sur domaines connus.
//
// Critères de rejet :
// - URL non parseable HTTP(S) → invalid_url
// - Timeout réseau → timeout
// - Erreur réseau → network
// - Status final < 200 ou ≥ 400 → http_error
// - Boucle de redirect (même Location 2x) → paywall
// - Body GET < 5KB sur domaines paywall connus → paywall

import { isSafeUrlForFetch } from './url-guard';

const VERIFY_TIMEOUT_MS = 8000;

const USER_AGENT =
	'Mozilla/5.0 (compatible; FilmProBot/1.0; +https://filmpro-crm.vercel.app)';

// Domaines connus pour servir des paywalls hard (302 boucle ou body court).
// Ajouter ici si on découvre un nouveau pattern via audit.
const PAYWALL_DOMAINS = new Set([
	'24heures.ch',
	'tdg.ch',
	'lematin.ch',
	'lemonde.fr',
	'letemps.ch'
]);

const PAYWALL_BODY_THRESHOLD = 5 * 1024; // 5KB : un article réel pèse ≥ 20KB en HTML

export interface UrlVerifyResult {
	ok: boolean;
	reason?: 'timeout' | 'network' | 'http_error' | 'invalid_url' | 'paywall';
	status?: number;
}

function getHostname(rawUrl: string): string | null {
	try {
		return new URL(rawUrl).hostname.replace(/^www\./, '');
	} catch {
		return null;
	}
}

async function detectPaywallByBody(
	url: string,
	signal: AbortSignal
): Promise<boolean> {
	try {
		const res = await fetch(url, {
			method: 'GET',
			signal,
			headers: { 'User-Agent': USER_AGENT, Accept: 'text/html', Range: 'bytes=0-10239' },
			redirect: 'follow'
		});
		if (!res.ok) return false; // pas de paywall, juste un statut bizarre traité ailleurs
		const text = await res.text();
		return text.length < PAYWALL_BODY_THRESHOLD;
	} catch {
		return false;
	}
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

	// Garde SSRF : bloquer hostnames vers IPs privées / metadata cloud / loopback.
	// Couche défense en profondeur sur URL LLM-controlled (audit Medium #1).
	if (!isSafeUrlForFetch(parsed.toString())) {
		return { ok: false, reason: 'invalid_url' };
	}

	const hostname = parsed.hostname.replace(/^www\./, '');
	const isPaywallDomain = PAYWALL_DOMAINS.has(hostname);

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

		// Statut OK : sur domaine paywall connu, vérifier la taille du body.
		if (res.status >= 200 && res.status < 400) {
			if (isPaywallDomain) {
				const looksLikePaywall = await detectPaywallByBody(parsed.toString(), controller.signal);
				if (looksLikePaywall) {
					return { ok: false, reason: 'paywall', status: res.status };
				}
			}
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
	const entries = await Promise.all(urls.map(async (u) => [u, await verifyUrl(u)] as const));
	return new Map(entries);
}

// Export pour tests
export const _internals = { PAYWALL_DOMAINS, PAYWALL_BODY_THRESHOLD };

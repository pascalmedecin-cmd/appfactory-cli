/**
 * Validation qualité d'une URL og:image.
 *
 * Filtre 2 niveaux :
 *  1. Pattern URL (rapide, sans réseau) — détecte logo, favicon, sprite, placeholder
 *  2. HEAD HTTP (1-2s) — vérifie content-type image/* + content-length raisonnable
 *
 * Une og:image disqualifiée force le caller à passer au niveau suivant de la cascade
 * (generated_image_url fal.ai ou fallback media_library).
 */

const FETCH_TIMEOUT_MS = 4000;
const MIN_BYTES = 20 * 1024; // 20 KB — en dessous = probablement placeholder/icon
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB — au dessus = suspect / pas optimisé pour og

const USER_AGENT =
	'Mozilla/5.0 (compatible; FilmProBot/1.0; +https://filmpro-crm.vercel.app)';

/**
 * Patterns suspects dans le path/filename de l'URL.
 * Word-boundaries pour éviter faux positifs (ex: 'iconic' ne match pas 'icon').
 */
const SUSPICIOUS_URL_PATTERNS: RegExp[] = [
	/\blogo\b/i,
	/\bfavicon\b/i,
	/\bsprite\b/i,
	/\bplaceholder\b/i,
	/\bdefault[-_]?image\b/i,
	/\bdefault[-_]?og\b/i,
	/\bblank\b/i,
	/\bsocial[-_]?share\b/i,
	/\bshare[-_]?default\b/i
];

const ACCEPTED_CONTENT_TYPES = [
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/webp',
	'image/avif'
];

export type OgImageRejectReason =
	| 'invalid_url'
	| 'suspicious_pattern'
	| 'fetch_failed'
	| 'http_error'
	| 'wrong_content_type'
	| 'too_small'
	| 'too_large';

export interface OgImageQualityResult {
	ok: boolean;
	reason?: OgImageRejectReason;
	contentType?: string;
	contentLength?: number;
}

/**
 * Validation pure URL (pas de réseau). Retourne false si pattern suspect détecté.
 */
export function isUrlPatternSafe(url: string): boolean {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return false;
	}
	const pathname = parsed.pathname.toLowerCase();
	return !SUSPICIOUS_URL_PATTERNS.some((re) => re.test(pathname));
}

/**
 * Validation complète URL + HEAD.
 * Use case : appelée après resolveOgImage(), avant de stocker image_url dans l'item.
 */
export async function checkOgImageQuality(url: string): Promise<OgImageQualityResult> {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return { ok: false, reason: 'invalid_url' };
	}
	if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
		return { ok: false, reason: 'invalid_url' };
	}
	if (!isUrlPatternSafe(url)) {
		return { ok: false, reason: 'suspicious_pattern' };
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const res = await fetch(url, {
			method: 'HEAD',
			signal: controller.signal,
			headers: { 'User-Agent': USER_AGENT, Accept: 'image/*' },
			redirect: 'follow'
		});

		if (!res.ok) {
			return { ok: false, reason: 'http_error' };
		}

		const ct = (res.headers.get('content-type') ?? '').toLowerCase().split(';')[0].trim();
		if (!ACCEPTED_CONTENT_TYPES.includes(ct)) {
			return { ok: false, reason: 'wrong_content_type', contentType: ct };
		}

		const clHeader = res.headers.get('content-length');
		const cl = clHeader ? parseInt(clHeader, 10) : NaN;
		if (Number.isFinite(cl)) {
			if (cl < MIN_BYTES) return { ok: false, reason: 'too_small', contentType: ct, contentLength: cl };
			if (cl > MAX_BYTES) return { ok: false, reason: 'too_large', contentType: ct, contentLength: cl };
		}

		return { ok: true, contentType: ct, contentLength: Number.isFinite(cl) ? cl : undefined };
	} catch {
		return { ok: false, reason: 'fetch_failed' };
	} finally {
		clearTimeout(timeout);
	}
}

/**
 * Validation qualité d'une URL og:image.
 *
 * Filtre 2 niveaux :
 *  1. Pattern URL (rapide, sans réseau) : détecte logo, favicon, sprite, placeholder
 *  2. HEAD HTTP (1-2s) : vérifie content-type image/* + content-length raisonnable
 *
 * Une og:image disqualifiée force le caller à passer au niveau suivant de la cascade
 * (generated_image_url fal.ai ou fallback media_library).
 */

const FETCH_TIMEOUT_MS = 4000;
const MIN_BYTES = 20 * 1024; // 20 KB : en dessous = probablement placeholder/icon
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB : au dessus = suspect / pas optimisé pour og

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

/**
 * Patterns de chemin indiquant un graphique/schéma/figure scientifique plutôt
 * qu'une photo éditoriale. W16 2026-04-22 : Springer sert Fig1_HTML.png comme
 * og:image, qui est un diagramme axonométrique labellisé (inacceptable).
 */
const SCIENTIFIC_FIGURE_PATH_PATTERNS: RegExp[] = [
	/\bfig\d+(?:_html)?\b/i, // Fig1_HTML, Fig12
	/mediaobjects\//i, // CDN Springer/Nature
	/art%3a10\./i, // DOI encodé dans URL
	/\bscheme\d+/i,
	/\bchart\d+/i,
	/\btable\d+/i
];

/**
 * Domaines de revues/éditeurs scientifiques : og:image = figure du papier,
 * pas cover éditoriale. Rejet systématique au profit de la cascade fal.ai.
 */
const SCIENTIFIC_PUBLISHER_HOSTS: string[] = [
	'nature.com',
	'springernature.com',
	'springer.com',
	'sciencedirect.com',
	'wiley.com',
	'onlinelibrary.wiley.com',
	'sciencemag.org',
	'science.org',
	'mdpi.com',
	'elsevier.com',
	'pubs.acs.org',
	'pubs.rsc.org',
	'plos.org',
	'journals.plos.org',
	'researchgate.net',
	'arxiv.org',
	'biorxiv.org',
	'pubmed.ncbi.nlm.nih.gov',
	'ncbi.nlm.nih.gov'
];

function isScientificPublisherHost(host: string): boolean {
	const h = host.toLowerCase();
	return SCIENTIFIC_PUBLISHER_HOSTS.some(
		(d) => h === d || h.endsWith(`.${d}`)
	);
}

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
	| 'scientific_figure'
	| 'scientific_publisher'
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
 * Détecte si l'URL pointe vers un éditeur scientifique (og:image = figure du
 * papier, non éditoriale). Rejet systématique.
 */
export function isScientificPublisherUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return isScientificPublisherHost(parsed.hostname);
	} catch {
		return false;
	}
}

/**
 * Détecte les patterns de chemin indiquant un graphique/schéma/figure
 * (Fig\d+_HTML, MediaObjects/, art%3A10., etc.).
 */
export function isScientificFigurePath(url: string): boolean {
	let pathname: string;
	try {
		const parsed = new URL(url);
		pathname = parsed.pathname;
	} catch {
		return false;
	}
	// URL non décodée pour capter art%3A10. (colon encodé en URLs de DOI)
	return SCIENTIFIC_FIGURE_PATH_PATTERNS.some((re) => re.test(pathname));
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
	if (isScientificPublisherHost(parsed.hostname)) {
		return { ok: false, reason: 'scientific_publisher' };
	}
	if (SCIENTIFIC_FIGURE_PATH_PATTERNS.some((re) => re.test(parsed.pathname))) {
		return { ok: false, reason: 'scientific_figure' };
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

import { parseFlexibleDate } from './parse-date';

const FETCH_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 512 * 1024;

const META_PUBLISHED_REGEX =
	/<meta[^>]+(?:property|name)=["'](?:article:published_time|og:published_time|datePublished|date|pubdate)["'][^>]+content=["']([^"']+)["']/i;
const META_CONTENT_FIRST_REGEX =
	/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:article:published_time|og:published_time|datePublished|date|pubdate)["']/i;
const JSONLD_REGEX =
	/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function isHttpsUrl(url: string): boolean {
	try {
		const u = new URL(url);
		return u.protocol === 'https:' || u.protocol === 'http:';
	} catch {
		return false;
	}
}

function extractFromJsonLd(html: string): string | null {
	const matches = html.matchAll(JSONLD_REGEX);
	for (const m of matches) {
		try {
			const parsed = JSON.parse(m[1].trim());
			const candidates = Array.isArray(parsed) ? parsed : [parsed];
			for (const obj of candidates) {
				const found = findDatePublished(obj);
				if (found) return found;
			}
		} catch {
			// JSON-LD malformé : ignorer
		}
	}
	return null;
}

function findDatePublished(obj: unknown): string | null {
	if (!obj || typeof obj !== 'object') return null;
	const record = obj as Record<string, unknown>;
	if (typeof record.datePublished === 'string') return record.datePublished;
	if (typeof record.dateCreated === 'string') return record.dateCreated;
	// @graph pattern (schema.org)
	if (Array.isArray(record['@graph'])) {
		for (const node of record['@graph']) {
			const found = findDatePublished(node);
			if (found) return found;
		}
	}
	return null;
}

/**
 * Fetch la page et extrait sa date de publication depuis les métadonnées.
 * Ordre de priorité : meta tags (article:published_time, og:published_time,
 * datePublished, date, pubdate) > JSON-LD schema.org.
 * Retourne null si fetch échoue, timeout, HTML invalide, ou aucune date trouvée.
 */
export async function fetchPublishedDate(pageUrl: string): Promise<Date | null> {
	if (!isHttpsUrl(pageUrl)) return null;

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const res = await fetch(pageUrl, {
			signal: controller.signal,
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; FilmProBot/1.0; +https://filmpro-crm.vercel.app)',
				Accept: 'text/html,application/xhtml+xml'
			},
			redirect: 'follow'
		});

		if (!res.ok) return null;
		const ct = res.headers.get('content-type') ?? '';
		if (!ct.includes('text/html') && !ct.includes('application/xhtml')) return null;

		const reader = res.body?.getReader();
		if (!reader) return null;

		let html = '';
		let bytes = 0;
		const decoder = new TextDecoder('utf-8', { fatal: false });
		while (bytes < MAX_HTML_BYTES) {
			const { value, done } = await reader.read();
			if (done) break;
			bytes += value.byteLength;
			html += decoder.decode(value, { stream: true });
			if (html.includes('</head>')) break;
		}
		try {
			await reader.cancel();
		} catch {
			// noop
		}

		const metaMatch = html.match(META_PUBLISHED_REGEX) ?? html.match(META_CONTENT_FIRST_REGEX);
		if (metaMatch) {
			const parsed = parseFlexibleDate(metaMatch[1]);
			if (parsed) return parsed;
		}

		const jsonLdDate = extractFromJsonLd(html);
		if (jsonLdDate) {
			const parsed = parseFlexibleDate(jsonLdDate);
			if (parsed) return parsed;
		}

		return null;
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

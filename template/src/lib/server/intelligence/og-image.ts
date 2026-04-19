/**
 * Résout l'image Open Graph d'une URL (meta og:image ou twitter:image).
 *
 * Le filtrage qualité (logo, placeholder, taille) est appliqué séparément par
 * le pipeline cron via checkOgImageQuality (./og-image-quality.ts) : séparation
 * volontaire pour faciliter le test unitaire de la résolution pure.
 */

const FETCH_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 512 * 1024; // 512 Ko suffit, les metas sont en <head>

const OG_IMAGE_REGEX =
	/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i;
const CONTENT_FIRST_REGEX =
	/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i;

function isHttpsUrl(url: string): boolean {
	try {
		const u = new URL(url);
		return u.protocol === 'https:' || u.protocol === 'http:';
	} catch {
		return false;
	}
}

function absolutize(imageUrl: string, pageUrl: string): string | null {
	try {
		return new URL(imageUrl, pageUrl).toString();
	} catch {
		return null;
	}
}

export async function resolveOgImage(pageUrl: string): Promise<string | null> {
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

		// Lecture plafonnée : og:image est toujours dans <head>, inutile de tout charger
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

		const match = html.match(OG_IMAGE_REGEX) ?? html.match(CONTENT_FIRST_REGEX);
		if (!match) return null;

		const absolute = absolutize(match[1], pageUrl);
		if (!absolute || !isHttpsUrl(absolute)) return null;
		if (absolute.length > 500) return null;

		return absolute;
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

/**
 * Enrichit un tableau d'items en résolvant image_url depuis source.url quand
 * elle est absente. Parallélise les requêtes avec limite de concurrence.
 */
export async function enrichItemsWithOgImages<
	T extends { source: { url: string }; image_url: string | null }
>(items: T[], concurrency = 3): Promise<T[]> {
	const targets = items
		.map((item, idx) => ({ item, idx }))
		.filter(({ item }) => !item.image_url);

	if (targets.length === 0) return items;

	const result = [...items];
	let cursor = 0;

	async function worker() {
		while (cursor < targets.length) {
			const current = targets[cursor++];
			const image = await resolveOgImage(current.item.source.url);
			if (image) {
				result[current.idx] = { ...current.item, image_url: image };
			}
		}
	}

	await Promise.all(
		Array.from({ length: Math.min(concurrency, targets.length) }, () => worker())
	);

	return result;
}

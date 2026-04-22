import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	isUrlPatternSafe,
	isScientificPublisherUrl,
	isScientificFigurePath,
	checkOgImageQuality
} from './og-image-quality';

describe('isUrlPatternSafe', () => {
	it('accepte URLs propres', () => {
		expect(isUrlPatternSafe('https://example.com/article-image.jpg')).toBe(true);
		expect(isUrlPatternSafe('https://cdn.x/wp-content/uploads/2026/04/hero.png')).toBe(true);
	});

	it('rejette URLs contenant "logo"', () => {
		expect(isUrlPatternSafe('https://example.com/site-logo.png')).toBe(false);
		expect(isUrlPatternSafe('https://x.com/wp/uploads/blog-image-with-logo.png')).toBe(false);
	});

	it('rejette URLs contenant "favicon"', () => {
		expect(isUrlPatternSafe('https://example.com/favicon.ico')).toBe(false);
	});

	it('rejette URLs contenant "placeholder" / "default-image"', () => {
		expect(isUrlPatternSafe('https://example.com/placeholder.jpg')).toBe(false);
		expect(isUrlPatternSafe('https://example.com/default-image.png')).toBe(false);
		expect(isUrlPatternSafe('https://example.com/default_og.jpg')).toBe(false);
	});

	it('rejette "social-share" / "share-default"', () => {
		expect(isUrlPatternSafe('https://example.com/social-share.png')).toBe(false);
		expect(isUrlPatternSafe('https://example.com/share-default.jpg')).toBe(false);
	});

	it('rejette URLs malformées', () => {
		expect(isUrlPatternSafe('not-a-url')).toBe(false);
	});

	it('insensible à la casse', () => {
		expect(isUrlPatternSafe('https://example.com/LOGO.png')).toBe(false);
		expect(isUrlPatternSafe('https://example.com/Favicon.ico')).toBe(false);
	});

	it("n'invalide pas les substrings contextuels (boundary)", () => {
		// "iconic" ne doit pas matcher 'icon' (boundary protège)
		expect(isUrlPatternSafe('https://example.com/iconic-design.jpg')).toBe(true);
	});
});

describe('isScientificPublisherUrl', () => {
	it('rejette hosts nature.com / springernature.com / sciencedirect.com', () => {
		expect(isScientificPublisherUrl('https://www.nature.com/articles/s41598-026-46722-4')).toBe(true);
		expect(
			isScientificPublisherUrl(
				'https://media.springernature.com/full/springer-static/image/art%3A10.1038%2Fs41598-026-46722-4/MediaObjects/41598_2026_46722_Fig1_HTML.png'
			)
		).toBe(true);
		expect(isScientificPublisherUrl('https://www.sciencedirect.com/science/article/pii/XYZ')).toBe(true);
	});

	it('rejette sous-domaines de publishers', () => {
		expect(isScientificPublisherUrl('https://link.springer.com/article/10.1007/foo')).toBe(true);
		expect(isScientificPublisherUrl('https://journals.plos.org/plosone/article?id=X')).toBe(true);
	});

	it('accepte médias généralistes', () => {
		expect(isScientificPublisherUrl('https://www.letemps.ch/article/foo')).toBe(false);
		expect(isScientificPublisherUrl('https://www.rts.ch/info/bar')).toBe(false);
		expect(isScientificPublisherUrl('https://www.20min.ch/story/baz')).toBe(false);
	});

	it('URL invalide : false (pas de crash)', () => {
		expect(isScientificPublisherUrl('not-a-url')).toBe(false);
	});
});

describe('isScientificFigurePath', () => {
	it('détecte Fig1_HTML, Fig12, Scheme3', () => {
		expect(isScientificFigurePath('https://cdn.x/path/Fig1_HTML.png')).toBe(true);
		expect(isScientificFigurePath('https://cdn.x/path/Fig12.jpg')).toBe(true);
		expect(isScientificFigurePath('https://cdn.x/Scheme3.png')).toBe(true);
	});

	it('détecte MediaObjects/ (CDN Springer)', () => {
		expect(
			isScientificFigurePath(
				'https://media.springernature.com/full/x/MediaObjects/41598_2026_46722_Fig1_HTML.png'
			)
		).toBe(true);
	});

	it('détecte DOI encodé art%3A10.', () => {
		expect(
			isScientificFigurePath(
				'https://media.springernature.com/full/springer-static/image/art%3A10.1038%2Fs41598-026-46722-4/MediaObjects/41598_2026_46722_Fig1_HTML.png'
			)
		).toBe(true);
	});

	it('accepte chemins photos standard', () => {
		expect(isScientificFigurePath('https://cdn.x/wp-content/uploads/2026/04/hero.jpg')).toBe(false);
		expect(isScientificFigurePath('https://cdn.x/photos/building.jpg')).toBe(false);
	});

	it("n'invalide pas 'config' ou 'figuration' (boundary)", () => {
		expect(isScientificFigurePath('https://cdn.x/configuration.jpg')).toBe(false);
		expect(isScientificFigurePath('https://cdn.x/figurant.jpg')).toBe(false);
	});
});

describe('checkOgImageQuality', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('rejette URL avec pattern suspect (sans HEAD)', async () => {
		const result = await checkOgImageQuality('https://example.com/site-logo.png');
		expect(result.ok).toBe(false);
		expect(result.reason).toBe('suspicious_pattern');
		expect(fetch).not.toHaveBeenCalled();
	});

	it('rejette host éditeur scientifique avant HEAD', async () => {
		const result = await checkOgImageQuality(
			'https://media.springernature.com/full/springer-static/image/art%3A10.1038%2Fs41598-026-46722-4/MediaObjects/41598_2026_46722_Fig1_HTML.png'
		);
		expect(result.ok).toBe(false);
		expect(result.reason).toBe('scientific_publisher');
		expect(fetch).not.toHaveBeenCalled();
	});

	it('rejette chemin figure scientifique avant HEAD', async () => {
		const result = await checkOgImageQuality('https://cdn.example.com/papers/Fig1_HTML.png');
		expect(result.ok).toBe(false);
		expect(result.reason).toBe('scientific_figure');
		expect(fetch).not.toHaveBeenCalled();
	});

	it('accepte image jpeg avec content-length raisonnable', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			new Response(null, {
				status: 200,
				headers: { 'content-type': 'image/jpeg', 'content-length': '150000' }
			})
		);
		const result = await checkOgImageQuality('https://cdn.example.com/hero.jpg');
		expect(result.ok).toBe(true);
		expect(result.contentType).toBe('image/jpeg');
		expect(result.contentLength).toBe(150000);
	});

	it('rejette content-type non-image', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			new Response(null, {
				status: 200,
				headers: { 'content-type': 'text/html' }
			})
		);
		const result = await checkOgImageQuality('https://example.com/page.jpg');
		expect(result.ok).toBe(false);
		expect(result.reason).toBe('wrong_content_type');
	});

	it('rejette image trop petite (<20 KB)', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			new Response(null, {
				status: 200,
				headers: { 'content-type': 'image/png', 'content-length': '5000' }
			})
		);
		const result = await checkOgImageQuality('https://cdn.example.com/icon.png');
		expect(result.ok).toBe(false);
		expect(result.reason).toBe('too_small');
	});

	it('rejette image trop grande (>8 MB)', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			new Response(null, {
				status: 200,
				headers: {
					'content-type': 'image/jpeg',
					'content-length': String(20 * 1024 * 1024)
				}
			})
		);
		const result = await checkOgImageQuality('https://cdn.example.com/huge.jpg');
		expect(result.ok).toBe(false);
		expect(result.reason).toBe('too_large');
	});

	it('rejette HTTP error', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			new Response(null, { status: 404 })
		);
		const result = await checkOgImageQuality('https://example.com/missing.jpg');
		expect(result.ok).toBe(false);
		expect(result.reason).toBe('http_error');
	});

	it('accepte sans content-length (status 200 + content-type ok)', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			new Response(null, {
				status: 200,
				headers: { 'content-type': 'image/webp' }
			})
		);
		const result = await checkOgImageQuality('https://cdn.example.com/x.webp');
		expect(result.ok).toBe(true);
	});

	it('rejette en cas d\'exception réseau', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ETIMEDOUT'));
		const result = await checkOgImageQuality('https://example.com/timeout.jpg');
		expect(result.ok).toBe(false);
		expect(result.reason).toBe('fetch_failed');
	});
});

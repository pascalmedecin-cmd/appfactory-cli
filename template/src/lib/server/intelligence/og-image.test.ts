import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveOgImage, enrichItemsWithOgImages } from './og-image';

function mockHtmlResponse(html: string, contentType = 'text/html; charset=utf-8') {
	return new Response(html, {
		status: 200,
		headers: { 'content-type': contentType }
	});
}

describe('resolveOgImage', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('extrait og:image avec URL absolue', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockHtmlResponse(
				'<html><head><meta property="og:image" content="https://cdn.example.com/hero.jpg"></head><body></body></html>'
			)
		);
		const result = await resolveOgImage('https://example.com/article');
		expect(result).toBe('https://cdn.example.com/hero.jpg');
	});

	it('rend absolue une URL relative depuis la page source', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockHtmlResponse(
				'<html><head><meta property="og:image" content="/img/hero.jpg"></head></html>'
			)
		);
		const result = await resolveOgImage('https://news.ch/article/42');
		expect(result).toBe('https://news.ch/img/hero.jpg');
	});

	it('fallback twitter:image si og:image absent', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockHtmlResponse(
				'<html><head><meta name="twitter:image" content="https://cdn.example.com/tw.jpg"></head></html>'
			)
		);
		const result = await resolveOgImage('https://example.com/a');
		expect(result).toBe('https://cdn.example.com/tw.jpg');
	});

	it('retourne null si pas de meta og:image/twitter:image', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockHtmlResponse('<html><head><title>Sans OG</title></head></html>')
		);
		const result = await resolveOgImage('https://example.com/sans-og');
		expect(result).toBeNull();
	});

	it('retourne null sur HTTP error', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			new Response('not found', { status: 404 })
		);
		const result = await resolveOgImage('https://example.com/404');
		expect(result).toBeNull();
	});

	it('retourne null sur content-type non-HTML', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockHtmlResponse('not html', 'application/pdf')
		);
		const result = await resolveOgImage('https://example.com/doc.pdf');
		expect(result).toBeNull();
	});

	it('retourne null sur exception reseau', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ETIMEDOUT'));
		const result = await resolveOgImage('https://example.com/timeout');
		expect(result).toBeNull();
	});

	it('rejette URL non http(s)', async () => {
		const result = await resolveOgImage('ftp://example.com/x');
		expect(result).toBeNull();
		expect(fetch).not.toHaveBeenCalled();
	});
});

describe('enrichItemsWithOgImages', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('enrichit uniquement les items sans image_url', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(() =>
			Promise.resolve(
				mockHtmlResponse('<meta property="og:image" content="https://cdn.x/hero.jpg">')
			)
		);
		const items = [
			{ source: { url: 'https://a.ch/1' }, image_url: null },
			{ source: { url: 'https://b.ch/2' }, image_url: 'https://cdn.b/existing.jpg' },
			{ source: { url: 'https://c.ch/3' }, image_url: null }
		];
		const result = await enrichItemsWithOgImages(items);
		expect(result[0].image_url).toBe('https://cdn.x/hero.jpg');
		expect(result[1].image_url).toBe('https://cdn.b/existing.jpg');
		expect(result[2].image_url).toBe('https://cdn.x/hero.jpg');
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	it('laisse image_url null si OG introuvable', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockHtmlResponse('<html><head></head></html>')
		);
		const items = [{ source: { url: 'https://a.ch/1' }, image_url: null }];
		const result = await enrichItemsWithOgImages(items);
		expect(result[0].image_url).toBeNull();
	});

	it('no-op si tous les items ont deja image_url', async () => {
		const items = [{ source: { url: 'https://a.ch/1' }, image_url: 'https://cdn/existing.jpg' }];
		const result = await enrichItemsWithOgImages(items);
		expect(result).toEqual(items);
		expect(fetch).not.toHaveBeenCalled();
	});
});

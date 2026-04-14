import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchPublishedDate } from './fetch-og-date';

function mockHtmlResponse(html: string, contentType = 'text/html; charset=utf-8') {
	return new Response(html, {
		status: 200,
		headers: { 'content-type': contentType }
	});
}

describe('fetchPublishedDate', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('extrait article:published_time', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockHtmlResponse(
				'<html><head><meta property="article:published_time" content="2026-04-14T10:00:00Z"></head></html>'
			)
		);
		const d = await fetchPublishedDate('https://example.com/a');
		expect(d?.toISOString()).toBe('2026-04-14T10:00:00.000Z');
	});

	it('extrait og:published_time', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockHtmlResponse(
				'<html><head><meta property="og:published_time" content="2026-04-10"></head></html>'
			)
		);
		const d = await fetchPublishedDate('https://example.com/a');
		expect(d?.toISOString()).toBe('2026-04-10T00:00:00.000Z');
	});

	it('extrait JSON-LD datePublished', async () => {
		const ld = JSON.stringify({ '@type': 'Article', datePublished: '2026-04-12T08:00:00Z' });
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockHtmlResponse(
				`<html><head><script type="application/ld+json">${ld}</script></head></html>`
			)
		);
		const d = await fetchPublishedDate('https://example.com/a');
		expect(d?.toISOString()).toBe('2026-04-12T08:00:00.000Z');
	});

	it('extrait JSON-LD @graph imbriqué', async () => {
		const ld = JSON.stringify({
			'@context': 'https://schema.org',
			'@graph': [{ '@type': 'WebSite' }, { '@type': 'Article', datePublished: '2026-04-11' }]
		});
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockHtmlResponse(
				`<html><head><script type="application/ld+json">${ld}</script></head></html>`
			)
		);
		const d = await fetchPublishedDate('https://example.com/a');
		expect(d?.toISOString()).toBe('2026-04-11T00:00:00.000Z');
	});

	it('priorité meta > JSON-LD', async () => {
		const ld = JSON.stringify({ '@type': 'Article', datePublished: '2020-01-01' });
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockHtmlResponse(
				`<html><head><meta property="article:published_time" content="2026-04-14">` +
					`<script type="application/ld+json">${ld}</script></head></html>`
			)
		);
		const d = await fetchPublishedDate('https://example.com/a');
		expect(d?.toISOString()).toBe('2026-04-14T00:00:00.000Z');
	});

	it('retourne null si aucune meta', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockHtmlResponse('<html><head><title>Test</title></head></html>')
		);
		expect(await fetchPublishedDate('https://example.com/a')).toBeNull();
	});

	it('retourne null si HTTP error', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			new Response('', { status: 404 })
		);
		expect(await fetchPublishedDate('https://example.com/a')).toBeNull();
	});

	it('retourne null si content-type non HTML', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
		);
		expect(await fetchPublishedDate('https://example.com/a')).toBeNull();
	});

	it('retourne null si fetch rejette', async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'));
		expect(await fetchPublishedDate('https://example.com/a')).toBeNull();
	});

	it('rejette URL non HTTP(S)', async () => {
		expect(await fetchPublishedDate('javascript:alert(1)')).toBeNull();
		expect(await fetchPublishedDate('')).toBeNull();
	});
});

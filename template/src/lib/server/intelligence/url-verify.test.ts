import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyUrl } from './url-verify';

describe('verifyUrl', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('refuse les URL invalides', async () => {
		const r = await verifyUrl('not a url');
		expect(r.ok).toBe(false);
		expect(r.reason).toBe('invalid_url');
	});

	it('refuse les schemes non-http', async () => {
		const r = await verifyUrl('javascript:alert(1)');
		expect(r.ok).toBe(false);
		expect(r.reason).toBe('invalid_url');
	});

	it('refuse la racine seule', async () => {
		const r = await verifyUrl('https://example.com/');
		expect(r.ok).toBe(false);
		expect(r.reason).toBe('trivial_path');
	});

	it('refuse un path purement de langue', async () => {
		const r = await verifyUrl('https://example.com/fr/');
		expect(r.ok).toBe(false);
		expect(r.reason).toBe('trivial_path');
	});

	it('accepte un article reel avec HEAD 200', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			status: 200,
			url: 'https://example.com/article/12345'
		});
		const r = await verifyUrl('https://example.com/article/12345');
		expect(r.ok).toBe(true);
		expect(r.status).toBe(200);
	});

	it('signale un 404', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			status: 404,
			url: 'https://example.com/article/plattix-sa'
		});
		const r = await verifyUrl('https://example.com/article/plattix-sa');
		expect(r.ok).toBe(false);
		expect(r.reason).toBe('http_error');
		expect(r.status).toBe(404);
	});

	it('signale une redirection vers la racine', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			status: 200,
			url: 'https://example.com/'
		});
		const r = await verifyUrl('https://example.com/article/supprime');
		expect(r.ok).toBe(false);
		expect(r.reason).toBe('trivial_path');
	});

	it('fallback GET Range si HEAD renvoie 405', async () => {
		const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
		fetchMock
			.mockResolvedValueOnce({ status: 405, url: 'https://example.com/article' })
			.mockResolvedValueOnce({ status: 200, url: 'https://example.com/article' });
		const r = await verifyUrl('https://example.com/article');
		expect(r.ok).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});

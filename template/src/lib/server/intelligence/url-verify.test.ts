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

	it('fallback GET Range si HEAD renvoie 405', async () => {
		const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
		fetchMock
			.mockResolvedValueOnce({ status: 405, url: 'https://example.com/article' })
			.mockResolvedValueOnce({ status: 200, url: 'https://example.com/article' });
		const r = await verifyUrl('https://example.com/article');
		expect(r.ok).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('flagge paywall sur domaine 24heures.ch si body court', async () => {
		const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
		// HEAD OK 200
		fetchMock.mockResolvedValueOnce({
			status: 200,
			url: 'https://www.24heures.ch/article-123'
		});
		// GET body trop court
		fetchMock.mockResolvedValueOnce({
			ok: true,
			text: async () => '<html><body>connectez-vous</body></html>' // ~50B
		});
		const r = await verifyUrl('https://www.24heures.ch/article-123');
		expect(r.ok).toBe(false);
		expect(r.reason).toBe('paywall');
	});

	it("ne flagge PAS paywall si body suffisant sur domaine paywall connu", async () => {
		const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
		fetchMock.mockResolvedValueOnce({ status: 200, url: 'https://www.24heures.ch/article' });
		fetchMock.mockResolvedValueOnce({
			ok: true,
			text: async () => '<html>' + 'x'.repeat(10000) + '</html>'
		});
		const r = await verifyUrl('https://www.24heures.ch/article');
		expect(r.ok).toBe(true);
	});

	it("ne déclenche PAS le check paywall sur domaine non listé", async () => {
		const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
		fetchMock.mockResolvedValueOnce({ status: 200, url: 'https://example.com/article' });
		const r = await verifyUrl('https://example.com/article');
		expect(r.ok).toBe(true);
		// 1 seul appel : HEAD, pas de GET body
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("normalise www. avant lookup paywall (tdg.ch)", async () => {
		const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
		fetchMock.mockResolvedValueOnce({ status: 200, url: 'https://www.tdg.ch/article' });
		fetchMock.mockResolvedValueOnce({
			ok: true,
			text: async () => '<html>short</html>'
		});
		const r = await verifyUrl('https://www.tdg.ch/article');
		expect(r.reason).toBe('paywall');
	});
});

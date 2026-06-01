import { describe, it, expect } from 'vitest';
import { isRateLimitedPath } from './rate-limit-paths';

describe('isRateLimitedPath', () => {
	it('rate-limite /api/contact-suggestions (POST création + resolve) — audit V3 Medium', () => {
		expect(isRateLimitedPath('/api/contact-suggestions', 'POST')).toBe(true);
		expect(isRateLimitedPath('/api/contact-suggestions/abc/resolve', 'POST')).toBe(true);
	});

	it('conserve les chemins déjà protégés', () => {
		expect(isRateLimitedPath('/api/prospection/google-places', 'POST')).toBe(true);
		expect(isRateLimitedPath('/api/photos', 'POST')).toBe(true);
		expect(isRateLimitedPath('/api/visits', 'POST')).toBe(true);
	});

	it('login/log/signaux uniquement en POST', () => {
		expect(isRateLimitedPath('/login', 'POST')).toBe(true);
		expect(isRateLimitedPath('/login', 'GET')).toBe(false);
		expect(isRateLimitedPath('/log/x', 'POST')).toBe(true);
		expect(isRateLimitedPath('/signaux', 'POST')).toBe(true);
		expect(isRateLimitedPath('/signaux', 'GET')).toBe(false);
	});

	it('ne rate-limite pas la recherche (GET léger) ni les chemins hors liste', () => {
		expect(isRateLimitedPath('/api/entreprises/search', 'GET')).toBe(false);
		expect(isRateLimitedPath('/api/foo', 'POST')).toBe(false);
		expect(isRateLimitedPath('/', 'GET')).toBe(false);
	});
});

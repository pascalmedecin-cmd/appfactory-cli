import { describe, it, expect } from 'vitest';
import { isRateLimitedPath, isValidationPublicRoute } from './rate-limit-paths';

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

	it('login/crm-log/crm-signaux uniquement en POST (sous /crm depuis reorg portail)', () => {
		expect(isRateLimitedPath('/login', 'POST')).toBe(true);
		expect(isRateLimitedPath('/login', 'GET')).toBe(false);
		expect(isRateLimitedPath('/crm/log/x', 'POST')).toBe(true);
		expect(isRateLimitedPath('/crm/signaux', 'POST')).toBe(true);
		expect(isRateLimitedPath('/crm/signaux', 'GET')).toBe(false);
		// Les anciens chemins (hors /crm) ne sont plus rate-limités (devenus des redirects 308).
		expect(isRateLimitedPath('/signaux', 'POST')).toBe(false);
		expect(isRateLimitedPath('/log/x', 'POST')).toBe(false);
	});

	it('ne rate-limite pas la recherche (GET léger) ni les chemins hors liste', () => {
		expect(isRateLimitedPath('/api/entreprises/search', 'GET')).toBe(false);
		expect(isRateLimitedPath('/api/foo', 'POST')).toBe(false);
		expect(isRateLimitedPath('/', 'GET')).toBe(false);
	});
});

describe('isValidationPublicRoute (exemption d’auth = surface sensible, motifs EXACTS)', () => {
	it('reconnaît les 3 seules routes publiques : page (1 segment token) + API decision + API confirmer', () => {
		expect(isValidationPublicRoute('/validation/Kx3abc')).toBe(true);
		expect(isValidationPublicRoute('/validation/Kx3abc/')).toBe(true); // slash final toléré
		expect(isValidationPublicRoute('/api/validation/Kx3abc/decision')).toBe(true);
		expect(isValidationPublicRoute('/api/validation/Kx3abc/decision/')).toBe(true);
		expect(isValidationPublicRoute('/api/validation/Kx3abc/confirmer')).toBe(true);
		expect(isValidationPublicRoute('/api/validation/Kx3abc/confirmer/')).toBe(true);
	});

	it('NE reconnaît PAS une sous-route inventée (pas d’héritage d’exemption via startsWith)', () => {
		// C'est le durcissement clé : /admin ne doit jamais hériter de l'exemption d'auth.
		expect(isValidationPublicRoute('/api/validation/Kx3abc/admin')).toBe(false);
		expect(isValidationPublicRoute('/api/validation/Kx3abc/decision/extra')).toBe(false);
		expect(isValidationPublicRoute('/api/validation/Kx3abc/confirmer/extra')).toBe(false);
		expect(isValidationPublicRoute('/validation/Kx3abc/edit')).toBe(false);
		expect(isValidationPublicRoute('/validation')).toBe(false);
		expect(isValidationPublicRoute('/api/validation/')).toBe(false);
		expect(isValidationPublicRoute('/api/validationX/token/decision')).toBe(false);
	});
});

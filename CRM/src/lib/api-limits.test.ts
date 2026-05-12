import { describe, it, expect } from 'vitest';
import { API_LIMITS, googlePlacesQuotaStatus } from './api-limits';

describe('googlePlacesQuotaStatus (spec google-places-2026-05-12)', () => {
	const cap = API_LIMITS.google_places.monthlyRequestCap; // 900

	it('mois neuf : tout disponible, pas d’alerte', () => {
		expect(googlePlacesQuotaStatus(0)).toEqual({ used: 0, cap, remaining: cap, exhausted: false, warning: null });
	});

	it('en dessous du seuil d’avertissement (80 %) : pas d’alerte', () => {
		const r = googlePlacesQuotaStatus(Math.floor(cap * 0.5));
		expect(r.warning).toBeNull();
		expect(r.exhausted).toBe(false);
	});

	it('au-delà du seuil d’avertissement (80 %) : warning « élevé »', () => {
		const r = googlePlacesQuotaStatus(Math.ceil(cap * 0.81));
		expect(r.warning).toMatch(/élevé/i);
		expect(r.exhausted).toBe(false);
	});

	it('au-delà du seuil critique (95 %) : warning « presque épuisé »', () => {
		const r = googlePlacesQuotaStatus(Math.ceil(cap * 0.96));
		expect(r.warning).toMatch(/presque épuisé/i);
	});

	it('cap atteint : exhausted, remaining 0', () => {
		expect(googlePlacesQuotaStatus(cap)).toMatchObject({ exhausted: true, remaining: 0 });
	});

	it('au-delà du cap : remaining clampé à 0', () => {
		const r = googlePlacesQuotaStatus(cap + 50);
		expect(r.remaining).toBe(0);
		expect(r.exhausted).toBe(true);
	});

	it('cap reste sous l’allocation gratuite Google', () => {
		expect(API_LIMITS.google_places.monthlyRequestCap).toBeLessThanOrEqual(API_LIMITS.google_places.freeMonthlyAllowance);
	});
});

import { describe, it, expect } from 'vitest';
import {
	SECOND_MS, MINUTE_MS, HOUR_MS, DAY_MS, WEEK_MS,
	MINUTE_S, HOUR_S, DAY_S, WEEK_S,
	SESSION_MAX_AGE_MS, SESSION_MAX_AGE_S, RATE_LIMIT_WINDOW_MS,
} from './time-constants';

// Audit 360 V3b L-18 : verrouille les invariants des littéraux pré-calculés (≈12 consumers).
describe('time-constants', () => {
	it('millisecondes : relations entre unités', () => {
		expect(SECOND_MS).toBe(1_000);
		expect(MINUTE_MS).toBe(60 * SECOND_MS);
		expect(HOUR_MS).toBe(60 * MINUTE_MS);
		expect(DAY_MS).toBe(24 * HOUR_MS);
		expect(DAY_MS).toBe(86_400_000);
		expect(WEEK_MS).toBe(7 * DAY_MS);
	});

	it('secondes : relations entre unités', () => {
		expect(MINUTE_S).toBe(60);
		expect(HOUR_S).toBe(60 * MINUTE_S);
		expect(DAY_S).toBe(24 * HOUR_S);
		expect(WEEK_S).toBe(7 * DAY_S);
		expect(DAY_S * 1000).toBe(DAY_MS);
	});

	it('durées métier', () => {
		expect(SESSION_MAX_AGE_MS).toBe(7 * DAY_MS);
		expect(SESSION_MAX_AGE_S).toBe(7 * DAY_S);
		expect(SESSION_MAX_AGE_S * 1000).toBe(SESSION_MAX_AGE_MS);
		expect(RATE_LIMIT_WINDOW_MS).toBe(MINUTE_MS);
		expect(RATE_LIMIT_WINDOW_MS).toBe(60_000);
	});
});

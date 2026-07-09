import { describe, it, expect } from 'vitest';
import { buildDailyEmailConfig, type DailyEmailEnv } from './config';

describe('buildDailyEmailConfig - gate OFF par défaut', () => {
	it('OFF si EMAIL_DAILY_ENABLED absent', () => {
		expect(buildDailyEmailConfig({}).enabled).toBe(false);
	});

	it('ON seulement si "true" (case-insensitive)', () => {
		expect(buildDailyEmailConfig({ EMAIL_DAILY_ENABLED: 'true' }).enabled).toBe(true);
		expect(buildDailyEmailConfig({ EMAIL_DAILY_ENABLED: 'TRUE' }).enabled).toBe(true);
		expect(buildDailyEmailConfig({ EMAIL_DAILY_ENABLED: 'True' }).enabled).toBe(true);
	});

	it('OFF pour toute autre valeur (1, yes, on, false, vide)', () => {
		for (const v of ['1', 'yes', 'on', 'false', '', ' ']) {
			expect(buildDailyEmailConfig({ EMAIL_DAILY_ENABLED: v }).enabled).toBe(false);
		}
	});
});

describe('buildDailyEmailConfig - indépendance du weekly', () => {
	it("n'hérite PAS des flags weekly (pas de fallback cascade)", () => {
		// Même si les flags du weekly sont allumés, le daily reste OFF : sa propre variable.
		const withWeeklyOn = {
			EMAIL_RECAP_ENABLED: 'true',
			EMAIL_BRIEF_ENABLED: 'true'
		} as unknown as DailyEmailEnv;
		expect(buildDailyEmailConfig(withWeeklyOn).enabled).toBe(false);
	});
});

describe('buildDailyEmailConfig - destinataires / from / clé', () => {
	it('destinataires par défaut = pascal@ + antoine@', () => {
		expect(buildDailyEmailConfig({}).to).toEqual(['pascal@filmpro.ch', 'antoine@filmpro.ch']);
	});

	it('destinataires custom parsés + dédupés', () => {
		const c = buildDailyEmailConfig({ EMAIL_DAILY_TO: 'a@x.ch, a@x.ch ; b@y.ch' });
		expect(c.to).toEqual(['a@x.ch', 'b@y.ch']);
	});

	it('from par défaut = notifications@lamaisoncreativedirection.ch (domaine vérifié)', () => {
		expect(buildDailyEmailConfig({}).from).toBe('FilmPro CRM <notifications@lamaisoncreativedirection.ch>');
	});

	it('from custom respecté', () => {
		expect(buildDailyEmailConfig({ EMAIL_DAILY_FROM: 'X <a@b.ch>' }).from).toBe('X <a@b.ch>');
	});

	it('apiKey lue depuis RESEND_API_KEY (partagée)', () => {
		expect(buildDailyEmailConfig({ RESEND_API_KEY: 're_x' }).apiKey).toBe('re_x');
		expect(buildDailyEmailConfig({}).apiKey).toBeUndefined();
	});
});

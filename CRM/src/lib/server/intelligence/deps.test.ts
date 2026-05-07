import { describe, it, expect } from 'vitest';
import { buildVeilleDepsFromEnvObject, type VeilleEnv } from './deps';

const VALID_ENV: VeilleEnv = {
	PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
	SUPABASE_SERVICE_ROLE_KEY: 'service-role-fake-key',
	ANTHROPIC_API_KEY: 'sk-ant-fake-key'
};

describe('buildVeilleDepsFromEnvObject - validation env', () => {
	it('plante explicitement si ANTHROPIC_API_KEY manque', () => {
		const env = { ...VALID_ENV, ANTHROPIC_API_KEY: undefined };
		expect(() => buildVeilleDepsFromEnvObject(env)).toThrow(/ANTHROPIC_API_KEY/);
	});

	it('plante explicitement si SUPABASE_SERVICE_ROLE_KEY manque', () => {
		const env = { ...VALID_ENV, SUPABASE_SERVICE_ROLE_KEY: undefined };
		expect(() => buildVeilleDepsFromEnvObject(env)).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
	});

	it('plante si ni PUBLIC_SUPABASE_URL ni SUPABASE_URL ne sont définis', () => {
		const env = { ...VALID_ENV, PUBLIC_SUPABASE_URL: undefined };
		expect(() => buildVeilleDepsFromEnvObject(env)).toThrow(/SUPABASE_URL/);
	});

	it('accepte SUPABASE_URL en fallback quand PUBLIC_SUPABASE_URL absent (cas standalone GHA)', () => {
		const env: VeilleEnv = {
			SUPABASE_URL: 'https://test.supabase.co',
			SUPABASE_SERVICE_ROLE_KEY: 'service-role',
			ANTHROPIC_API_KEY: 'sk-ant-x'
		};
		const deps = buildVeilleDepsFromEnvObject(env);
		expect(deps.supabase).toBeDefined();
		expect(deps.anthropicApiKey).toBe('sk-ant-x');
	});

	it('windowDays défaut = 30 si VEILLE_WINDOW_DAYS absent', () => {
		const deps = buildVeilleDepsFromEnvObject(VALID_ENV);
		expect(deps.windowDays).toBe(30);
	});

	it('windowDays défaut = 30 si VEILLE_WINDOW_DAYS invalide (NaN, 0, négatif)', () => {
		expect(buildVeilleDepsFromEnvObject({ ...VALID_ENV, VEILLE_WINDOW_DAYS: 'abc' }).windowDays).toBe(30);
		expect(buildVeilleDepsFromEnvObject({ ...VALID_ENV, VEILLE_WINDOW_DAYS: '0' }).windowDays).toBe(30);
		expect(buildVeilleDepsFromEnvObject({ ...VALID_ENV, VEILLE_WINDOW_DAYS: '-5' }).windowDays).toBe(30);
	});

	it('windowDays parsé si VEILLE_WINDOW_DAYS = entier positif', () => {
		const deps = buildVeilleDepsFromEnvObject({ ...VALID_ENV, VEILLE_WINDOW_DAYS: '60' });
		expect(deps.windowDays).toBe(60);
	});

	it('email.enabled = true uniquement si EMAIL_RECAP_ENABLED=true (case-insensitive)', () => {
		expect(buildVeilleDepsFromEnvObject({ ...VALID_ENV, EMAIL_RECAP_ENABLED: 'true' }).email.enabled).toBe(true);
		expect(buildVeilleDepsFromEnvObject({ ...VALID_ENV, EMAIL_RECAP_ENABLED: 'TRUE' }).email.enabled).toBe(true);
		expect(buildVeilleDepsFromEnvObject({ ...VALID_ENV, EMAIL_RECAP_ENABLED: 'false' }).email.enabled).toBe(false);
		expect(buildVeilleDepsFromEnvObject({ ...VALID_ENV, EMAIL_RECAP_ENABLED: '' }).email.enabled).toBe(false);
		expect(buildVeilleDepsFromEnvObject(VALID_ENV).email.enabled).toBe(false);
	});

	it('email.to / email.from défaut si non définis', () => {
		const deps = buildVeilleDepsFromEnvObject(VALID_ENV);
		expect(deps.email.to).toBe('pascal@filmpro.ch');
		expect(deps.email.from).toBe('FilmPro Veille <noreply@filmpro.ch>');
	});

	it('email.to / email.from override si définis', () => {
		const deps = buildVeilleDepsFromEnvObject({
			...VALID_ENV,
			EMAIL_RECAP_TO: 'override@example.com',
			EMAIL_RECAP_FROM: 'Custom <from@example.com>'
		});
		expect(deps.email.to).toBe('override@example.com');
		expect(deps.email.from).toBe('Custom <from@example.com>');
	});

	it('antiDoublonsFrom propagé tel quel (undefined si absent)', () => {
		expect(buildVeilleDepsFromEnvObject(VALID_ENV).antiDoublonsFrom).toBeUndefined();
		expect(
			buildVeilleDepsFromEnvObject({ ...VALID_ENV, VEILLE_ANTI_DOUBLONS_FROM: '2026-W18' })
				.antiDoublonsFrom
		).toBe('2026-W18');
	});
});

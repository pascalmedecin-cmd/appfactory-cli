import { describe, it, expect } from 'vitest';
import { buildVeilleDepsFromEnvObject, parseRecipients, type VeilleEnv } from './deps';

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

	it('email.to / email.from défaut si non définis (to = array)', () => {
		const deps = buildVeilleDepsFromEnvObject(VALID_ENV);
		expect(deps.email.to).toEqual(['pascal@filmpro.ch']);
		expect(deps.email.from).toBe('FilmPro Veille <notifications@lamaisoncreativedirection.ch>');
	});

	it('email.to / email.from override si définis', () => {
		const deps = buildVeilleDepsFromEnvObject({
			...VALID_ENV,
			EMAIL_RECAP_TO: 'override@example.com',
			EMAIL_RECAP_FROM: 'Custom <from@example.com>'
		});
		expect(deps.email.to).toEqual(['override@example.com']);
		expect(deps.email.from).toBe('Custom <from@example.com>');
	});

	it('email.to multi-destinataires : splitté en array', () => {
		const deps = buildVeilleDepsFromEnvObject({
			...VALID_ENV,
			EMAIL_RECAP_TO: 'a@filmpro.ch, b@filmpro.ch'
		});
		expect(deps.email.to).toEqual(['a@filmpro.ch', 'b@filmpro.ch']);
	});

	it('brief : config par défaut = pascal + antoine, hérite enabled du récap', () => {
		const def = buildVeilleDepsFromEnvObject(VALID_ENV);
		expect(def.brief.to).toEqual(['pascal@filmpro.ch', 'antoine@filmpro.ch']);
		expect(def.brief.from).toBe('FilmPro Veille <notifications@lamaisoncreativedirection.ch>');
		// enabled hérite de EMAIL_RECAP_ENABLED quand EMAIL_BRIEF_ENABLED absent.
		expect(def.brief.enabled).toBe(false);
		expect(
			buildVeilleDepsFromEnvObject({ ...VALID_ENV, EMAIL_RECAP_ENABLED: 'true' }).brief.enabled
		).toBe(true);
	});

	it('brief : EMAIL_BRIEF_ENABLED=false coupe le brief sans toucher au récap', () => {
		const deps = buildVeilleDepsFromEnvObject({
			...VALID_ENV,
			EMAIL_RECAP_ENABLED: 'true',
			EMAIL_BRIEF_ENABLED: 'false'
		});
		expect(deps.email.enabled).toBe(true);
		expect(deps.brief.enabled).toBe(false);
	});

	it('brief : EMAIL_BRIEF_TO override + splitté', () => {
		const deps = buildVeilleDepsFromEnvObject({
			...VALID_ENV,
			EMAIL_BRIEF_TO: 'antoine@filmpro.ch ; pascal@filmpro.ch'
		});
		expect(deps.brief.to).toEqual(['antoine@filmpro.ch', 'pascal@filmpro.ch']);
	});

	it('antiDoublonsFrom propagé tel quel (undefined si absent)', () => {
		expect(buildVeilleDepsFromEnvObject(VALID_ENV).antiDoublonsFrom).toBeUndefined();
		expect(
			buildVeilleDepsFromEnvObject({ ...VALID_ENV, VEILLE_ANTI_DOUBLONS_FROM: '2026-W18' })
				.antiDoublonsFrom
		).toBe('2026-W18');
	});
});

describe('parseRecipients', () => {
	it('split virgule + trim', () => {
		expect(parseRecipients('a@x.ch, b@y.ch', 'fallback@x.ch')).toEqual(['a@x.ch', 'b@y.ch']);
	});

	it('split point-virgule', () => {
		expect(parseRecipients('a@x.ch ; b@y.ch', 'fallback@x.ch')).toEqual(['a@x.ch', 'b@y.ch']);
	});

	it('dédup insensible à la casse, préserve la 1re casse', () => {
		expect(parseRecipients('A@x.ch, a@X.CH, b@y.ch', 'f@x.ch')).toEqual(['A@x.ch', 'b@y.ch']);
	});

	it('retire les segments vides (virgules en trop)', () => {
		expect(parseRecipients('a@x.ch,,, b@y.ch,', 'f@x.ch')).toEqual(['a@x.ch', 'b@y.ch']);
	});

	it('raw vide / undefined / blanc -> fallback parsé', () => {
		expect(parseRecipients(undefined, 'a@x.ch,b@y.ch')).toEqual(['a@x.ch', 'b@y.ch']);
		expect(parseRecipients('', 'a@x.ch')).toEqual(['a@x.ch']);
		expect(parseRecipients('   ', 'a@x.ch')).toEqual(['a@x.ch']);
	});

	it('raw uniquement des séparateurs -> fallback parsé (pas de boucle infinie)', () => {
		expect(parseRecipients(',,;,', 'a@x.ch')).toEqual(['a@x.ch']);
	});

	it('borne à 20 destinataires', () => {
		const many = Array.from({ length: 30 }, (_, i) => `u${i}@x.ch`).join(',');
		expect(parseRecipients(many, 'f@x.ch')).toHaveLength(20);
	});
});

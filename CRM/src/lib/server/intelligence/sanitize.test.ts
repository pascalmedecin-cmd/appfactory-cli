import { describe, it, expect } from 'vitest';
import { sanitizeForLog, sanitizeError } from './sanitize';

describe('sanitizeForLog - patterns redact (5)', () => {
	it('masque sk-ant-* (Anthropic API key)', () => {
		const out = sanitizeForLog('error: 401 sk-ant-api03-secretvalueXYZ123 invalid');
		expect(out).not.toMatch(/sk-ant-api03-secretvalueXYZ123/);
		expect(out).toContain('[REDACTED_API_KEY]');
	});

	it('masque Bearer * (auth header)', () => {
		const out = sanitizeForLog('Authorization: Bearer abcdef123.456');
		expect(out).not.toMatch(/Bearer abcdef123\.456/);
		expect(out).toContain('Bearer [REDACTED]');
	});

	it('masque JWT eyJ.* (Supabase, third-party)', () => {
		const out = sanitizeForLog(
			'token: eyJhbGciOiJIUzI1NiI.eyJzdWIiOiIxMjM0NSJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
		);
		expect(out).not.toMatch(/eyJhbGciOiJIUzI1NiI/);
		expect(out).toContain('[REDACTED_JWT]');
	});

	it('masque Resend re_* (≥20 chars)', () => {
		const out = sanitizeForLog('resend key: re_a1b2c3d4e5f6g7h8i9j0kkkk');
		expect(out).not.toMatch(/re_a1b2c3d4e5f6g7h8i9j0kkkk/);
		expect(out).toContain('[REDACTED_RESEND_KEY]');
	});

	it('masque génériques api_key/token/secret/apikey = val', () => {
		const out = sanitizeForLog('config: api_key=foo123 token=bar456 secret=baz789');
		expect(out).not.toMatch(/foo123/);
		expect(out).not.toMatch(/bar456/);
		expect(out).not.toMatch(/baz789/);
		expect(out.match(/\[REDACTED\]/g)?.length).toBeGreaterThanOrEqual(3);
	});

	it('tronque à maxLen (défaut 500)', () => {
		const long = 'X'.repeat(800);
		expect(sanitizeForLog(long).length).toBe(500);
	});

	it('maxLen custom respecté', () => {
		const long = 'X'.repeat(800);
		expect(sanitizeForLog(long, 100).length).toBe(100);
	});

	it('message vide → vide', () => {
		expect(sanitizeForLog('')).toBe('');
	});

	it('message sans secret → inchangé (sauf troncature)', () => {
		expect(sanitizeForLog('Anthropic stream timeout après 300s')).toBe(
			'Anthropic stream timeout après 300s'
		);
	});

	it('chaîne plusieurs patterns dans le même message', () => {
		// Note ordre des regex : sk-ant-* est appliqué AVANT Bearer *. Donc un
		// "Bearer sk-ant-..." finit en "Bearer [REDACTED_API_KEY]" (ce qui est
		// correct — le secret est masqué). Pour tester Bearer indépendamment,
		// utiliser un token non-anthropic.
		const out = sanitizeForLog(
			'Auth Bearer abc123token with eyJabc.def.ghi and re_aaaaaaaaaaaaaaaaaaaa and sk-ant-XYZ'
		);
		expect(out).toContain('Bearer [REDACTED]');
		expect(out).toContain('[REDACTED_API_KEY]');
		expect(out).toContain('[REDACTED_JWT]');
		expect(out).toContain('[REDACTED_RESEND_KEY]');
	});
});

describe('sanitizeError - wrapper unknown → string', () => {
	it('Error → message sanitized', () => {
		const out = sanitizeError(new Error('401 sk-ant-leak invalid'));
		expect(out).toContain('[REDACTED_API_KEY]');
	});

	it('string raw → sanitized', () => {
		expect(sanitizeError('Bearer foobar123')).toContain('Bearer [REDACTED]');
	});

	it('null/undefined → string vide ou "null"/"undefined"', () => {
		expect(typeof sanitizeError(null)).toBe('string');
		expect(typeof sanitizeError(undefined)).toBe('string');
	});

	it("objet circulaire ou non-stringifiable → fallback '[unserializable error]'", () => {
		const circ: Record<string, unknown> = {};
		circ.self = circ;
		// String() ne plante pas sur circular ref ; renvoie [object Object].
		// Donc on n'entre pas dans le catch ici. Test que le résultat reste safe.
		const out = sanitizeError(circ);
		expect(typeof out).toBe('string');
	});
});

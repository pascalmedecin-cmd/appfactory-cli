import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';
import {
	hashValidationToken,
	isValidationTokenShape,
	validationExterneEnabled,
	resolveValidationToken,
	setValidationDecision,
	applyValidationRetraits,
	revokeValidationLiens,
	getValidationLienActif,
	createValidationLien,
	confirmValidationLien,
	getValidationConfirmation,
	VALIDATION_LIEN_TTL_MS,
} from './validation-campagne';

/**
 * Mock Supabase chaînable (Proxy thenable) : chaque méthode renvoie le même proxy, `await` résout
 * le résultat de la table. Suffit pour les fonctions de validation-campagne (une table chacune).
 */
type SbResult = { data?: unknown; error?: unknown; count?: number | null };
function tableMock(res: SbResult) {
	const value = { data: res.data ?? null, error: res.error ?? null, count: res.count ?? null };
	const calls: string[] = [];
	const chain: unknown = new Proxy(
		{},
		{
			get(_t, prop: string) {
				if (prop === 'then')
					return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
						Promise.resolve(value).then(resolve, reject);
				return (...args: unknown[]) => {
					calls.push(`${prop}(${args.map((a) => JSON.stringify(a)).join(',')})`);
					return chain;
				};
			},
		}
	);
	let fromCount = 0;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const supabase = { from: () => { fromCount++; return chain; } } as unknown as SupabaseClient<Database>;
	return { supabase, calls, get fromCount() { return fromCount; } };
}

describe('hashValidationToken', () => {
	it('empreinte SHA-256 hex déterministe (64 chars), jamais le token en clair', () => {
		const h1 = hashValidationToken('abc');
		const h2 = hashValidationToken('abc');
		expect(h1).toBe(h2);
		expect(h1).toMatch(/^[0-9a-f]{64}$/);
		expect(h1).not.toContain('abc');
		expect(hashValidationToken('abd')).not.toBe(h1);
	});
});

describe('isValidationTokenShape', () => {
	it('accepte un base64url de 43 caractères (32 octets)', () => {
		expect(isValidationTokenShape('A'.repeat(43))).toBe(true);
		expect(isValidationTokenShape('a-b_C9'.padEnd(43, 'x'))).toBe(true);
	});
	it('rejette toute autre forme (anti-énumération : 404 uniforme en amont)', () => {
		expect(isValidationTokenShape('A'.repeat(42))).toBe(false);
		expect(isValidationTokenShape('A'.repeat(44))).toBe(false);
		expect(isValidationTokenShape('has space' + 'x'.repeat(34))).toBe(false);
		expect(isValidationTokenShape("a'; drop table--".padEnd(43, 'x'))).toBe(false);
		expect(isValidationTokenShape(null)).toBe(false);
		expect(isValidationTokenShape(123)).toBe(false);
	});
});

describe('validationExterneEnabled (kill-switch porte publique, PUR)', () => {
	it('défaut ON quand la variable est absente', () => {
		expect(validationExterneEnabled(undefined)).toBe(true);
		expect(validationExterneEnabled(null)).toBe(true);
		expect(validationExterneEnabled('')).toBe(true);
	});
	it('OFF sur 0/false/off/no (insensible à la casse et aux espaces)', () => {
		for (const v of ['0', 'false', 'off', 'no', 'FALSE', ' Off ', 'NO']) {
			expect(validationExterneEnabled(v)).toBe(false);
		}
	});
	it('ON pour toute autre valeur (1, true, on...)', () => {
		for (const v of ['1', 'true', 'on', 'yes', 'enabled']) {
			expect(validationExterneEnabled(v)).toBe(true);
		}
	});
});

describe('resolveValidationToken', () => {
	const HASH_ROW = {
		id: 'lien-1',
		campagne_id: 'cmp-1',
		expires_at: new Date(Date.now() + 3600_000).toISOString(),
		revoked_at: null,
		confirmed_at: null,
	};

	it('token malformé -> introuvable SANS toucher la DB (short-circuit)', async () => {
		const m = tableMock({ data: HASH_ROW });
		const r = await resolveValidationToken(m.supabase, 'trop-court');
		expect(r.status).toBe('introuvable');
		expect(m.fromCount).toBe(0); // aucune requête
	});

	it('token de bonne forme mais inconnu -> introuvable', async () => {
		const m = tableMock({ data: null });
		const r = await resolveValidationToken(m.supabase, 'A'.repeat(43));
		expect(r.status).toBe('introuvable');
	});

	it('lien révoqué -> expire (message dédié, jamais « invalide »)', async () => {
		const m = tableMock({ data: { ...HASH_ROW, revoked_at: new Date().toISOString() } });
		const r = await resolveValidationToken(m.supabase, 'A'.repeat(43));
		expect(r.status).toBe('expire');
	});

	it('lien expiré (expires_at passé) -> expire', async () => {
		const m = tableMock({ data: { ...HASH_ROW, expires_at: new Date(Date.now() - 1000).toISOString() } });
		const r = await resolveValidationToken(m.supabase, 'A'.repeat(43));
		expect(r.status).toBe('expire');
	});

	it('lien valide -> ok + lienId + campagneId + confirmedAt (null si jamais confirmé)', async () => {
		const m = tableMock({ data: HASH_ROW });
		const r = await resolveValidationToken(m.supabase, 'A'.repeat(43));
		expect(r).toMatchObject({ status: 'ok', lienId: 'lien-1', campagneId: 'cmp-1', confirmedAt: null });
	});

	it('lien valide déjà confirmé -> confirmedAt porté (la page rouvre en état « envoyé »)', async () => {
		const confirmed = new Date().toISOString();
		const m = tableMock({ data: { ...HASH_ROW, confirmed_at: confirmed } });
		const r = await resolveValidationToken(m.supabase, 'A'.repeat(43));
		expect(r).toMatchObject({ status: 'ok', confirmedAt: confirmed });
	});

	it('erreur DB -> db (jamais présenté comme lien invalide)', async () => {
		const m = tableMock({ error: { message: 'boom' } });
		const r = await resolveValidationToken(m.supabase, 'A'.repeat(43));
		expect(r).toMatchObject({ status: 'db' });
	});
});

describe('setValidationDecision', () => {
	it('0 ligne touchée -> notFound (prospect retiré entre-temps), pas d’erreur', async () => {
		const m = tableMock({ count: 0 });
		const r = await setValidationDecision(m.supabase, 'cmp-1', 'lead-1', 'garder');
		expect(r).toEqual({ notFound: true, error: null });
	});
	it('1 ligne touchée -> écriture réussie', async () => {
		const m = tableMock({ count: 1 });
		const r = await setValidationDecision(m.supabase, 'cmp-1', 'lead-1', 'retirer');
		expect(r).toEqual({ notFound: false, error: null });
	});
	it('erreur DB -> propagée, jamais notFound', async () => {
		const m = tableMock({ error: { message: 'boom' } });
		const r = await setValidationDecision(m.supabase, 'cmp-1', 'lead-1', null);
		expect(r.notFound).toBe(false);
		expect(r.error?.message).toBe('boom');
	});
});

describe('applyValidationRetraits', () => {
	it('retourne le nombre exact de liens supprimés (count exact)', async () => {
		const m = tableMock({ count: 3 });
		const r = await applyValidationRetraits(m.supabase, 'cmp-1');
		expect(r).toEqual({ removed: 3, error: null });
	});
	it('erreur DB -> removed 0 + error', async () => {
		const m = tableMock({ error: { message: 'boom' } });
		const r = await applyValidationRetraits(m.supabase, 'cmp-1');
		expect(r).toEqual({ removed: 0, error: { message: 'boom' } });
	});
});

describe('confirmValidationLien / getValidationConfirmation', () => {
	it('confirmation -> horodatage ISO retourné, écriture ciblée par id de lien', async () => {
		const m = tableMock({});
		const before = Date.now();
		const r = await confirmValidationLien(m.supabase, 'lien-1');
		expect(r.error).toBeNull();
		expect(r.confirmedAt).not.toBeNull();
		expect(new Date(r.confirmedAt as string).getTime()).toBeGreaterThanOrEqual(before);
		expect(m.calls).toContain('eq("id","lien-1")');
	});

	it('confirmation en erreur DB -> confirmedAt null + error', async () => {
		const m = tableMock({ error: { message: 'boom' } });
		const r = await confirmValidationLien(m.supabase, 'lien-1');
		expect(r.confirmedAt).toBeNull();
		expect(r.error).toMatchObject({ message: 'boom' });
	});

	it('getValidationConfirmation -> confirmed_at du lien le plus récent (round courant)', async () => {
		const confirmed = new Date().toISOString();
		const m = tableMock({ data: { confirmed_at: confirmed } });
		const r = await getValidationConfirmation(m.supabase, 'cmp-1');
		expect(r).toEqual({ confirmedAt: confirmed, error: null });
		expect(m.calls).toContain('order("date_creation",{"ascending":false})');
	});

	it('getValidationConfirmation -> null quand aucun lien ou round non confirmé (nouveau lien = nouveau round)', async () => {
		expect(await getValidationConfirmation(tableMock({ data: null }).supabase, 'cmp-1')).toEqual({ confirmedAt: null, error: null });
		expect(await getValidationConfirmation(tableMock({ data: { confirmed_at: null } }).supabase, 'cmp-1')).toEqual({ confirmedAt: null, error: null });
	});

	it('getValidationConfirmation en erreur DB -> null + error (badge simplement absent, jamais 500)', async () => {
		const r = await getValidationConfirmation(tableMock({ error: { message: 'boom' } }).supabase, 'cmp-1');
		expect(r.confirmedAt).toBeNull();
		expect(r.error).toMatchObject({ message: 'boom' });
	});
});

describe('revokeValidationLiens / getValidationLienActif', () => {
	it('revoke idempotent -> error null', async () => {
		const m = tableMock({});
		const r = await revokeValidationLiens(m.supabase, 'cmp-1');
		expect(r).toEqual({ error: null });
	});
	it('getValidationLienActif renvoie le lien ou null', async () => {
		const row = { id: 'lien-1', expires_at: new Date().toISOString(), date_creation: new Date().toISOString() };
		expect((await getValidationLienActif(tableMock({ data: row }).supabase, 'cmp-1')).data).toEqual(row);
		expect((await getValidationLienActif(tableMock({ data: null }).supabase, 'cmp-1')).data).toBe(null);
	});
});

describe('createValidationLien', () => {
	it('émet un token de bonne forme (43 chars) + expiration ~2 jours', async () => {
		const m = tableMock({});
		const before = Date.now();
		const { data, error } = await createValidationLien(m.supabase, 'cmp-1', 'user-1');
		expect(error).toBe(null);
		expect(data && isValidationTokenShape(data.token)).toBe(true);
		const exp = new Date(data!.expiresAt).getTime();
		expect(exp).toBeGreaterThanOrEqual(before + VALIDATION_LIEN_TTL_MS - 5000);
		expect(exp).toBeLessThanOrEqual(Date.now() + VALIDATION_LIEN_TTL_MS + 5000);
	});

	// Mock qui distingue update (revoke : toujours OK) et insert (résultats séquencés) sur la même
	// table `campagne_validation_liens`. Nécessaire pour exercer le retry sur collision d'index.
	function revokeInsertMock(insertResults: SbResult[]) {
		let insertCalls = 0;
		const chain = (kind: 'update' | 'insert' | null): unknown =>
			new Proxy(
				{},
				{
					get(_t, prop: string) {
						if (prop === 'then') {
							const res: SbResult = kind === 'insert' ? insertResults[insertCalls++] ?? { error: null } : {};
							return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
								Promise.resolve({ data: null, count: null, error: null, ...res }).then(resolve, reject);
						}
						if (prop === 'update') return () => chain('update');
						if (prop === 'insert') return () => chain('insert');
						return () => chain(kind);
					},
				}
			);
		const supabase = { from: () => chain(null) } as unknown as SupabaseClient<Database>;
		return { supabase, get insertCalls() { return insertCalls; } };
	}

	it('génération concurrente : 23505 au 1er insert -> retry (révoque le concurrent) -> succès', async () => {
		const m = revokeInsertMock([{ error: { code: '23505', message: 'dup' } }, { error: null }]);
		const { data, error } = await createValidationLien(m.supabase, 'cmp-1', 'user-1');
		expect(error).toBe(null);
		expect(data && isValidationTokenShape(data.token)).toBe(true);
		expect(m.insertCalls).toBe(2); // a bien retenté une fois
	});

	it('conflit persistant (23505 aux 2 tentatives) -> erreur gracieuse, pas de crash', async () => {
		const m = revokeInsertMock([
			{ error: { code: '23505', message: 'dup' } },
			{ error: { code: '23505', message: 'dup' } },
		]);
		const { data, error } = await createValidationLien(m.supabase, 'cmp-1', 'user-1');
		expect(data).toBe(null);
		expect(error?.message).toContain('conflit');
	});

	it('erreur DB d’insert non-23505 -> remontée immédiate (pas de retry)', async () => {
		const m = revokeInsertMock([{ error: { code: '23503', message: 'fk' } }]);
		const { error } = await createValidationLien(m.supabase, 'cmp-1', 'user-1');
		expect((error as { code?: string })?.code).toBe('23503');
		expect(m.insertCalls).toBe(1); // pas de retry sur une erreur non réessayable
	});
});

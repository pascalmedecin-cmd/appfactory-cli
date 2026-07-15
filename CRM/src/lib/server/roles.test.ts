import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Contrôle de l'env : par défaut vide -> les fallbacks DEFAULT_* jouent. `vi.hoisted`
// rend `mockEnv` disponible au moment où `vi.mock` est remonté en tête de fichier
// (roles.ts est importé statiquement, contrairement aux tests d'action en import dynamique).
const { mockEnv } = vi.hoisted(() => ({ mockEnv: {} as Record<string, string | undefined> }));
vi.mock('$env/dynamic/private', () => ({ env: mockEnv }));

import {
	isAdmin,
	isSuperuser,
	isEditor,
	roleOf,
	getAdminEmails,
	getSuperuserEmails,
	getEditorEmails,
	DEFAULT_ADMIN_EMAILS,
	DEFAULT_SUPERUSER_EMAILS,
} from '$lib/server/roles';

beforeEach(() => {
	for (const k of Object.keys(mockEnv)) delete mockEnv[k];
});

describe('rôles - valeurs par défaut (Pascal admin, Antoine superuser)', () => {
	it('admin = Pascal sur ses deux adresses', () => {
		expect(isAdmin('pascal@filmpro.ch')).toBe(true);
		expect(isAdmin('pascal@lamaisoncreativedirection.ch')).toBe(true);
	});

	it('Antoine n\'est PAS admin (il est superuser)', () => {
		expect(isAdmin('antoine@filmpro.ch')).toBe(false);
		expect(isAdmin('antoine@lamaisoncreativedirection.ch')).toBe(false);
	});

	it('superuser = Antoine sur ses deux adresses ; Pascal ne l\'est pas', () => {
		expect(isSuperuser('antoine@filmpro.ch')).toBe(true);
		expect(isSuperuser('antoine@lamaisoncreativedirection.ch')).toBe(true);
		expect(isSuperuser('pascal@filmpro.ch')).toBe(false);
	});

	it('éditeur des mots-clés = admin OU superuser', () => {
		expect(isEditor('pascal@filmpro.ch')).toBe(true);
		expect(isEditor('pascal@lamaisoncreativedirection.ch')).toBe(true);
		expect(isEditor('antoine@filmpro.ch')).toBe(true);
		expect(isEditor('antoine@lamaisoncreativedirection.ch')).toBe(true);
		expect(isEditor('recrue@lamaisoncreativedirection.ch')).toBe(false);
		expect(isEditor('evil@external.com')).toBe(false);
	});

	it('insensible à la casse et aux espaces', () => {
		expect(isAdmin('  PASCAL@FILMPRO.CH  ')).toBe(true);
		expect(isSuperuser('Antoine@LaMaisonCreativeDirection.ch')).toBe(true);
	});

	it('false pour null / undefined / vide', () => {
		for (const v of [null, undefined, '', '   ']) {
			expect(isAdmin(v)).toBe(false);
			expect(isSuperuser(v)).toBe(false);
			expect(isEditor(v)).toBe(false);
			expect(roleOf(v)).toBeNull();
		}
	});

	it('roleOf : admin > superuser > user, null si vide', () => {
		expect(roleOf('pascal@filmpro.ch')).toBe('admin');
		expect(roleOf('antoine@lamaisoncreativedirection.ch')).toBe('superuser');
		expect(roleOf('recrue@filmpro.ch')).toBe('user');
		expect(roleOf('')).toBeNull();
	});

	it('getEditorEmails = union dédupliquée admin ∪ superuser', () => {
		const editors = getEditorEmails();
		expect(new Set(editors).size).toBe(editors.length); // pas de doublon
		expect(editors).toEqual(expect.arrayContaining([...DEFAULT_ADMIN_EMAILS, ...DEFAULT_SUPERUSER_EMAILS]));
		expect(editors).toHaveLength(DEFAULT_ADMIN_EMAILS.length + DEFAULT_SUPERUSER_EMAILS.length);
	});
});

describe('rôles - surcharge par variable d\'env', () => {
	it('ADMIN_EMAILS remplace la liste par défaut', () => {
		mockEnv.ADMIN_EMAILS = 'boss@atelier209.ch, second@atelier209.ch';
		expect(isAdmin('boss@atelier209.ch')).toBe(true);
		expect(isAdmin('second@atelier209.ch')).toBe(true);
		expect(isAdmin('pascal@filmpro.ch')).toBe(false); // remplacé, pas ajouté
		expect(getAdminEmails()).toEqual(['boss@atelier209.ch', 'second@atelier209.ch']);
	});

	it('SUPERUSER_EMAILS remplace la liste par défaut', () => {
		mockEnv.SUPERUSER_EMAILS = 'sub@atelier209.ch';
		expect(isSuperuser('sub@atelier209.ch')).toBe(true);
		expect(isSuperuser('antoine@filmpro.ch')).toBe(false);
		expect(getSuperuserEmails()).toEqual(['sub@atelier209.ch']);
	});

	it('une valeur vide/whitespace retombe sur le défaut versionné', () => {
		mockEnv.ADMIN_EMAILS = '   ';
		expect(getAdminEmails()).toEqual([...DEFAULT_ADMIN_EMAILS]);
	});
});

describe('cohérence RLS ↔ code (garde-fou anti-dérive D1)', () => {
	const sql = readFileSync(
		join(process.cwd(), 'supabase/migrations/20260715000000_roles_admin_superuser.sql'),
		'utf8',
	).toLowerCase();

	// Découpe : bloc feedback (retours) vs bloc signaux (mots-clés).
	const fbStart = sql.indexOf('create policy "feedback_entries_update_admin"');
	const sigStart = sql.indexOf('signaux_mots_cles_admin_insert');
	const fbBlock = sql.slice(fbStart, sigStart);
	const sigBlock = sql.slice(sigStart);

	it('la migration existe et contient les deux blocs de policies', () => {
		expect(fbStart).toBeGreaterThanOrEqual(0);
		expect(sigStart).toBeGreaterThan(fbStart);
	});

	it('feedback (retours) = ADMIN uniquement, aucun superuser', () => {
		for (const e of DEFAULT_ADMIN_EMAILS) expect(fbBlock).toContain(e);
		for (const e of DEFAULT_SUPERUSER_EMAILS) expect(fbBlock).not.toContain(e);
	});

	it('signaux (mots-clés) = ADMIN + SUPERUSER (tous les éditeurs)', () => {
		for (const e of [...DEFAULT_ADMIN_EMAILS, ...DEFAULT_SUPERUSER_EMAILS]) {
			expect(sigBlock).toContain(e);
		}
	});

	// Sens INVERSE (set-equality) : la migration ne doit contenir AUCUN email hors du code.
	// Sans ça, un email ajouté à la seule RLS (octroi silencieux) passerait vert - le trou
	// exact que « aucun élargissement silencieux de privilège » veut fermer.
	const emailsIn = (block: string): string[] =>
		[...block.matchAll(/'([^'@\s]+@[^'\s]+)'/g)].map((m) => m[1]);

	it('feedback ne contient AUCUN email hors ADMIN (aucun octroi RLS-only)', () => {
		const admins = new Set<string>(DEFAULT_ADMIN_EMAILS);
		const found = emailsIn(fbBlock);
		expect(found.length).toBeGreaterThan(0); // sanity : le parseur trouve bien des emails
		for (const e of found) expect(admins.has(e)).toBe(true);
	});

	it('signaux ne contient AUCUN email hors ÉDITEURS (aucun octroi RLS-only)', () => {
		const editors = new Set<string>([...DEFAULT_ADMIN_EMAILS, ...DEFAULT_SUPERUSER_EMAILS]);
		const found = emailsIn(sigBlock);
		expect(found.length).toBeGreaterThan(0);
		for (const e of found) expect(editors.has(e)).toBe(true);
	});
});

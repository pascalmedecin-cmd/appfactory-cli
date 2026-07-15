/**
 * Modèle de rôles applicatifs (Atelier 209, Run 1 - 2026-07-15).
 *
 * Trois niveaux, portés par l'adresse email de connexion (JWT), sans table de rôles
 * (cohérent avec la doctrine allowlist du CRM) :
 *
 *   - admin      : traite les retours (/log) ET édite les mots-clés Signaux.
 *   - superuser  : édite les mots-clés Signaux (pas les retours).
 *   - user       : accès normal, aucune édition privilégiée.
 *
 * Pascal (admin) et Antoine (superuser) portent CHACUN leurs deux adresses
 * (@filmpro.ch pendant la transition + @lamaisoncreativedirection.ch cible) :
 * ne jamais se verrouiller dehors en se connectant avec l'ancienne adresse.
 *
 * SOURCE DE VÉRITÉ des listes = les constantes DEFAULT_* ci-dessous. La migration
 * `20260715000000_roles_admin_superuser.sql` réécrit les policies RLS avec EXACTEMENT
 * ces mêmes emails (second filet de defense-in-depth) ; `roles.test.ts` échoue si les
 * deux divergent. Surcharge d'exploitation possible via les variables d'env
 * ADMIN_EMAILS / SUPERUSER_EMAILS (comma-separated) sans redéploiement - mais alors
 * la RLS reste sur les valeurs de la migration : ne changer les rôles réels que par
 * une migration + un déploiement alignés.
 */

import { env } from '$env/dynamic/private';
import { parseEnvList } from '$lib/server/auth';

export type AppRole = 'admin' | 'superuser' | 'user';

/** Admins : Pascal, ses deux adresses. */
export const DEFAULT_ADMIN_EMAILS = [
	'pascal@filmpro.ch',
	'pascal@lamaisoncreativedirection.ch',
] as const;

/** Superusers : Antoine, ses deux adresses. */
export const DEFAULT_SUPERUSER_EMAILS = [
	'antoine@filmpro.ch',
	'antoine@lamaisoncreativedirection.ch',
] as const;

function normalizeEmail(email: string | null | undefined): string | null {
	if (!email) return null;
	const e = email.trim().toLowerCase();
	return e.length > 0 ? e : null;
}

/** Liste depuis l'env (comma-separated) si non vide, sinon le défaut versionné. */
function listFromEnv(raw: string | undefined, fallback: readonly string[]): string[] {
	const parsed = parseEnvList(raw); // trim + lowercase + filtre les vides
	return parsed.length > 0 ? parsed : fallback.map((e) => e.toLowerCase());
}

export function getAdminEmails(): string[] {
	return listFromEnv(env.ADMIN_EMAILS, DEFAULT_ADMIN_EMAILS);
}

export function getSuperuserEmails(): string[] {
	return listFromEnv(env.SUPERUSER_EMAILS, DEFAULT_SUPERUSER_EMAILS);
}

/** Éditeurs des mots-clés Signaux = admins ∪ superusers (dédupliqués). */
export function getEditorEmails(): string[] {
	return Array.from(new Set([...getAdminEmails(), ...getSuperuserEmails()]));
}

/** admin : traite les retours (/log) + édite les mots-clés Signaux. */
export function isAdmin(email: string | null | undefined): boolean {
	const e = normalizeEmail(email);
	return e !== null && getAdminEmails().includes(e);
}

/** superuser : édite les mots-clés Signaux (pas les retours). */
export function isSuperuser(email: string | null | undefined): boolean {
	const e = normalizeEmail(email);
	return e !== null && getSuperuserEmails().includes(e);
}

/** peut éditer les mots-clés Signaux : admin OU superuser. */
export function isEditor(email: string | null | undefined): boolean {
	return isAdmin(email) || isSuperuser(email);
}

/**
 * Rôle résolu (admin > superuser > user). `null` seulement pour un email vide/absent.
 * Un email non-nul qui n'est ni admin ni superuser est un `user` normal.
 */
export function roleOf(email: string | null | undefined): AppRole | null {
	const e = normalizeEmail(email);
	if (e === null) return null;
	if (getAdminEmails().includes(e)) return 'admin';
	if (getSuperuserEmails().includes(e)) return 'superuser';
	return 'user';
}

// Spec : notes/page-log-2026-05-13/spec.md § 6 + § 7.2.
// Helper unique pour identifier l'admin (lecture/écriture admin_notes, changement de statut,
// export JSON). Aligné sur le pattern auth allowlist email du CRM (pas de table roles).

export const ADMIN_EMAIL = 'pascal@filmpro.ch';

export function isAdminEmail(email: string | null | undefined): boolean {
	if (!email) return false;
	return email.trim().toLowerCase() === ADMIN_EMAIL;
}

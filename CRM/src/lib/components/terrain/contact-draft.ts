/**
 * Validation pure du brouillon contact terrain (AC-009, miroir client du
 * contrat serveur `POST /api/contact-suggestions`). Au moins un identifiant
 * requis (prénom OU nom OU téléphone OU email), sinon le CTA reste désactivé.
 * Aucune création directe de `contacts` ici — uniquement la garde de saisie.
 */

export type ContactDraft = {
	prenom?: string | null;
	nom?: string | null;
	role_fonction?: string | null;
	telephone?: string | null;
	email?: string | null;
	notes?: string | null;
};

function present(v: string | null | undefined): v is string {
	return typeof v === 'string' && v.trim() !== '';
}

/**
 * Vrai si le brouillon porte au moins un identifiant exploitable.
 * `role_fonction` et `notes` ne comptent PAS comme identifiant (un rôle seul
 * sans personne ne crée pas un contact utile).
 */
export function hasIdentifier(draft: ContactDraft): boolean {
	return (
		present(draft.prenom) ||
		present(draft.nom) ||
		present(draft.telephone) ||
		present(draft.email)
	);
}

/** Construit le payload trimmé pour l'API (champs vides omis → undefined). */
export function buildContactSuggestionPayload(
	entreprise_id: string,
	draft: ContactDraft,
	visit_id?: string | null,
): Record<string, string> {
	const out: Record<string, string> = { entreprise_id };
	const map: Array<[keyof ContactDraft, string]> = [
		['prenom', 'prenom'],
		['nom', 'nom'],
		['role_fonction', 'role_fonction'],
		['telephone', 'telephone'],
		['email', 'email'],
		['notes', 'notes'],
	];
	for (const [k, outKey] of map) {
		const v = draft[k];
		if (present(v)) out[outKey] = v.trim();
	}
	if (present(visit_id)) out.visit_id = visit_id.trim();
	return out;
}

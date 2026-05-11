/**
 * Audit 360 M-22 : validation unique d'un slug de thème veille.
 *
 * Le champ `theme` d'un item est validé en deux temps :
 *  1. Zod (`IntelligenceItemSchema.theme`) : juste une chaîne `min(1).max(64)` —
 *     volontairement permissif depuis S169 (taxonomie dynamique DB).
 *  2. Allowlist post-Zod : le slug doit appartenir à la liste des thèmes actifs
 *     de la table `veille_themes`.
 *
 * Cette fonction est la source unique de l'étape 2, partagée entre :
 *  - `generate.ts` (dégradation gracieuse vers 'autre' si le modèle sort un slug
 *    inconnu malgré le JSON schema strict-mode),
 *  - `/veille/[id]/+page.server.ts` (refus de l'ajout manuel d'un item avec un
 *    thème inconnu/inactif).
 */
export function isAllowedThemeSlug(slug: string, allowedSlugs: ReadonlyArray<string>): boolean {
	return allowedSlugs.includes(slug);
}

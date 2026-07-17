import type { FeatureFlags } from '$lib/types/feature-flags';

/**
 * Chantier « Cohérence UI » - bandeau de page in-page (PageBand), derrière le flag ff_page_bandeau.
 *
 * SOURCE UNIQUE de la décision « le bandeau est-il actif sur cette route ? », consommée à la fois par
 * le layout (`Header.hideTitle`) et par chaque page migrée (rendu de `<PageBand>`). Les deux décisions
 * ne peuvent donc JAMAIS diverger : si elles utilisaient chacune leur propre logique, un oubli
 * produirait soit un double titre (Header + bandeau), soit zéro titre (aucun des deux) - exactement
 * le piège relevé par la revue bug-hunter du 2026-07-16.
 *
 * Migrer une page = (1) ajouter sa route ici ET (2) rendre `<PageBand>` dans la page en gardant
 * `isBandeauActive(...)` comme condition. Spec : docs/COHERENCE-UI-BANDEAU.md.
 */
export const BANDEAU_ROUTES: readonly string[] = [
	'/crm/entreprises',
	'/crm/contacts',
	'/crm/pipeline',
	'/crm/signaux',
	'/crm/campagnes',
];

/**
 * Vrai si le flag est actif ET si la route courante a adopté le bandeau. Match exact du pathname
 * (SvelteKit `trailingSlash: 'never'` par défaut → pas de slash final ; les sous-routes ne matchent
 * pas, ce qui est voulu : une page détail ne porte pas le bandeau de sa page liste).
 */
export function isBandeauActive(flags: FeatureFlags | null | undefined, pathname: string): boolean {
	return flags?.ffPageBandeau === true && BANDEAU_ROUTES.includes(pathname);
}

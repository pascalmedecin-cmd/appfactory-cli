import type { FeatureFlags } from '$lib/types/feature-flags';

/**
 * Chantier « Cohérence UI » - increments b/c/d, derrière le flag `ff_ui_coherence`.
 *
 * SOURCE UNIQUE de la décision « la cohérence UI est-elle active ? ». Même patron que le flag
 * `ffCrmListesV2` (« premium ») : un seul flag par-user, chaque page/le layout lit ce booléen et
 * bascule ses briques. OFF ⇒ rendu strictement identique à aujourd'hui (zéro régression).
 *
 * Deux mécaniques de bascule, aucune n'introduit de couleur/police hors token `src/app.css` :
 *  1. class-swap dans les pages : `class={coherence ? 'ws-btn ws-btn-primary' : '<classes legacy>'}`.
 *     Les handlers/enfants restent SOURCE UNIQUE (jamais dupliqués) ⇒ pas de dérive ON/OFF. La cible
 *     bouton est la primitive EXISTANTE `.ws-btn` (src/lib/styles/workspace.css), pas un nouveau standard.
 *  2. override CSS ancré : le layout ajoute `.coherence-ui` sur `.crm-shell` quand le flag est ON ;
 *     chaque brique partagée porte son propre override CO-LOCALISÉ `:global(.coherence-ui) .xxx` dans
 *     son `<style>` scopé (Badge, SourcePill, SearchInput…). Co-localisé = spécificité (0-3-0) fiable
 *     sur une classe scopée + hook NAMESPACÉ (jamais un nom nu type `.badge` qui hériterait d'un
 *     `:global(.badge)` étranger). OFF ⇒ `.coherence-ui` absent ⇒ aucun override ne s'applique.
 *
 * Spec : docs/COHERENCE-UI-BANDEAU.md § « Increments b/c/d ».
 */

/** Vrai si le flag cohérence UI est actif (null-safe). Pas de gate par route (aucune décision layout partagée). */
export function isCoherenceActive(flags: FeatureFlags | null | undefined): boolean {
	return flags?.ffUiCoherence === true;
}

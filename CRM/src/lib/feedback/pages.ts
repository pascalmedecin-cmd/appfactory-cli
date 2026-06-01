// Spec : notes/page-log-2026-05-13/spec.md § 6.2 + § 7.1.
// Liste des pages CRM dérivée de config.navigation (primary + secondary) + entrée fallback
// « Autre / hors CRM ». Permet de pré-remplir le dropdown « Page concernée » du formulaire
// à partir de l'URL active.

import { config, CRM_BASE } from '$lib/config';

export interface FeedbackPageOption {
	href: string;
	label: string;
}

export const FALLBACK_PAGE: FeedbackPageOption = {
	href: 'autre',
	label: 'Autre / hors CRM',
};

export function buildPageOptions(): FeedbackPageOption[] {
	const primary = config.navigation.primary.map((item) => ({ href: item.href, label: item.label }));
	const secondary = config.navigation.secondary
		// /log lui-même n'a pas de sens comme « page concernée » d'un retour, on l'exclut.
		// (l'entrée existe pour le menu, mais l'utilisateur signalera plutôt /log via Autre).
		.filter((item) => item.href !== `${CRM_BASE}/log`)
		.map((item) => ({ href: item.href, label: item.label }));
	return [...primary, ...secondary, FALLBACK_PAGE];
}

// Match le path le plus long parmi les options (prefix). Retourne le fallback si rien
// ne matche. Insensible aux query params / hash.
export function pagesForUrl(pathname: string): FeedbackPageOption {
	const cleaned = (pathname || '/').split('?')[0].split('#')[0];
	const options = buildPageOptions();
	// Tri par longueur du href décroissante pour éviter qu'un href racine ('/') prenne
	// la priorité sur '/contacts/foo'.
	const ranked = options
		.filter((opt) => opt.href !== FALLBACK_PAGE.href)
		.sort((a, b) => b.href.length - a.href.length);
	for (const opt of ranked) {
		// Le dashboard (= CRM_BASE) ne matche qu'en exact : son prefixe matcherait
		// sinon toutes les pages /crm/* (le tri par longueur le couvre, ceinture + bretelles).
		if (opt.href === CRM_BASE) {
			if (cleaned === CRM_BASE) return opt;
			continue;
		}
		if (cleaned === opt.href || cleaned.startsWith(opt.href + '/')) {
			return opt;
		}
	}
	return FALLBACK_PAGE;
}

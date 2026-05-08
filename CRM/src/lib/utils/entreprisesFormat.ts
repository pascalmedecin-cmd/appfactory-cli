/**
 * Helpers de formatage et calculs pour la page /entreprises (refonte v9 S176bis page 4/6).
 * - entreprisesIndicators : 4 KPIs flat premium (total, qualifiees, avecContact, sansCanton)
 * - filterEntreprisesByTab : filtre selon tab actif (toutes, qualifiees, a-qualifier, sans-contact)
 * - entreprisesCountsByTab : counts par tab pour pills
 */

export type EntreprisesTab = 'toutes' | 'qualifiees' | 'a-qualifier' | 'sans-contact';

export type EntreprisesView = 'table' | 'cards';

export type EntrepriseLite = {
	id: string;
	statut_qualification: string | null;
	canton: string | null;
};

export type ContactForEntrepriseLite = {
	entreprise_id: string | null;
};

export type EntreprisesIndicatorsValues = {
	total: number;
	qualifiees: number;
	avecContact: number;
	sansCanton: number;
};

/**
 * Calcule l'ensemble des entreprise_id ayant au moins un contact rattaché.
 * Utilisé par indicators + filter pour éviter recalcul O(n*m).
 */
function buildEntrepriseIdsWithContact<C extends ContactForEntrepriseLite>(
	contacts: ReadonlyArray<C>
): Set<string> {
	const set = new Set<string>();
	for (const c of contacts) {
		if (c.entreprise_id) set.add(c.entreprise_id);
	}
	return set;
}

/**
 * Indicateurs flat premium en haut de page /entreprises.
 * - total : count entreprises
 * - qualifiees : statut_qualification='qualifie'
 * - avecContact : count entreprises ayant ≥1 contact rattaché
 * - sansCanton : count canton=null/vide
 */
export function entreprisesIndicators<E extends EntrepriseLite, C extends ContactForEntrepriseLite>(
	entreprises: ReadonlyArray<E>,
	contacts: ReadonlyArray<C>
): EntreprisesIndicatorsValues {
	const idsWithContact = buildEntrepriseIdsWithContact(contacts);

	let total = 0;
	let qualifiees = 0;
	let avecContact = 0;
	let sansCanton = 0;

	for (const e of entreprises) {
		total += 1;
		if (e.statut_qualification === 'qualifie') qualifiees += 1;
		if (idsWithContact.has(e.id)) avecContact += 1;
		if (!e.canton) sansCanton += 1;
	}

	return { total, qualifiees, avecContact, sansCanton };
}

/**
 * Filtre les entreprises selon le tab actif.
 * - toutes : aucun filtre supplémentaire
 * - qualifiees : statut_qualification='qualifie'
 * - a-qualifier : statut_qualification='nouveau' OU null (à qualifier = pas encore traité)
 * - sans-contact : aucun contact rattaché
 */
export function filterEntreprisesByTab<E extends EntrepriseLite, C extends ContactForEntrepriseLite>(
	entreprises: ReadonlyArray<E>,
	contacts: ReadonlyArray<C>,
	tab: EntreprisesTab
): E[] {
	if (tab === 'toutes') return [...entreprises];
	if (tab === 'qualifiees') {
		return entreprises.filter((e) => e.statut_qualification === 'qualifie');
	}
	if (tab === 'a-qualifier') {
		return entreprises.filter(
			(e) => e.statut_qualification === 'nouveau' || e.statut_qualification === null
		);
	}
	// sans-contact
	const idsWithContact = buildEntrepriseIdsWithContact(contacts);
	return entreprises.filter((e) => !idsWithContact.has(e.id));
}

/**
 * Counts par tab pour les pills compteur des onglets ARIA.
 */
export function entreprisesCountsByTab<E extends EntrepriseLite, C extends ContactForEntrepriseLite>(
	entreprises: ReadonlyArray<E>,
	contacts: ReadonlyArray<C>
): Record<EntreprisesTab, number> {
	const idsWithContact = buildEntrepriseIdsWithContact(contacts);
	let qualifiees = 0;
	let aQualifier = 0;
	let sansContact = 0;
	for (const e of entreprises) {
		if (e.statut_qualification === 'qualifie') qualifiees += 1;
		if (e.statut_qualification === 'nouveau' || e.statut_qualification === null) aQualifier += 1;
		if (!idsWithContact.has(e.id)) sansContact += 1;
	}
	return {
		toutes: entreprises.length,
		qualifiees,
		'a-qualifier': aQualifier,
		'sans-contact': sansContact,
	};
}

/**
 * Message contextualisé pour l'EmptyState selon le tab actif.
 */
export function emptyMessageForTab(tab: EntreprisesTab): string {
	switch (tab) {
		case 'qualifiees':
			return 'Aucune entreprise qualifiée pour le moment.';
		case 'a-qualifier':
			return 'Toutes vos entreprises sont qualifiées. Bravo.';
		case 'sans-contact':
			return 'Toutes vos entreprises ont au moins un contact rattaché.';
		case 'toutes':
		default:
			return 'Aucune entreprise. Ajoutez-en une manuellement ou rattachez-en via un contact.';
	}
}

/**
 * Lit la vue persistée depuis localStorage (SSR-safe).
 * Default : 'table' (efficacité workspace).
 */
export function readPersistedView(storage: Pick<Storage, 'getItem'> | null | undefined): EntreprisesView {
	if (!storage) return 'table';
	try {
		const raw = storage.getItem('crm.entreprises.view');
		return raw === 'cards' ? 'cards' : 'table';
	} catch {
		return 'table';
	}
}

/**
 * Persiste la vue choisie en localStorage (SSR-safe, no-op si indispo).
 */
export function persistView(storage: Pick<Storage, 'setItem'> | null | undefined, view: EntreprisesView): void {
	if (!storage) return;
	try {
		storage.setItem('crm.entreprises.view', view);
	} catch {
		// ignore quota / privacy mode
	}
}

/**
 * Logo Clearbit pour un site web. Retourne null si site_web invalide.
 * Utilisé en cards + table cellule logo.
 * Note GDPR : envoie hostname domaine prospect à Clearbit (Watchlist S176bis).
 */
export function logoUrlForSite(siteWeb: string | null | undefined): string | null {
	if (!siteWeb) return null;
	try {
		const url = new URL(siteWeb);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
		return `https://logo.clearbit.com/${url.hostname}`;
	} catch {
		return null;
	}
}

/**
 * Compte le nombre de contacts rattachés à une entreprise donnée.
 */
export function contactCountForEntreprise<C extends ContactForEntrepriseLite>(
	entrepriseId: string,
	contacts: ReadonlyArray<C>
): number {
	let n = 0;
	for (const c of contacts) {
		if (c.entreprise_id === entrepriseId) n += 1;
	}
	return n;
}

/**
 * Helpers de formatage et calculs pour la page /contacts (refonte v9 S176bis).
 * - normalizeCompanyName : extrait pour partage client + server (anti-duplication entreprise)
 * - contactsIndicators : 4 KPIs flat premium (total, prescripteurs, nouveaux ce mois, sans entreprise)
 * - filterContactsByTab : filtre selon tab actif (tous, prescripteurs, à qualifier, sans entreprise)
 */

export type ContactsTab = 'tous' | 'prescripteurs' | 'a-qualifier' | 'sans-entreprise';

export type ContactLite = {
	id: string;
	entreprise_id: string | null;
	statut_qualification: string | null;
	est_prescripteur: boolean | null;
	date_ajout: string | null;
};

export type ContactsIndicatorsValues = {
	total: number;
	prescripteurs: number;
	nouveauxThisMonth: number;
	sansEntreprise: number;
};

/**
 * Normalise un nom d'entreprise pour comparaison fuzzy.
 * Retire les suffixes légaux courants (SA, SàRL, GmbH, AG, etc.) + caractères non-alphanumériques.
 * Source unique de vérité côté client + server.
 */
export function normalizeCompanyName(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/\s+(sa|sàrl|sarl|gmbh|ag|s\.a\.|s\.à\.r\.l\.)$/i, '')
		.replace(/[^a-zà-ü0-9]/g, '');
}

/**
 * Indicateurs flat premium en haut de page /contacts.
 * - total : count des contacts actifs (déjà filtrés statut_archive=false côté load)
 * - prescripteurs : count est_prescripteur=true
 * - nouveauxThisMonth : count date_ajout dans le mois courant
 * - sansEntreprise : count entreprise_id=null
 */
export function contactsIndicators<T extends ContactLite>(
	contacts: ReadonlyArray<T>,
	now: Date = new Date()
): ContactsIndicatorsValues {
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

	let total = 0;
	let prescripteurs = 0;
	let nouveauxThisMonth = 0;
	let sansEntreprise = 0;

	for (const c of contacts) {
		total += 1;
		if (c.est_prescripteur) prescripteurs += 1;
		if (!c.entreprise_id) sansEntreprise += 1;
		if (c.date_ajout) {
			const d = new Date(c.date_ajout);
			if (!Number.isNaN(d.getTime()) && d >= monthStart && d <= now) {
				nouveauxThisMonth += 1;
			}
		}
	}

	return { total, prescripteurs, nouveauxThisMonth, sansEntreprise };
}

/**
 * Filtre les contacts selon le tab actif.
 * - tous : aucun filtre supplémentaire (statut_archive=false déjà appliqué côté load)
 * - prescripteurs : est_prescripteur=true
 * - a-qualifier : statut_qualification='nouveau'
 * - sans-entreprise : entreprise_id=null
 */
export function filterContactsByTab<T extends ContactLite>(contacts: ReadonlyArray<T>, tab: ContactsTab): T[] {
	switch (tab) {
		case 'prescripteurs':
			return contacts.filter((c) => c.est_prescripteur === true);
		case 'a-qualifier':
			return contacts.filter((c) => c.statut_qualification === 'nouveau');
		case 'sans-entreprise':
			return contacts.filter((c) => !c.entreprise_id);
		case 'tous':
		default:
			return [...contacts];
	}
}

/**
 * Counts par tab pour les pills compteur des onglets ARIA.
 */
export function contactsCountsByTab<T extends ContactLite>(contacts: ReadonlyArray<T>): Record<ContactsTab, number> {
	return {
		tous: contacts.length,
		prescripteurs: contacts.filter((c) => c.est_prescripteur === true).length,
		'a-qualifier': contacts.filter((c) => c.statut_qualification === 'nouveau').length,
		'sans-entreprise': contacts.filter((c) => !c.entreprise_id).length,
	};
}

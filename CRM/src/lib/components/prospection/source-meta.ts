/**
 * Prospection P3 — métadonnées des 3 sources « entreprises » du flux aperçu → import.
 *
 * Identité couleur = tokens charte CRM existants (app.css), déjà testés AA :
 *  - Annuaire (search.ch) → prosp-enrich (violet sourd)
 *  - Google (google_places) → prosp-place (sarcelle sobre)
 *  - Registre (zefix) → prosp-import (bleu ardoise)
 *
 * Aucun token nouveau (cohérent golden validé 2026-06-18).
 */

export type EntrepriseSource = 'search_ch' | 'google_places' | 'zefix';

export interface SourcePill {
	icon: string;
	label: string;
	/** Coordonnée « phare » de la source (mise en avant couleur). */
	star?: boolean;
}

export interface SourceCardMeta {
	key: EntrepriseSource;
	endpoint: string;
	/** Code court affiché en pastille (TEL / GP / RC). */
	code: string;
	title: string;
	/** Mode de recherche en clair (« par activité + lieu » / « par nom »). */
	how: string;
	desc: string;
	icon: string;
	/** Variables CSS charte (sans le `var(...)`, on les compose au call site). */
	cssVar: string;
	bgVar: string;
	borderVar: string;
	deepVar: string;
	pills: SourcePill[];
	/** true = source payante au quota (Google). false = gratuite. */
	paid: boolean;
}

/** Ordre d'affichage des cartes = ordre du golden validé : Annuaire, Google, Registre. */
export const SOURCE_CARDS: Record<EntrepriseSource, SourceCardMeta> = {
	search_ch: {
		key: 'search_ch',
		endpoint: '/api/prospection/searchch',
		code: 'TEL',
		title: 'Annuaire',
		how: 'par activité + lieu',
		desc: 'Idéal pour cibler un type d’entreprise dans une zone : l’annuaire pro suisse, avec téléphone direct.',
		icon: 'phone_forwarded',
		cssVar: '--color-prosp-enrich',
		bgVar: '--color-prosp-enrich-bg',
		borderVar: '--color-prosp-enrich-border',
		deepVar: '--color-prosp-enrich-deep',
		pills: [
			{ icon: 'phone_forwarded', label: 'Téléphone', star: true },
			{ icon: 'location_on', label: 'Adresse' },
		],
		paid: false,
	},
	google_places: {
		key: 'google_places',
		endpoint: '/api/prospection/google-places',
		code: 'GP',
		title: 'Google',
		how: 'par activité + lieu',
		desc: 'La source la plus complète : récupère aussi le site web. Parfaite pour qualifier vite avec un maximum de coordonnées.',
		icon: 'location_on',
		cssVar: '--color-prosp-place',
		bgVar: '--color-prosp-place-bg',
		borderVar: '--color-prosp-place-border',
		deepVar: '--color-prosp-place-deep',
		pills: [
			{ icon: 'phone_forwarded', label: 'Téléphone', star: true },
			{ icon: 'language', label: 'Site web', star: true },
			{ icon: 'location_on', label: 'Adresse' },
		],
		paid: true,
	},
	zefix: {
		key: 'zefix',
		endpoint: '/api/prospection/zefix',
		code: 'RC',
		title: 'Registre',
		how: 'par nom',
		desc: 'Quand vous connaissez déjà le nom de l’entreprise : retrouve la fiche légale officielle au registre du commerce.',
		icon: 'landmark',
		cssVar: '--color-prosp-import',
		bgVar: '--color-prosp-import-bg',
		borderVar: '--color-prosp-import-border',
		deepVar: '--color-prosp-import-deep',
		pills: [
			{ icon: 'gavel', label: 'Données légales', star: true },
			{ icon: 'business', label: 'Forme juridique' },
		],
		paid: false,
	},
};

/** Ordre canonique des cartes (golden). */
export const SOURCE_ORDER: EntrepriseSource[] = ['search_ch', 'google_places', 'zefix'];

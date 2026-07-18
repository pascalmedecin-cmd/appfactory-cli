/**
 * Types d'activité Google Places - SOURCE UNIQUE, marque-aware (Run 3 dette D3 + parité bi-marque #5).
 *
 * Avant : la liste vivait dans `google-places/helpers.ts` (serveur) ET était recopiée en dur dans
 * `ImportModal.svelte` → drift possible. Après : les deux consomment cette table. Données pures
 * (labels + mots-clés de recherche Google Text Search), importables client + serveur. Le `key` est
 * envoyé par le client et validé contre l'enum fermée ; le `keyword` est injecté dans `textQuery`
 * (économie de quota : enum fermée + canton requis).
 *
 * FilmPro = cibles du réseau de partenaires (validées 2026-05-12 par tests live Places API,
 * cf. scripts/probe-google-places-queries.mjs). LED = cibles LED Studio (événementiel, stands,
 * enseignes/signalétique, retail), validées Pascal 2026-07-18 (maquette parité) - dérivées de la
 * vérification V2 (Mydisplay, Eigenmann Expo, Espace Montage, enseignistes). Les clés sont uniques
 * cross-marque : le serveur valide/résout contre l'UNION ; le client n'affiche que le jeu de la marque.
 */
import type { Marque } from '$lib/marque';

export type ActivityType = {
	readonly key: string;
	readonly label: string;
	readonly includedType: string | null;
	readonly keyword: string | null;
};

/** Cibles FilmPro (réseau partenaire construction/immobilier). Ordre = ordre du menu. */
export const ACTIVITY_TYPES_FILMPRO = [
	{ key: 'regies_syndics', label: 'Régies immobilières et syndics de copropriété', includedType: null, keyword: 'régie immobilière syndic de copropriété' },
	{ key: 'facility_management', label: 'Facility management et gestion de bâtiments', includedType: null, keyword: 'facility management gestion technique de bâtiment property management' },
	{ key: 'bureaux_etudes', label: 'Bureaux d’études énergie et thermique', includedType: null, keyword: 'bureau d’études thermique énergie bâtiment CECB' },
	{ key: 'architectes_designers', label: 'Architectes et architectes d’intérieur', includedType: null, keyword: 'architecte architecte d’intérieur agence d’architecture' },
	{ key: 'cvc_hvac', label: 'Climatisation, ventilation, CVC / HVAC', includedType: null, keyword: 'climatisation ventilation CVC chauffage entreprise HVAC' },
	{ key: 'entreprises_generales', label: 'Entreprises générales du bâtiment', includedType: null, keyword: 'entreprise générale du bâtiment rénovation' },
	{ key: 'securite_batiment', label: 'Sécurité du bâtiment (alarme, accès, vidéo)', includedType: null, keyword: 'sécurité bâtiment alarme contrôle d’accès vidéosurveillance' },
	{ key: 'commerce', label: 'Commerce (magasins, boutiques, vitrines)', includedType: null, keyword: 'magasin boutique commerce de détail vitrine' },
	{ key: 'other', label: 'Mot-clé libre', includedType: null, keyword: null },
] as const;

/** Cibles LED Studio (événementiel, stands, enseignes/signalétique, retail). Validées Pascal 18/07. */
export const ACTIVITY_TYPES_LED = [
	{ key: 'agences_evenementielles', label: 'Agences événementielles et organisateurs', includedType: null, keyword: 'agence événementielle organisation d’événements production événementielle' },
	{ key: 'monteurs_stands', label: 'Monteurs de stands et agencement d’expositions', includedType: null, keyword: 'stand d’exposition montage de stand agencement de stand salon' },
	{ key: 'signaletique_enseignes', label: 'Signalétique et enseignistes', includedType: null, keyword: 'signalétique enseigne publicitaire enseigne lumineuse lettrage' },
	{ key: 'communication_visuelle', label: 'Agences de communication visuelle et publicité', includedType: null, keyword: 'communication visuelle agence de publicité impression grand format' },
	{ key: 'retail_commerces', label: 'Commerces et retail (vitrines, magasins)', includedType: null, keyword: 'magasin boutique commerce de détail vitrine retail' },
	{ key: 'architectes_interieur', label: 'Architectes d’intérieur et scénographes', includedType: null, keyword: 'architecte d’intérieur scénographie agencement de magasin retail design' },
	{ key: 'other', label: 'Mot-clé libre', includedType: null, keyword: null },
] as const;

export const ACTIVITY_TYPES_BY_MARQUE: Record<Marque, readonly ActivityType[]> = {
	filmpro: ACTIVITY_TYPES_FILMPRO,
	led: ACTIVITY_TYPES_LED,
};

/** Union des deux marques (clés uniques) : le serveur valide/résout le keyword contre elle. */
export const ACTIVITY_TYPES_ALL: readonly ActivityType[] = [...ACTIVITY_TYPES_FILMPRO, ...ACTIVITY_TYPES_LED];

export type ActivityTypeKey = (typeof ACTIVITY_TYPES_FILMPRO)[number]['key'] | (typeof ACTIVITY_TYPES_LED)[number]['key'];

/** Rétro-compat : consommateurs pré-parité (défaut FilmPro). */
export const ACTIVITY_TYPES = ACTIVITY_TYPES_FILMPRO;

/** Types d'activité de la marque active (défaut sûr filmpro). */
export function activityTypesFor(marque: Marque): readonly ActivityType[] {
	return ACTIVITY_TYPES_BY_MARQUE[marque] ?? ACTIVITY_TYPES_FILMPRO;
}

/** Clé d'activité par défaut de la marque (1re du menu : filmpro=regies_syndics, led=agences_evenementielles). */
export function defaultActivityKey(marque: Marque): ActivityTypeKey {
	return activityTypesFor(marque)[0].key as ActivityTypeKey;
}

/** Options {key,label} pour l'UI, par marque. */
export function gpActivityOptionsFor(marque: Marque): readonly { key: ActivityTypeKey; label: string }[] {
	return activityTypesFor(marque).map(({ key, label }) => ({ key: key as ActivityTypeKey, label }));
}

/** Rétro-compat : options FilmPro (consommateurs pré-parité). */
export const GP_ACTIVITY_OPTIONS: readonly { key: ActivityTypeKey; label: string }[] =
	ACTIVITY_TYPES_FILMPRO.map(({ key, label }) => ({ key: key as ActivityTypeKey, label }));

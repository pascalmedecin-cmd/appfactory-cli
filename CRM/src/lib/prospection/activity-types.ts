/**
 * Types d'activité Google Places - SOURCE UNIQUE (Run 3 Atelier 209, dette D3 : mirror supprimé).
 *
 * Avant : la liste vivait dans `google-places/helpers.ts` (serveur) ET était recopiée en dur dans
 * `ImportModal.svelte` (`GP_ACTIVITY_OPTIONS`, labels seuls) → drift possible. Après : les deux
 * consomment cette table. Données pures (labels + mots-clés de recherche Google Text Search),
 * importables client + serveur. Le `key` est envoyé par le client et validé contre l'enum fermée ;
 * le `keyword` est injecté dans `textQuery` (économie de quota : enum fermée + canton requis).
 *
 * Cibles du réseau de partenaires FilmPro (validées 2026-05-12 par tests live sur Places API,
 * cf. scripts/probe-google-places-queries.mjs). Non marque-aware pour l'instant : le sourcing LED
 * passe par l'import de liste (Run 3), pas par la recherche Google par activité.
 */
export const ACTIVITY_TYPES = [
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

export type ActivityTypeKey = (typeof ACTIVITY_TYPES)[number]['key'];

/** Options {key,label} pour l'UI (mirror unique consommé par ImportModal). */
export const GP_ACTIVITY_OPTIONS: readonly { key: ActivityTypeKey; label: string }[] =
	ACTIVITY_TYPES.map(({ key, label }) => ({ key, label }));

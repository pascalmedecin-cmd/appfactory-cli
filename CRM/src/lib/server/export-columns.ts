/**
 * Colonnes d'export CSV partagées (source unique).
 *
 * Consommé par les deux endpoints qui exportent `prospect_leads` :
 * - `/api/export/leads`        : export complet (page /reporting).
 * - `/api/export/prospection`  : export filtré « ce que tu vois » (page Prospection).
 * Garde les deux exports byte-identiques sur le schéma (ordre + libellés). Tout
 * renommage/réordonnancement de colonne = incrémenter `EXPORT_SCHEMA_VERSION`
 * (cf. `$lib/server/csv-export`).
 */
import type { CsvColumn } from '$lib/server/csv-export';

/** Date ISO raccourcie (YYYY-MM-DD) ou chaîne vide. Supabase renvoie ISO 8601. */
export function formatDateShort(v: unknown): string {
	if (!v) return '';
	return String(v).slice(0, 10);
}

/** Colonnes CSV de la table `prospect_leads`. */
export const LEADS_EXPORT_COLUMNS: CsvColumn<Record<string, unknown>>[] = [
	{ key: 'source', label: 'Source' },
	{ key: 'source_id', label: 'Source ID' },
	{ key: 'source_url', label: 'Source URL' },
	{ key: 'raison_sociale', label: 'Raison sociale' },
	{ key: 'nom_contact', label: 'Contact' },
	{ key: 'adresse', label: 'Adresse' },
	{ key: 'npa', label: 'NPA' },
	{ key: 'localite', label: 'Localité' },
	{ key: 'canton', label: 'Canton' },
	{ key: 'telephone', label: 'Téléphone' },
	{ key: 'email', label: 'Email' },
	{ key: 'site_web', label: 'Site web' },
	{ key: 'secteur_detecte', label: 'Secteur' },
	{ key: 'montant', label: 'Montant' },
	{ key: 'statut', label: 'Statut' },
	{ key: 'score_pertinence', label: 'Score' },
	// Vague 3.2 : campagnes (relation N-N) jointes en une cellule. La valeur est pré-attachée
	// sous `row.campagnes` par chaque endpoint export (prospection filtré + /reporting leads).
	{ key: 'campagnes', label: 'Campagnes' },
	{ key: 'date_publication', label: 'Publié le', transform: formatDateShort },
	{ key: 'date_import', label: 'Créé le', transform: formatDateShort }
];

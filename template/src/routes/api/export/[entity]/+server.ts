/**
 * Export CSV dynamique : /api/export/contacts, /api/export/entreprises,
 * /api/export/leads. Protégé par le hook global (session requise).
 *
 * Retourne un fichier CSV téléchargeable (RFC 4180). Exclut les entrées
 * archivées par défaut pour contacts/entreprises ; inclut tous les leads
 * actifs (non pertinent : table dédiée prospect_leads, pas de soft-delete).
 */
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { toCsv, csvFilename, csvResponseHeaders, type CsvColumn } from '$lib/server/csv-export';

type EntityConfig = {
	table: string;
	select: string;
	filter?: { column: string; value: unknown };
	orderBy: string;
	columns: CsvColumn<Record<string, unknown>>[];
};

/** Helper : formatage sécurisé d'une relation jointe. */
function formatJoined(path: string[]): (v: unknown, row: Record<string, unknown>) => string {
	return (_v, row) => {
		let current: unknown = row;
		for (const key of path) {
			if (current && typeof current === 'object' && key in current) {
				current = (current as Record<string, unknown>)[key];
			} else {
				return '';
			}
		}
		return current == null ? '' : String(current);
	};
}

/** Helper : date ISO raccourcie (YYYY-MM-DD) ou string vide. */
function formatDateShort(v: unknown): string {
	if (!v) return '';
	const s = String(v);
	// Supabase renvoie ISO 8601 ; on coupe à la date.
	return s.slice(0, 10);
}

const ENTITIES: Record<string, EntityConfig> = {
	contacts: {
		table: 'contacts',
		select: '*, entreprises(raison_sociale)',
		filter: { column: 'statut_archive', value: false },
		orderBy: 'date_derniere_modification',
		columns: [
			{ key: 'nom', label: 'Nom' },
			{ key: 'prenom', label: 'Prénom' },
			{ key: 'email_professionnel', label: 'Email' },
			{ key: 'telephone', label: 'Téléphone' },
			{ key: 'role_fonction', label: 'Rôle / Fonction' },
			{ key: 'entreprises', label: 'Entreprise', transform: formatJoined(['raison_sociale']) },
			{ key: 'canton', label: 'Canton' },
			{ key: 'segment', label: 'Segment' },
			{ key: 'source', label: 'Source' },
			{ key: 'adresse', label: 'Adresse' },
			{ key: 'tags', label: 'Tags' },
			{ key: 'notes_libres', label: 'Notes' },
			{ key: 'date_creation', label: 'Créé le', transform: formatDateShort },
			{ key: 'date_derniere_modification', label: 'Modifié le', transform: formatDateShort }
		]
	},
	entreprises: {
		table: 'entreprises',
		select: '*',
		filter: { column: 'statut_archive', value: false },
		orderBy: 'raison_sociale',
		columns: [
			{ key: 'raison_sociale', label: 'Raison sociale' },
			{ key: 'secteur_activite', label: 'Secteur' },
			{ key: 'canton', label: 'Canton' },
			{ key: 'taille_estimee', label: 'Taille' },
			{ key: 'site_web', label: 'Site web' },
			{ key: 'numero_ide', label: 'N° IDE' },
			{ key: 'adresse_siege', label: 'Adresse siège' },
			{ key: 'segment_cible', label: 'Segment cible' },
			{ key: 'source', label: 'Source' },
			{ key: 'tags', label: 'Tags' },
			{ key: 'notes_libres', label: 'Notes' },
			{ key: 'date_creation', label: 'Créé le', transform: formatDateShort },
			{ key: 'date_derniere_modification', label: 'Modifié le', transform: formatDateShort }
		]
	},
	leads: {
		table: 'prospect_leads',
		select: '*',
		orderBy: 'created_at',
		columns: [
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
			{ key: 'score', label: 'Score' },
			{ key: 'date_publication', label: 'Publié le', transform: formatDateShort },
			{ key: 'created_at', label: 'Créé le', transform: formatDateShort }
		]
	}
};

export const GET: RequestHandler = async ({ params, locals }) => {
	const entity = params.entity ?? '';
	const config = ENTITIES[entity];
	if (!config) {
		throw error(404, `Entité inconnue : ${entity}`);
	}

	let query = locals.supabase.from(config.table).select(config.select);
	if (config.filter) {
		query = query.eq(config.filter.column, config.filter.value);
	}
	query = query.order(config.orderBy, { ascending: false });

	const { data, error: dbError } = await query;
	if (dbError) {
		console.error(`[export ${entity}] erreur Supabase`, dbError);
		throw error(500, 'Erreur lors de la récupération des données');
	}

	const rows = (data ?? []) as unknown as Record<string, unknown>[];
	const csv = toCsv(rows, config.columns);
	// BOM UTF-8 pour ouverture correcte dans Excel (sinon accents cassés).
	const body = '\ufeff' + csv;

	return new Response(body, {
		status: 200,
		headers: csvResponseHeaders(csvFilename(entity))
	});
};

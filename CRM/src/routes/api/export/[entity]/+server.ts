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
import { formatDateShort, LEADS_EXPORT_COLUMNS } from '$lib/server/export-columns';
import { fetchCampagnesByLead } from '$lib/server/campagnes';
import { isCampagnesEnabled } from '$lib/server/feature-gate';

type ExportTable = 'contacts' | 'entreprises' | 'prospect_leads';

type EntityConfig = {
	table: ExportTable;
	select: string;
	filter?: { column: string; value: boolean | string | number };
	orderBy: string;
	columns: CsvColumn<Record<string, unknown>>[];
};

/**
 * Helper : formatage sécurisé d'une relation jointe.
 *
 * `path` part de la VALEUR de la cellule (la relation jointe), pas de la ligne entière —
 * ex. pour la colonne `key: 'entreprises'`, `formatJoined(['raison_sociale'])` lit
 * `row.entreprises.raison_sociale`. (Audit 360 V3a-2 : la version précédente repartait de
 * `row` en ignorant la valeur → la colonne « Entreprise » du CSV contacts était toujours vide.)
 */
function formatJoined(path: string[]): (v: unknown, row: Record<string, unknown>) => string {
	return (value) => {
		let current: unknown = value;
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
			{ key: 'date_ajout', label: 'Créé le', transform: formatDateShort },
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
			{ key: 'date_import_ajout', label: 'Créé le', transform: formatDateShort },
			{ key: 'date_derniere_modification', label: 'Modifié le', transform: formatDateShort }
		]
	},
	leads: {
		table: 'prospect_leads',
		select: '*',
		orderBy: 'date_import',
		// Source unique partagée avec /api/export/prospection (export filtré).
		columns: LEADS_EXPORT_COLUMNS
	}
};

export const GET: RequestHandler = async ({ params, locals }) => {
	const entity = params.entity ?? '';
	const config = ENTITIES[entity];
	if (!config) {
		throw error(404, `Entité inconnue : ${entity}`);
	}

	// Vague 3.2 : la colonne Campagnes (leads) n'apparaît qu'en premium (defense-in-depth ;
	// hors flag l'export leads reste byte-identique a l'existant). Sans objet pour contacts/entreprises.
	const { user } = await locals.safeGetSession();
	const premium = entity === 'leads' && isCampagnesEnabled(user);

	// Atelier 209 Run 2 : cloisonnement bi-marque. Les 3 tables exportables (contacts,
	// entreprises, prospect_leads) portent toutes la colonne `marque` -> l'export CSV ne
	// laisse JAMAIS filtrer les données de l'autre marque (fuite PII à l'export, sinon).
	let query = locals.supabase.from(config.table).select(config.select).eq('marque', locals.marque);
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
	// Vague 3.2 : pour l'export leads (/reporting) EN PREMIUM, pré-attache les campagnes jointes
	// par lead (même colonne partagée que l'export prospection filtré).
	if (premium && rows.length > 0) {
		const byLead = await fetchCampagnesByLead(locals.supabase, locals.marque, rows.map((r) => r.id as string));
		for (const r of rows) r.campagnes = (byLead.get(r.id as string) ?? []).map((c) => c.nom).join('; ');
	}
	const columns = premium ? config.columns : config.columns.filter((c) => c.key !== 'campagnes');
	const csv = toCsv(rows, columns);
	// BOM UTF-8 (Excel). La version du schéma est dans le header HTTP X-Export-Schema-Version (M-21).
	const body = '\ufeff' + csv;

	return new Response(body, {
		status: 200,
		headers: csvResponseHeaders(csvFilename(entity))
	});
};

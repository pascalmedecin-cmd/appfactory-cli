#!/usr/bin/env npx tsx
/**
 * Import CSV vers Supabase pour contacts / entreprises / leads.
 *
 * Usage :
 *   npx tsx scripts/import-csv.ts <entity> <file.csv> [--dry-run]
 *
 * Entities : contacts | entreprises | leads
 * --dry-run : valide et affiche le rapport, n'insère rien en DB.
 *
 * Contraintes :
 *  - Utilise SUPABASE_SERVICE_ROLE_KEY (.env.local) : bypass RLS
 *  - Valide chaque ligne via les Zod schemas existants dans $lib/schemas
 *  - Headers CSV normalisés en snake_case (case-insensitive, espaces → _)
 *  - Stoppe avant INSERT si erreurs (affiche rapport, code de sortie 1)
 *    sauf si --force (non recommandé)
 *  - Aucun dedup automatique : à gérer en amont via export + nettoyage CSV
 *
 * ⚠️ Format des headers CSV attendus :
 *  Les colonnes doivent correspondre aux noms snake_case des champs
 *  Zod (nom, prenom, email_professionnel, canton, entreprise_id, etc.),
 *  PAS aux labels humains utilisés dans l'export /api/export/* (qui
 *  utilise "Nom", "Prénom", "Email", etc.). Pour un round-trip import
 *  depuis un export, renommer d'abord les headers du CSV exporté.
 */

import { config as loadEnv } from 'dotenv';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
	ContactCreateSchema,
	EntrepriseCreateSchema,
	LeadCreateSchema
} from '../src/lib/schemas';
import { parseCsv, csvToObjects, validateRows } from '../src/lib/server/csv-import';
import { newId, now } from '../src/lib/server/db-helpers';

loadEnv({ path: '.env.local' });

const SUPABASE_URL = (process.env.PUBLIC_SUPABASE_URL ?? '').replace(/\\n/g, '').trim();
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').replace(/\\n/g, '').trim();

interface EntityConfig {
	table: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	schema: { safeParse: (v: unknown) => any };
	/** Transforme une ligne validée pour insertion DB (ajoute id, timestamps). */
	toRow: (validated: Record<string, unknown>) => Record<string, unknown>;
}

const ENTITIES: Record<string, EntityConfig> = {
	contacts: {
		table: 'contacts',
		schema: ContactCreateSchema,
		toRow: (v) => {
			const ts = now();
			return {
				id: newId(),
				...v,
				statut_archive: false,
				date_creation: ts,
				date_derniere_modification: ts
			};
		}
	},
	entreprises: {
		table: 'entreprises',
		schema: EntrepriseCreateSchema,
		toRow: (v) => {
			const ts = now();
			return {
				id: newId(),
				...v,
				statut_archive: false,
				date_creation: ts,
				date_derniere_modification: ts
			};
		}
	},
	leads: {
		table: 'prospect_leads',
		schema: LeadCreateSchema,
		toRow: (v) => {
			const ts = now();
			return {
				id: newId(),
				...v,
				statut: 'nouveau',
				score: 0,
				created_at: ts,
				updated_at: ts
			};
		}
	}
};

function usage(): never {
	console.error('Usage : npx tsx scripts/import-csv.ts <entity> <file.csv> [--dry-run]');
	console.error('Entities : contacts | entreprises | leads');
	process.exit(2);
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const dryRun = args.includes('--dry-run');
	const positionals = args.filter((a) => !a.startsWith('--'));
	if (positionals.length < 2) usage();

	const [entity, filePath] = positionals;
	const config = ENTITIES[entity];
	if (!config) {
		console.error(`Entité inconnue : ${entity}`);
		usage();
	}

	if (!dryRun && (!SUPABASE_URL || !SERVICE_KEY)) {
		console.error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local');
		process.exit(3);
	}

	const absPath = resolve(filePath);
	console.log(`[import] lecture ${absPath}`);
	const raw = readFileSync(absPath, 'utf8');

	const rows = parseCsv(raw);
	const objects = csvToObjects(rows);
	console.log(`[import] ${objects.length} ligne(s) détectée(s) (hors header)`);

	const result = validateRows(objects, config.schema);

	console.log(`\n=== Validation ===`);
	console.log(`Total lignes : ${result.total}`);
	console.log(`OK : ${result.ok.length}`);
	console.log(`Erreurs : ${result.errors.length}`);

	if (result.errors.length > 0) {
		console.log(`\n=== Détail erreurs (max 20 affichées) ===`);
		for (const err of result.errors.slice(0, 20)) {
			console.log(`Ligne ${err.line} : ${err.errors.join(' / ')}`);
		}
		if (result.errors.length > 20) {
			console.log(`... et ${result.errors.length - 20} autres erreurs.`);
		}
		console.log(`\nCorriger les erreurs et relancer (import abandonné).`);
		process.exit(1);
	}

	if (dryRun) {
		console.log(`\n[dry-run] 0 ligne insérée. Première ligne mappée :`);
		console.log(JSON.stringify(config.toRow(result.ok[0] as Record<string, unknown>), null, 2));
		return;
	}

	// Insert batch
	const client = createClient(SUPABASE_URL, SERVICE_KEY, {
		auth: { persistSession: false }
	});
	const rowsToInsert = result.ok.map((v) => config.toRow(v as Record<string, unknown>));

	console.log(`\n[import] insertion de ${rowsToInsert.length} ligne(s) dans ${config.table}...`);

	// Insert par chunks de 100 pour éviter payload oversized.
	const CHUNK = 100;
	let inserted = 0;
	for (let i = 0; i < rowsToInsert.length; i += CHUNK) {
		const batch = rowsToInsert.slice(i, i + CHUNK);
		const { error } = await client.from(config.table).insert(batch);
		if (error) {
			console.error(`[import] ÉCHEC batch ${i / CHUNK + 1} : ${error.message}`);
			console.error(`[import] ${inserted} ligne(s) insérée(s) avant l'échec.`);
			process.exit(1);
		}
		inserted += batch.length;
		console.log(`  batch ${i / CHUNK + 1} : ${inserted}/${rowsToInsert.length}`);
	}

	console.log(`\n✓ Import terminé : ${inserted} ligne(s) insérée(s) dans ${config.table}.`);
}

main().catch((e) => {
	console.error('[import] erreur inattendue :', e);
	process.exit(1);
});

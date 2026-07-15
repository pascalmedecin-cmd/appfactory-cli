/**
 * Référentiel partagé - ENTREPRISES.
 *
 * Source unique des écritures `entreprises` du CRM (insert / update) + de la dédup
 * « get-or-create par raison sociale ». Avant ce module (chantier portail 2026-06-01,
 * revue specs § G), la dédup vivait en fonction privée de `crm/contacts/+page.server.ts`
 * et le mapping de champs était dupliqué entre les pages entreprises et contacts.
 *
 * Ce module NE RÉINVENTE PAS la dédup : il déplace et expose celle déjà durcie par les
 * audits 360 (C-05 race INSERT, V2b H-06 RPC lookup, bug-hunter N1 escape LIKE) en
 * s'appuyant sur l'index UNIQUE partiel DB `entreprises_raison_sociale_normalized_unique`
 * (migration 20260510_001) + la RPC `entreprises_lookup_by_name` (migration 20260510_010).
 *
 * RÈGLE DE DÉDUP (explicite) : la clé d'unicité est la **raison sociale normalisée**
 * (`normalizeCompanyName` : NFD sans accents, casse pliée, suffixes légaux SA/SàRL/GmbH
 * retirés) - c'est elle, et elle seule, que porte l'index UNIQUE DB. Le **canton** n'entre
 * PAS encore dans la clé : deux entreprises homonymes dans deux cantons seraient
 * fusionnées. C'est un axe de désambiguïsation futur (le jour où un homonyme cross-canton
 * apparaît), pas un changement de ce chantier (il imposerait de refaire l'index UNIQUE).
 *
 * ÉTAT (chantier 2, 2026-06-05) : tous les call sites « formulaire » entreprises passent par
 * ce module, et la lecture de dédup `/api/prospection/google-places` réutilise désormais
 * `lookupEntrepriseByName` (escaping durci unifié). Restent volontairement hors module deux
 * écritures spécialisées, qui ne sont PAS des get-or-create : l'enrichissement Zefix
 * (`crm/entreprises` action `enrichir`, update partiel conditionnel préservant `notes_libres`)
 * et le cron `nettoyage-crm` (maintenance). Les y forcer n'apporterait aucune mutualisation.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import type { Database, TablesInsert, TablesUpdate } from '$lib/database.types';
import type { Marque } from '$lib/marque';
import { EntrepriseCreateSchema } from '$lib/schemas';
import { newId, now } from '$lib/server/db-helpers';
import { normalizeCompanyName } from '$lib/utils/contactsFormat';

/** Champs upsertables d'une entreprise depuis un formulaire CRM (= sortie Zod validée). */
export type EntrepriseUpsertInput = z.infer<typeof EntrepriseCreateSchema>;

/**
 * Échappe les wildcards LIKE (`%`, `_`, `\`) avant la RPC de lookup (audit 360 bug-hunter N1).
 * Defense-in-depth : le filtre JS final rattrape les faux positifs, mais on bloque à la source.
 */
export function escapeLikePattern(s: string): string {
	return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Cherche une entreprise par préfixe normalisé via la RPC `entreprises_lookup_by_name`
 * (prefix match sur `lower(immutable_unaccent(raison_sociale))`, aligné sur l'index UNIQUE),
 * puis filtre côté JS sur `normalizeCompanyName` (retrait des suffixes légaux). `null` si rien.
 */
export async function lookupEntrepriseByName(
	supabase: SupabaseClient<Database>,
	trimmed: string,
	normalized: string,
	marque: Marque
): Promise<string | null> {
	// RPC `entreprises_lookup_by_name` (migration 010, re-signée Run 2 avec p_marque) : la dédup
	// est PAR MARQUE (une « Foncia » LED ne fusionne jamais dans la fiche FilmPro homonyme).
	const { data: candidates } = await supabase.rpc('entreprises_lookup_by_name', {
		p_query: escapeLikePattern(trimmed),
		p_marque: marque
	});

	const rows = candidates ?? [];
	const match = rows.find((e) => normalizeCompanyName(e.raison_sociale) === normalized);
	return match?.id ?? null;
}

/**
 * Récupère ou crée une entreprise par raison sociale (anti-race C-05). Retourne son id, ou
 * `null` si le nom est vide / si l'insert échoue pour une autre raison qu'un doublon.
 *
 * Séquence : lookup optimiste → INSERT → si `23505` (unique_violation, race avec une autre
 * transaction terrain/desktop) re-lookup pour récupérer l'id créé entre-temps.
 */
export async function getOrCreateEntreprise(
	supabase: SupabaseClient<Database>,
	rawName: string,
	marque: Marque
): Promise<string | null> {
	const trimmed = rawName.trim();
	if (!trimmed) return null;

	const normalized = normalizeCompanyName(trimmed);

	// 1. Lookup optimiste (cas commun : entreprise déjà connue) — scopé à la marque active.
	const matchedId = await lookupEntrepriseByName(supabase, trimmed, normalized, marque);
	if (matchedId) return matchedId;

	// 2. Tentative INSERT.
	const entId = newId();
	const ts = now();
	const { error: insertErr } = await supabase.from('entreprises').insert({
		id: entId,
		raison_sociale: trimmed,
		statut_qualification: 'nouveau',
		source: 'auto-contact',
		date_import_ajout: ts,
		date_derniere_modification: ts,
		marque
	});
	if (!insertErr) return entId;

	// 3. 23505 = unique_violation : une autre transaction a créé l'entreprise entre le
	//    lookup et l'INSERT. Re-lookup pour récupérer son id (même marque).
	if (insertErr.code === '23505') {
		const matchedId2 = await lookupEntrepriseByName(supabase, trimmed, normalized, marque);
		if (matchedId2) return matchedId2;
	}

	console.error('Erreur création entreprise auto:', insertErr.message);
	return null;
}

/** Construit la row d'INSERT entreprise (id + timestamps + statut initial gérés ici). */
export function buildEntrepriseInsert(input: EntrepriseUpsertInput, marque: Marque): TablesInsert<'entreprises'> {
	const ts = now();
	return {
		id: newId(),
		raison_sociale: input.raison_sociale,
		secteur_activite: input.secteur_activite || null,
		canton: input.canton || null,
		taille_estimee: input.taille_estimee || null,
		site_web: input.site_web || null,
		numero_ide: input.numero_ide || null,
		adresse_siege: input.adresse_siege || null,
		segment_cible: input.segment_cible || null,
		source: input.source || null,
		notes_libres: input.notes_libres || null,
		tags: input.tags || null,
		statut_qualification: 'nouveau',
		date_import_ajout: ts,
		date_derniere_modification: ts,
		marque
	};
}

/** Construit la row d'UPDATE entreprise (date_derniere_modification rafraîchie ici). */
export function buildEntrepriseUpdate(input: EntrepriseUpsertInput): TablesUpdate<'entreprises'> {
	return {
		raison_sociale: input.raison_sociale,
		secteur_activite: input.secteur_activite || null,
		canton: input.canton || null,
		taille_estimee: input.taille_estimee || null,
		site_web: input.site_web || null,
		numero_ide: input.numero_ide || null,
		adresse_siege: input.adresse_siege || null,
		segment_cible: input.segment_cible || null,
		source: input.source || null,
		notes_libres: input.notes_libres || null,
		tags: input.tags || null,
		date_derniere_modification: now()
	};
}

/**
 * Référentiel partagé - CONTACTS.
 *
 * Source unique des écritures `contacts` du CRM (insert / update) + de la résolution
 * d'entreprise par nom (qui délègue à la dédup entreprises, cf. `./entreprises`).
 * Chantier portail 2026-06-01 (revue specs § G) : centralise le mapping de champs jusque-là
 * inline dans `crm/contacts/+page.server.ts`.
 *
 * Centralise aussi la matérialisation d'un contact depuis un brouillon terrain validé
 * (`buildContactInsertFromSuggestion`, appelé par `/api/contact-suggestions/[id]/resolve`,
 * chantier 2 2026-06-05). L'endpoint POST `/api/contact-suggestions` n'écrit, lui, que dans
 * `contact_suggestions` (jamais `contacts`) : aucune écriture référentiel à y centraliser.
 */
import type { z } from 'zod';
import type { TablesInsert, TablesUpdate } from '$lib/database.types';
import { ContactCreateSchema } from '$lib/schemas';
import { newId, now } from '$lib/server/db-helpers';

export { getOrCreateEntreprise } from './entreprises';

/** Champs upsertables d'un contact depuis un formulaire CRM (= sortie Zod validée). */
export type ContactUpsertInput = z.infer<typeof ContactCreateSchema>;

/** Construit la row d'INSERT contact (id + timestamps + flags initiaux gérés ici). */
export function buildContactInsert(input: ContactUpsertInput): TablesInsert<'contacts'> {
	const ts = now();
	return {
		id: newId(),
		nom: input.nom,
		prenom: input.prenom || null,
		email_professionnel: input.email_professionnel || null,
		telephone: input.telephone || null,
		role_fonction: input.role_fonction || null,
		entreprise_id: input.entreprise_id || null,
		canton: input.canton || null,
		segment: input.segment || null,
		source: input.source || null,
		notes_libres: input.notes_libres || null,
		adresse: input.adresse || null,
		tags: input.tags || null,
		statut_qualification: 'nouveau',
		statut_archive: false,
		est_prescripteur: false,
		doublon_detecte: false,
		date_ajout: ts,
		date_derniere_modification: ts
	};
}

/** Construit la row d'UPDATE contact (date_derniere_modification rafraîchie ici). */
export function buildContactUpdate(input: ContactUpsertInput): TablesUpdate<'contacts'> {
	return {
		nom: input.nom,
		prenom: input.prenom || null,
		email_professionnel: input.email_professionnel || null,
		telephone: input.telephone || null,
		role_fonction: input.role_fonction || null,
		entreprise_id: input.entreprise_id || null,
		canton: input.canton || null,
		segment: input.segment || null,
		source: input.source || null,
		notes_libres: input.notes_libres || null,
		adresse: input.adresse || null,
		tags: input.tags || null,
		date_derniere_modification: now()
	};
}

/** Sous-ensemble d'un brouillon `contact_suggestions` requis pour matérialiser un contact. */
export type ContactSuggestionRow = {
	entreprise_id: string;
	prenom: string | null;
	nom: string | null;
	role_fonction: string | null;
	telephone: string | null;
	email: string | null;
};

/**
 * Construit la row d'INSERT contact à partir d'un brouillon terrain validé (resolve, ADR-0003).
 * Diffère de `buildContactInsert` (formulaire CRM) : `source` = `terrain_mobile` et mapping
 * `email` -> `email_professionnel`. L'`id` et le timestamp sont fournis par l'appelant : resolve
 * réutilise l'`id` pour nettoyer le contact orphelin si l'update conditionnel perd la race.
 */
export function buildContactInsertFromSuggestion(
	sug: ContactSuggestionRow,
	contactId: string,
	ts: string
): TablesInsert<'contacts'> {
	return {
		id: contactId,
		prenom: sug.prenom ?? null,
		nom: sug.nom ?? null,
		role_fonction: sug.role_fonction ?? null,
		telephone: sug.telephone ?? null,
		email_professionnel: sug.email ?? null,
		entreprise_id: sug.entreprise_id,
		source: 'terrain_mobile',
		statut_qualification: 'nouveau',
		statut_archive: false,
		est_prescripteur: false,
		date_ajout: ts,
		date_derniere_modification: ts
	};
}

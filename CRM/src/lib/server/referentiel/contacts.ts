/**
 * Référentiel partagé - CONTACTS.
 *
 * Source unique des écritures `contacts` du CRM (insert / update) + de la résolution
 * d'entreprise par nom (qui délègue à la dédup entreprises, cf. `./entreprises`).
 * Chantier portail 2026-06-01 (revue specs § G) : centralise le mapping de champs jusque-là
 * inline dans `crm/contacts/+page.server.ts`.
 *
 * DETTE NOMMÉE : l'endpoint `/api/contact-suggestions` (création de brouillons + resolve)
 * écrit dans `contacts` avec sa propre logique. Sa migration vers ce module est tracée pour
 * le chantier 2, avec la page contacts déjà passée ici comme gabarit.
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

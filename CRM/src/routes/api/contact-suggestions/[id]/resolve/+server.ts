import { json, type RequestEvent } from '@sveltejs/kit';
import { validate, ResolveContactSuggestionSchema } from '$lib/schemas';
import { newId, now } from '$lib/server/db-helpers';
import { buildContactInsertFromSuggestion } from '$lib/server/referentiel/contacts';
import { parseMarque } from '$lib/marque';

/**
 * V3 — résolution desktop d'un brouillon de contact terrain (ADR-0003).
 * Transition UNIQUE et irréversible en_attente -> valide|rejete. Idempotent :
 * un resolve sur une suggestion déjà résolue renvoie 409 (anti double-clic = doublon).
 * `valide` crée une ligne `contacts` (ou fusionne sur un contact existant).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function genericError(error: unknown, fallback: string, status = 500) {
	console.error('[contact-suggestions.resolve]', error);
	return json({ error: fallback }, { status });
}

export const POST = async ({ params, request, locals }: RequestEvent) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) return json({ error: 'Non authentifié' }, { status: 401 });

	const id = params.id;
	if (!id || !UUID_RE.test(id)) return json({ error: 'Identifiant invalide' }, { status: 400 });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'JSON invalide' }, { status: 400 });
	}
	const parsed = validate(ResolveContactSuggestionSchema, body);
	if (!parsed.success) return json({ error: parsed.error }, { status: 400 });
	const { action, merged_contact_id } = parsed.data;

	// Charger la suggestion (404) + garde d'état (409 si déjà résolue : couvre le double-clic).
	const { data: sug, error: loadErr } = await locals.supabase
		.from('contact_suggestions')
		.select('id, statut, entreprise_id, prenom, nom, role_fonction, telephone, email')
		.eq('id', id)
		.maybeSingle();
	if (loadErr) return genericError(loadErr, 'Erreur lecture suggestion');
	if (!sug) return json({ error: 'Suggestion introuvable' }, { status: 404 });
	if (sug.statut !== 'en_attente') return json({ error: 'Suggestion déjà résolue' }, { status: 409 });

	const ts = now();

	// --- Rejet ---
	if (action === 'rejete') {
		const { data: updated, error: upErr } = await locals.supabase
			.from('contact_suggestions')
			.update({ statut: 'rejete', resolved_by: user.id, resolved_at: ts })
			.eq('id', id)
			.eq('statut', 'en_attente')
			.select('id')
			.maybeSingle();
		if (upErr) return genericError(upErr, 'Erreur résolution');
		if (!updated) return json({ error: 'Suggestion déjà résolue' }, { status: 409 });
		return json({ id, statut: 'rejete' as const, merged: false });
	}

	// --- Validation : fusion sur un contact existant OU création ---
	let contactId: string;
	let merged: boolean;
	let createdNew = false;

	if (merged_contact_id) {
		const { data: contact, error: cErr } = await locals.supabase
			.from('contacts')
			.select('id, entreprise_id, statut_archive')
			.eq('id', merged_contact_id)
			.eq('marque', locals.marque)
			.maybeSingle();
		if (cErr) return genericError(cErr, 'Erreur recherche contact');
		// Un contact archivé (soft-delete) est invisible dans le CRM : le traiter
		// comme introuvable empêche de fusionner un brouillon terrain sur une ligne
		// morte (perte silencieuse du contact) sans révéler son existence archivée.
		if (!contact || contact.statut_archive) return json({ error: 'Contact cible introuvable' }, { status: 404 });
		// Intégrité référentiel (audit V3 Low) : la fusion ne peut viser qu'un contact
		// de la MÊME entreprise que la suggestion (sinon merged_contact_id incohérent).
		if (contact.entreprise_id !== sug.entreprise_id) {
			return json({ error: 'Le contact cible appartient à une autre entreprise' }, { status: 409 });
		}
		contactId = merged_contact_id;
		merged = true;
	} else {
		contactId = newId();
		merged = false;
		createdNew = true;
		// Atelier 209 Run 2 : la marque du contact créé HÉRITE de l'entreprise parente (la file
		// de validation est partagée entre marques ; résoudre en vue active un brouillon d'une
		// entreprise de l'AUTRE marque ne doit jamais mis-attribuer le contact). On dérive donc
		// la marque du parent, pas de locals.marque. Entreprise absente -> 404 (jamais d'orphelin).
		const { data: parentEnt } = await locals.supabase
			.from('entreprises')
			.select('marque')
			.eq('id', sug.entreprise_id)
			.maybeSingle();
		if (!parentEnt) return json({ error: 'Entreprise du brouillon introuvable' }, { status: 404 });
		const contactMarque = parseMarque(parentEnt.marque);
		// Référentiel partagé : la matérialisation d'un contact depuis un brouillon terrain
		// passe par le module (id + ts conservés ici pour le nettoyage anti-race ci-dessous).
		const { error: insErr } = await locals.supabase
			.from('contacts')
			.insert(buildContactInsertFromSuggestion(sug, contactId, ts, contactMarque));
		if (insErr) return genericError(insErr, 'Erreur création contact');
	}

	// Update conditionnel atomique : ne matche que si encore en_attente (backstop anti-race).
	const { data: updated, error: upErr } = await locals.supabase
		.from('contact_suggestions')
		.update({ statut: 'valide', resolved_by: user.id, resolved_at: ts, merged_contact_id: contactId })
		.eq('id', id)
		.eq('statut', 'en_attente')
		.select('id')
		.maybeSingle();

	if (upErr || !updated) {
		// Race perdue (ou erreur) après création : nettoyer le contact orphelin.
		if (createdNew) await locals.supabase.from('contacts').delete().eq('id', contactId);
		if (upErr) return genericError(upErr, 'Erreur résolution');
		return json({ error: 'Suggestion déjà résolue' }, { status: 409 });
	}

	return json({ id, statut: 'valide' as const, contact_id: contactId, merged });
};

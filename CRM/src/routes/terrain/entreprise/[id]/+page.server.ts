import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { ETAPES_PIPELINE_CLOSED } from '$lib/schemas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fiche entreprise terrain (lecture seule, DESIGN.md § 4.7). Charge :
 *  - l'entreprise (identité + adresse pour l'itinéraire),
 *  - les contacts (téléphone/email pour les actions natives),
 *  - les opportunités ouvertes (contexte),
 *  - l'historique terrain (visites antéchronologiques).
 * Aucune écriture, aucun champ structurant éditable (AC-008).
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	const id = params.id;
	if (!UUID_RE.test(id)) throw error(404, 'Entreprise introuvable');

	const { data: entreprise, error: entErr } = await locals.supabase
		.from('entreprises')
		.select('id, raison_sociale, secteur_activite, adresse_siege, canton, site_web')
		.eq('id', id)
		.maybeSingle();
	if (entErr) {
		console.error('[terrain/fiche] entreprise', entErr.message);
		throw error(500, 'Erreur de chargement');
	}
	if (!entreprise) throw error(404, 'Entreprise introuvable');

	const [contactsRes, oppsRes, visitsRes] = await Promise.all([
		locals.supabase
			.from('contacts')
			.select('id, prenom, nom, role_fonction, telephone, email_professionnel')
			.eq('entreprise_id', id)
			.eq('statut_archive', false)
			.order('score_priorite', { ascending: false })
			.limit(10),
		locals.supabase
			.from('opportunites')
			.select('id, titre, etape_pipeline')
			.eq('entreprise_id', id)
			.or(`etape_pipeline.is.null,etape_pipeline.not.in.(${ETAPES_PIPELINE_CLOSED.join(',')})`)
			.order('date_creation', { ascending: false })
			.limit(10),
		locals.supabase
			.from('prospect_visits')
			.select('id, visited_at, resultat, note, user_id')
			.eq('entreprise_id', id)
			.order('visited_at', { ascending: false })
			.limit(20),
	]);

	const contacts = contactsRes.data ?? [];
	// Première donnée exploitable pour les actions natives (téléphone/email).
	const telephone = contacts.find((c) => c.telephone && c.telephone.trim())?.telephone ?? null;
	const email = contacts.find((c) => c.email_professionnel && c.email_professionnel.trim())?.email_professionnel ?? null;
	const primaryContact = contacts.find((c) => c.prenom || c.nom) ?? null;

	const adresseComplete = [entreprise.adresse_siege, entreprise.canton]
		.filter((s) => !!s && s.trim() !== '')
		.join(', ') || null;

	return {
		entreprise,
		adresseComplete,
		contact: primaryContact
			? {
					nom: [primaryContact.prenom, primaryContact.nom].filter(Boolean).join(' ').trim() || null,
					role: primaryContact.role_fonction,
				}
			: null,
		nativeData: { telephone, adresse: adresseComplete, email },
		opportunites: oppsRes.data ?? [],
		visits: visitsRes.data ?? [],
	};
};

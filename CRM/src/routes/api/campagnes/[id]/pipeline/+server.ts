import { json, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { isCampagnesEnabled } from '$lib/server/feature-gate';

/**
 * POST /api/campagnes/[id]/pipeline - envoie un lot de prospects de la campagne au pipeline
 * (étape « Diffuser » de la page campagne). Chaque lead passe par la RPC atomique et
 * idempotente `mark_lead_for_contact` (statut a_contacter + opportunité d'entrée, invariant
 * Lot 2 : a_contacter => une opportunité liée existe).
 *
 * Body : { leadIds: uuid[] } (borné). Le lot est re-scopé à la campagne côté serveur : un id
 * qui n'y est pas étiqueté est ignoré (compté `ignores`) - le payload client n'est jamais cru.
 * Bilan honnête par catégorie : `entres` (nouveaux au pipeline), `deja` (idempotence - déjà
 * a_contacter), `ignores` (écartés/convertis P0001 ou hors campagne), `erreurs`.
 */
const idSchema = z.string().uuid();
const MAX_PIPELINE_LEAD_IDS = 500;
const BodySchema = z.object({
	leadIds: z.array(z.string().uuid()).min(1).max(MAX_PIPELINE_LEAD_IDS),
});

export const POST = async ({ params, request, locals }: RequestEvent) => {
	const { session, user } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });
	if (!isCampagnesEnabled(user)) return json({ error: 'Fonctionnalité non activée' }, { status: 403 });

	const id = idSchema.safeParse(params.id);
	if (!id.success) return json({ error: 'Identifiant invalide' }, { status: 400 });

	const raw = await request.json().catch(() => null);
	const parsed = BodySchema.safeParse(raw);
	if (!parsed.success) return json({ error: 'Données invalides' }, { status: 400 });

	// Re-scope au périmètre de LA campagne : seuls les leads réellement étiquetés sont traités.
	const { data: liens, error: liensErr } = await locals.supabase
		.from('prospect_lead_campagnes')
		.select('lead_id')
		.eq('campagne_id', id.data)
		.in('lead_id', [...new Set(parsed.data.leadIds)]);
	if (liensErr) {
		console.error('[pipeline campagne] lecture liens en erreur:', liensErr.message);
		return json({ error: 'Chargement impossible' }, { status: 500 });
	}
	const inCampagne = (liens ?? []).map((r) => r.lead_id);
	let ignores = new Set(parsed.data.leadIds).size - inCampagne.length;

	let entres = 0;
	let deja = 0;
	let erreurs = 0;
	// Séquentiel volontaire : chaque RPC verrouille sa ligne (FOR UPDATE) ; le lot est borné
	// (≤ 500) et l'usage réel est de l'ordre de dizaines - pas de parallélisme nécessaire.
	for (const leadId of inCampagne) {
		const { data, error } = await locals.supabase.rpc(
			// Cast `as never` : RPC de migration 20260701000002, absente des types générés
			// (même pattern que le widget triage).
			'mark_lead_for_contact' as never,
			{ p_lead_id: leadId } as never
		);
		if (error) {
			// P0001 = lead non triable (écarté / déjà converti) : décision existante, pas une erreur.
			if (error.code === 'P0001') ignores++;
			else {
				console.error('[pipeline campagne] rpc en erreur:', { leadId, code: error.code });
				erreurs++;
			}
			continue;
		}
		if ((data as { created?: boolean } | null)?.created) entres++;
		else deja++;
	}

	return json({ entres, deja, ignores, erreurs });
};

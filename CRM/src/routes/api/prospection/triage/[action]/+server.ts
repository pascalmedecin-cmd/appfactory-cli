/**
 * Phase 1 widget triage matin : 3 actions sur un lead à trier (queue dashboard).
 * - POST /api/prospection/triage/oui       → « à contacter » : RPC mark_lead_for_contact
 *   (statut=a_contacter + crée l'opportunité d'entrée au pipeline, atomique).
 * - POST /api/prospection/triage/non       → statut=ecarte
 * - POST /api/prospection/triage/plus-tard → triage_snoozed_until = now + N jours (config.triage.snoozeDays)
 *
 * Body : {leadId: string (uuid)}
 * Auth : session utilisateur. Whitelist 3 fondateurs côté hooks (queue partagée par design).
 * Rate limit : 10/min par IP via hooks.server.ts (préfixe /api/prospection/*).
 *
 * Concurrency : queue partagée 3 fondateurs → guard optimistic sur statut='vide'
 * pour éviter qu'un fondateur écrase silencieusement la décision d'un autre.
 * Pour 'oui', l'atomicité + le guard de concurrence sont portés par la RPC (FOR UPDATE).
 */
import { json, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { config } from '$lib/config';
import { TRIAGE_ACTIONS, type TriageAction } from '$lib/api/triage-actions';
import type { TablesUpdate } from '$lib/database.types';

const TriageBodySchema = z.object({
	leadId: z.string().uuid(),
});

export const POST = async ({ request, params, locals }: RequestEvent) => {
	const { session } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });

	const action = params.action as TriageAction | undefined;
	if (!action || !TRIAGE_ACTIONS.includes(action)) {
		return json({ error: 'Action invalide' }, { status: 400 });
	}

	let parsed: unknown;
	try {
		parsed = await request.json();
	} catch {
		return json({ error: 'Body JSON invalide' }, { status: 400 });
	}

	const v = TriageBodySchema.safeParse(parsed);
	if (!v.success) return json({ error: 'leadId invalide' }, { status: 400 });

	const leadId = v.data.leadId;
	const ts = new Date().toISOString();

	// Lecture initiale : RLS authenticated_full_access (queue partagée 3 fondateurs).
	// Le commentaire ci-dessous est factuel : on lit pour valider l'existence + verrouiller
	// la transition optimiste (cf. UPDATE ci-dessous qui filtre sur statut='vide' ;
	// pour 'oui', l'atomicité passe par la RPC mark_lead_for_contact).
	const { data: lead, error: readErr } = await locals.supabase
		.from('prospect_leads')
		.select('id, statut, triage_snoozed_until')
		.eq('id', leadId)
		.maybeSingle();

	if (readErr) {
		console.error('[triage] read error', { leadId, code: readErr.code });
		return json({ error: 'Erreur lecture lead' }, { status: 500 });
	}
	if (!lead) return json({ error: 'Lead introuvable' }, { status: 404 });

	// Concurrency guard 1 : un fondateur ne peut pas réécraser la décision d'un autre.
	// Si un autre fondateur a déjà passé le lead à a_contacter / ecarte / transfere depuis
	// le SELECT initial du widget, on retourne 409 Conflict + le statut courant pour que
	// l'UI rafraîchisse la queue.
	if (lead.statut !== 'vide') {
		return json(
			{ error: 'Lead déjà traité par un autre fondateur', currentStatus: lead.statut },
			{ status: 409 }
		);
	}

	// 'oui' = « à contacter » : la RPC passe le lead à a_contacter ET crée l'opportunité
	// d'entrée au pipeline, atomiquement. Le guard de concurrence (FOR UPDATE + check statut)
	// est porté par la RPC : si un autre fondateur a traité le lead entre-temps → P0001 → 409.
	if (action === 'oui') {
		// Cast `as never` : RPC créée par migration 20260701000002, pas encore dans les
		// types Database générés (même pattern que transfer_lead_to_crm).
		const { data, error: rpcErr } = await locals.supabase.rpc(
			'mark_lead_for_contact' as never,
			{ p_lead_id: leadId } as never
		);
		if (rpcErr) {
			if (rpcErr.code === 'P0001') {
				return json({ error: 'Lead déjà traité par un autre fondateur' }, { status: 409 });
			}
			console.error('[triage] rpc mark_lead_for_contact', { leadId, code: rpcErr.code });
			return json({ error: 'Erreur mise à jour' }, { status: 500 });
		}
		const opportuniteId = (data as { opportunite_id?: string } | null)?.opportunite_id ?? null;
		return json({ ok: true, action, leadId, opportuniteId });
	}

	let update: TablesUpdate<'prospect_leads'>;
	switch (action) {
		case 'non':
			update = { statut: 'ecarte', date_modification: ts };
			break;
		case 'plus-tard': {
			// Anti-cumul : si le lead est déjà snoozé dans le futur, on n'écrase pas.
			// Évite qu'un fondateur snooze 5x → repousse 35 j accidentellement.
			if (lead.triage_snoozed_until && new Date(lead.triage_snoozed_until).getTime() > Date.now()) {
				return json({
					ok: true,
					action,
					leadId,
					alreadySnoozed: true,
					until: lead.triage_snoozed_until,
				});
			}
			const snoozeUntil = new Date(Date.now() + config.scoring.triage.snoozeDays * 86_400_000).toISOString();
			update = { triage_snoozed_until: snoozeUntil, date_modification: ts };
			break;
		}
	}

	// Concurrency guard 2 : UPDATE atomique conditionnel sur statut='vide'.
	// Si le statut a changé entre notre SELECT et notre UPDATE (race window ~ms),
	// l'UPDATE ne touche aucune ligne. PostgREST ne renvoie pas count par défaut, donc
	// on demande explicitement count='exact' sur le filterBuilder.
	const { error: updErr, count } = await locals.supabase
		.from('prospect_leads')
		.update(update, { count: 'exact' })
		.eq('id', leadId)
		.eq('statut', 'vide');

	if (updErr) {
		console.error('[triage] update error', { leadId, action, code: updErr.code });
		return json({ error: 'Erreur mise à jour' }, { status: 500 });
	}
	if (count === 0) {
		// Course perdue contre un autre fondateur entre SELECT et UPDATE.
		return json({ error: 'Lead déjà traité par un autre fondateur' }, { status: 409 });
	}

	return json({ ok: true, action, leadId });
};

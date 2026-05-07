/**
 * Phase 1 widget triage matin : 3 actions sur un lead à fort potentiel (queue dashboard).
 * - POST /api/prospection/triage/oui      → statut=interesse + redirect fiche
 * - POST /api/prospection/triage/non      → statut=ecarte
 * - POST /api/prospection/triage/plus-tard → triage_snoozed_until = now + N jours (config.triage.snoozeDays)
 *
 * Body : {leadId: string (uuid)}
 * Auth : session utilisateur. Whitelist 3 fondateurs côté hooks (queue partagée par design).
 * Rate limit : 10/min par IP via hooks.server.ts (préfixe /api/prospection/*).
 *
 * Concurrency : queue partagée 3 fondateurs → guard optimistic sur statut='nouveau'
 * pour éviter qu'un fondateur écrase silencieusement la décision d'un autre.
 */
import { json, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { config } from '$lib/config';
import { TRIAGE_ACTIONS, type TriageAction } from '$lib/api/triage-actions';

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
	// la transition optimiste (cf. UPDATE ci-dessous qui filtre sur statut='nouveau').
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
	// Si un autre fondateur a déjà passé le lead à interesse / ecarte / transfere depuis
	// le SELECT initial du widget, on retourne 409 Conflict + le statut courant pour que
	// l'UI rafraîchisse la queue.
	if (lead.statut !== 'nouveau') {
		return json(
			{ error: 'Lead déjà traité par un autre fondateur', currentStatus: lead.statut },
			{ status: 409 }
		);
	}

	let update: Record<string, unknown>;
	switch (action) {
		case 'oui':
			update = { statut: 'interesse', date_modification: ts };
			break;
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

	// Concurrency guard 2 : UPDATE atomique conditionnel sur statut='nouveau'.
	// Si le statut a changé entre notre SELECT et notre UPDATE (race window ~ms),
	// l'UPDATE ne touche aucune ligne. PostgREST ne renvoie pas count par défaut, donc
	// on demande explicitement count='exact' sur le filterBuilder.
	const { error: updErr, count } = await locals.supabase
		.from('prospect_leads')
		.update(update, { count: 'exact' })
		.eq('id', leadId)
		.eq('statut', 'nouveau');

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

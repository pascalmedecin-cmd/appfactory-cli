import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { calculerScore } from '$lib/scoring';

const SEARCH_CH_ENDPOINT = 'https://search.ch/tel/api/';

export const POST = async ({ request, locals }: RequestEvent) => {
	const { session } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });

	const apiKey = env.SEARCH_CH_API_KEY;
	if (!apiKey) {
		return json({ error: 'Clé API search.ch non configurée (SEARCH_CH_API_KEY)' }, { status: 503 });
	}

	const body = await request.json();
	const leadId: string = body.lead_id;

	if (!leadId) {
		return json({ error: 'lead_id requis' }, { status: 400 });
	}

	const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!UUID_RE.test(leadId)) {
		return json({ error: 'lead_id invalide' }, { status: 400 });
	}

	// Get the lead
	const { data: lead, error: leadErr } = await locals.supabase
		.from('prospect_leads')
		.select('*')
		.eq('id', leadId)
		.single();

	if (leadErr || !lead) {
		return json({ error: 'Lead introuvable' }, { status: 404 });
	}

	// Build search query
	const was = lead.raison_sociale;
	const wo = [lead.npa, lead.localite, lead.canton].filter(Boolean).join(' ');

	const params = new URLSearchParams({
		was,
		key: apiKey,
		firma: '1',
		privat: '0',
		maxnum: '5',
		lang: 'fr',
	});
	if (wo) params.set('wo', wo);

	let telephone: string | null = null;

	try {
		const resp = await fetch(`${SEARCH_CH_ENDPOINT}?${params}`);
		if (resp.status === 403 || resp.status === 429) {
			return json({ error: 'Quota search.ch épuisé ou clé API invalide. Le quota mensuel est de 1 000 requêtes. Réessayez le mois prochain.' }, { status: 429 });
		}
		if (!resp.ok) {
			const text = await resp.text();
			console.error(`search.ch API error ${resp.status}: ${text.slice(0, 500)}`);
			return json({ error: `Erreur API search.ch (${resp.status}). Réessayez plus tard.` }, { status: 502 });
		}

		const text = await resp.text();

		// Parse Atom XML response — extract first tel:phone
		const phoneMatch = text.match(/<tel:phone>([^<]+)<\/tel:phone>/);
		if (phoneMatch) {
			telephone = phoneMatch[1].trim();
		}

		// Also try to get extra info
		const streetMatch = text.match(/<tel:street>([^<]+)<\/tel:street>/);
		const streetNoMatch = text.match(/<tel:streetno>([^<]+)<\/tel:streetno>/);
		const zipMatch = text.match(/<tel:zip>([^<]+)<\/tel:zip>/);
		const cityMatch = text.match(/<tel:city>([^<]+)<\/tel:city>/);

		// Build update object
		const updates: Record<string, unknown> = {
			date_modification: new Date().toISOString(),
		};

		if (telephone) {
			updates.telephone = telephone;
		}

		// Fill in missing address fields
		if (!lead.adresse && streetMatch) {
			const street = streetMatch[1] + (streetNoMatch ? ` ${streetNoMatch[1]}` : '');
			updates.adresse = street;
		}
		if (!lead.npa && zipMatch) {
			updates.npa = zipMatch[1];
		}
		if (!lead.localite && cityMatch) {
			updates.localite = cityMatch[1];
		}

		// Recalculate score with new data
		const scoreResult = calculerScore({
			canton: lead.canton,
			description: lead.description,
			raison_sociale: lead.raison_sociale,
			source: lead.source,
			date_publication: lead.date_publication,
			telephone: telephone || lead.telephone,
			montant: lead.montant ? Number(lead.montant) : null,
		});
		updates.score_pertinence = scoreResult.total;

		const { error: upErr } = await locals.supabase
			.from('prospect_leads')
			.update(updates)
			.eq('id', leadId);

		if (upErr) {
			return json({ error: `Erreur mise à jour: ${upErr.message}` }, { status: 500 });
		}

		return json({
			success: true,
			telephone,
			enriched: Object.keys(updates).length - 1, // minus date_modification
			message: telephone
				? `Téléphone trouvé: ${telephone}`
				: 'Aucun téléphone trouvé pour cette entreprise.',
		});
	} catch (err) {
		return json({ error: `Erreur réseau search.ch: ${String(err)}` }, { status: 502 });
	}
};

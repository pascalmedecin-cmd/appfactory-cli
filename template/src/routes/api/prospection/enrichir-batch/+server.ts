import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { calculerScore } from '$lib/scoring';
import {
	parseSearchChResponse,
	parseZefixCompany,
	determineLeadStatus,
	sseEvent,
	validateBatchInput,
	type EnrichFields,
} from './helpers';

const SEARCH_CH_ENDPOINT = 'https://search.ch/tel/api/';
const ZEFIX_BASE = 'https://www.zefix.admin.ch/ZefixPublicREST/api/v1';

// Pause entre chaque appel API (ms) pour respecter les rate limits
const DELAY_SEARCH_CH = 500;
const DELAY_ZEFIX = 300;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSearchCh(
	lead: Record<string, unknown>,
	apiKey: string
): Promise<{ fields: EnrichFields; found: boolean }> {
	const was = lead.raison_sociale as string;
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

	const resp = await fetch(`${SEARCH_CH_ENDPOINT}?${params}`);
	if (resp.status === 403 || resp.status === 429) {
		throw new Error('Quota search.ch épuisé ou clé API invalide. Réessayez le mois prochain ou contactez search.ch pour augmenter votre quota.');
	}
	if (!resp.ok) return { fields: {}, found: false };

	const xml = await resp.text();
	return parseSearchChResponse(xml, lead as Record<string, string | null>);
}

async function fetchZefix(
	lead: Record<string, unknown>,
	authHeader: string
): Promise<{ fields: EnrichFields; found: boolean }> {
	const name = lead.raison_sociale as string;

	const resp = await fetch(`${ZEFIX_BASE}/company/search`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: authHeader,
			Accept: 'application/json',
		},
		body: JSON.stringify({ name, activeOnly: true, maxEntries: 3 }),
	});

	if (!resp.ok) return { fields: {}, found: false };

	const companies = await resp.json();
	if (!Array.isArray(companies) || companies.length === 0) return { fields: {}, found: false };

	return parseZefixCompany(companies[0], lead as Record<string, string | null>);
}

export const POST = async ({ request, locals }: RequestEvent) => {
	const { session } = await locals.safeGetSession();
	if (!session) {
		return new Response(JSON.stringify({ error: 'Non authentifié' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const body = await request.json();
	const validation = validateBatchInput(body.lead_ids, body.sources);

	if (!validation.valid) {
		return new Response(JSON.stringify({ error: validation.error }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const { leadIds, sources } = validation;

	// Verifier les API keys disponibles
	const searchChKey = sources.includes('search_ch') ? env.SEARCH_CH_API_KEY : null;
	const zefixUser = sources.includes('zefix') ? env.ZEFIX_USERNAME : null;
	const zefixPass = sources.includes('zefix') ? env.ZEFIX_PASSWORD : null;
	const zefixAuth = zefixUser && zefixPass
		? 'Basic ' + Buffer.from(`${zefixUser}:${zefixPass}`).toString('base64')
		: null;

	if (sources.includes('search_ch') && !searchChKey) {
		return new Response(JSON.stringify({ error: 'SEARCH_CH_API_KEY non configurée' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	if (sources.includes('zefix') && !zefixAuth) {
		return new Response(JSON.stringify({ error: 'Credentials Zefix non configures' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Charger les leads
	const { data: leads, error: loadErr } = await locals.supabase
		.from('prospect_leads')
		.select('*')
		.in('id', leadIds);

	if (loadErr || !leads) {
		return new Response(JSON.stringify({ error: 'Erreur chargement leads' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// SSE stream
	const encoder = new TextEncoder();
	const abortController = new AbortController();

	request.signal.addEventListener('abort', () => {
		abortController.abort();
	});

	const stream = new ReadableStream({
		async start(controller) {
			const total = leads.length;
			let enriched = 0;
			let alreadyComplete = 0;
			let notFound = 0;
			let errors = 0;

			controller.enqueue(encoder.encode(sseEvent('start', { total, sources })));

			for (let i = 0; i < leads.length; i++) {
				if (abortController.signal.aborted) {
					controller.enqueue(encoder.encode(sseEvent('cancelled', { processed: i, total })));
					break;
				}

				const lead = leads[i];
				const result = {
					lead_id: lead.id,
					raison_sociale: lead.raison_sociale,
					status: 'not_found' as string,
					fields_updated: [] as string[],
					message: '',
				};

				try {
					const allFields: Record<string, unknown> = {};

					if (sources.includes('search_ch') && searchChKey) {
						try {
							const { fields, found } = await fetchSearchCh(lead, searchChKey);
							if (found) Object.assign(allFields, fields);
							if (i < leads.length - 1) await sleep(DELAY_SEARCH_CH);
						} catch (err) {
							const msg = String(err);
							if (msg.includes('Quota search.ch')) {
								// Quota épuisé : arrêter le batch proprement
								controller.enqueue(encoder.encode(sseEvent('quota_exceeded', {
									source: 'search_ch',
									message: 'Quota mensuel search.ch atteint (1 000 requêtes/mois). Les requêtes restantes sont annulées.',
									processed: i,
									total,
								})));
								result.status = 'error';
								result.message = 'Quota search.ch épuisé';
								errors++;
								controller.enqueue(encoder.encode(sseEvent('progress', { current: i + 1, total, result })));
								break;
							}
							throw err;
						}
					}

					if (sources.includes('zefix') && zefixAuth) {
						const { fields, found } = await fetchZefix(lead, zefixAuth);
						if (found) Object.assign(allFields, fields);
						if (i < leads.length - 1) await sleep(DELAY_ZEFIX);
					}

					const fieldNames = Object.keys(allFields);
					const status = determineLeadStatus(
						{ telephone: lead.telephone, adresse: lead.adresse, localite: lead.localite },
						fieldNames.length
					);

					if (status === 'enriched') {
						const merged = { ...lead, ...allFields };
						const scoreResult = calculerScore({
							canton: merged.canton as string | null,
							description: merged.description as string | null,
							raison_sociale: merged.raison_sociale as string,
							source: merged.source as string,
							date_publication: merged.date_publication as string | null,
							telephone: (merged.telephone as string | null) ?? null,
							montant: merged.montant ? Number(merged.montant) : null,
						});

						allFields.score_pertinence = scoreResult.total;
						allFields.date_modification = new Date().toISOString();

						const { error: upErr } = await locals.supabase
							.from('prospect_leads')
							.update(allFields)
							.eq('id', lead.id);

						if (upErr) {
							result.status = 'error';
							result.message = `Erreur mise à jour: ${upErr.message}`;
							errors++;
						} else {
							result.status = 'enriched';
							result.fields_updated = fieldNames;
							result.message = `${fieldNames.length} champ${fieldNames.length > 1 ? 's' : ''} enrichi${fieldNames.length > 1 ? 's' : ''}`;
							enriched++;
						}
					} else if (status === 'already_complete') {
						result.status = 'already_complete';
						result.message = 'Deja complet';
						alreadyComplete++;
					} else {
						result.status = 'not_found';
						result.message = 'Aucune donnee trouvee';
						notFound++;
					}
				} catch (err) {
					result.status = 'error';
					result.message = `Erreur: ${String(err)}`;
					errors++;
				}

				controller.enqueue(
					encoder.encode(sseEvent('progress', { current: i + 1, total, result }))
				);
			}

			controller.enqueue(
				encoder.encode(sseEvent('done', { total, enriched, already_complete: alreadyComplete, not_found: notFound, errors }))
			);

			controller.close();
		},
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		},
	});
};

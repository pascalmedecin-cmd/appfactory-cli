import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { calculerScore } from '$lib/scoring';
import { fetchIntelligenceSignalLookup } from '$lib/server/intelligence/signal-lookup';
import { linkImportSignals } from '$lib/server/intelligence/link-import-signal';
import { randomUUID } from 'crypto';
import {
	validateSearchChImportInput,
	buildSearchChQueryParams,
	parseSearchChImportFeed,
	buildSourceId,
	detectSecteurFromEntry,
	sanitizeApiKeyInLogs,
} from './helpers';

const SEARCH_CH_ENDPOINT = 'https://search.ch/tel/api/';
const SOURCE_KEY = 'searchch';
/** Timeout réseau search.ch : la doc indique réponse < 2s nominal, 10s laisse marge généreuse. */
const SEARCH_CH_TIMEOUT_MS = 10_000;
/** Cap dur taille XML response : protection DoS mémoire (2 Mo couvre 20 entries généreusement). */
const SEARCH_CH_MAX_BYTES = 2 * 1024 * 1024;

export const POST = async ({ request, locals }: RequestEvent) => {
	const { session } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });

	const apiKey = env.SEARCH_CH_API_KEY;
	if (!apiKey) {
		return json(
			{ error: 'Clé API search.ch non configurée (SEARCH_CH_API_KEY).' },
			{ status: 503 },
		);
	}

	const body = await request.json().catch(() => null);
	const validation = validateSearchChImportInput(body);
	if (!validation.valid) {
		return json({ error: validation.error }, { status: 400 });
	}
	const { term, canton, ville, from_intelligence, from_term } = validation.input;

	// Item rank optionnel pour le bonus scoring Veille.
	const fromItemRank =
		typeof (body as { from_item_rank?: unknown })?.from_item_rank === 'number' &&
		(body as { from_item_rank: number }).from_item_rank >= 1 &&
		(body as { from_item_rank: number }).from_item_rank <= 10
			? ((body as { from_item_rank: number }).from_item_rank as number)
			: null;

	// 1) Appel API search.ch tel avec timeout + cap taille.
	// La clé API circule en query string (contrainte search.ch) → toute trace logs/erreur
	// doit passer par sanitizeApiKeyInLogs pour éviter la fuite (cf. helpers).
	const params = buildSearchChQueryParams({ term, canton, ville, apiKey });
	const controller = new AbortController();
	const timeoutHandle = setTimeout(() => controller.abort(), SEARCH_CH_TIMEOUT_MS);
	let xml: string;
	try {
		const resp = await fetch(`${SEARCH_CH_ENDPOINT}?${params}`, { signal: controller.signal });
		if (resp.status === 403 || resp.status === 429) {
			return json(
				{
					error:
						'Quota search.ch épuisé ou clé API invalide. Quota mensuel = 1 000 requêtes. Réessayez le mois prochain.',
				},
				{ status: 429 },
			);
		}
		if (!resp.ok) {
			const text = await resp.text();
			console.error(
				`search.ch import error ${resp.status}: ${sanitizeApiKeyInLogs(text.slice(0, 500))}`,
			);
			return json(
				{ error: `Erreur API search.ch (${resp.status}). Réessayez plus tard.` },
				{ status: 502 },
			);
		}
		// Cap taille : si Content-Length connu et > MAX → reject. Sinon read avec garde au parsing
		// (le cap effectif est 2 Mo, search.ch nominal < 50 Ko pour 20 entries → marge x40).
		const contentLength = resp.headers?.get?.('content-length');
		if (contentLength && Number(contentLength) > SEARCH_CH_MAX_BYTES) {
			console.error(`search.ch oversize body: ${contentLength} bytes`);
			return json({ error: 'Réponse search.ch anormalement volumineuse.' }, { status: 502 });
		}
		xml = await resp.text();
		if (xml.length > SEARCH_CH_MAX_BYTES) {
			console.error(`search.ch oversize after read: ${xml.length} bytes`);
			return json({ error: 'Réponse search.ch anormalement volumineuse.' }, { status: 502 });
		}
	} catch (err) {
		// err.message peut contenir l'URL complète (clé API) si fetch échoue → sanitize obligatoire,
		// puis message générique côté client (pas de String(err) brut).
		const safeMsg = sanitizeApiKeyInLogs(err instanceof Error ? err.message : String(err));
		const isTimeout = err instanceof Error && err.name === 'AbortError';
		console.error(`search.ch network error: ${safeMsg}`);
		return json(
			{ error: isTimeout ? 'Timeout search.ch.' : 'Erreur réseau search.ch.' },
			{ status: 502 },
		);
	} finally {
		clearTimeout(timeoutHandle);
	}

	// 2) Parse Atom feed → entries.
	const entries = parseSearchChImportFeed(xml);
	if (entries.length === 0) {
		return json({
			imported: 0,
			skipped: 0,
			total_results: 0,
			message: `Aucun résultat search.ch pour « ${term} » dans ${ville ?? canton}.`,
		});
	}

	// 3) Construction des source_id synthétiques + dédup intra-source.
	const sourceIds = entries.map((e) => buildSourceId({ name: e.name, npa: e.npa }));

	const existingIds = new Set<string>();
	if (sourceIds.length > 0) {
		const { data: existing } = await locals.supabase
			.from('prospect_leads')
			.select('source_id')
			.eq('source', SOURCE_KEY)
			.in('source_id', sourceIds);
		if (existing) for (const e of existing) if (e.source_id) existingIds.add(e.source_id);
	}

	// 4) Dédup leads écartés/transférés (mêmes règles que Zefix).
	const dismissedIds = new Set<string>();
	const { data: dismissed } = await locals.supabase
		.from('prospect_leads')
		.select('source_id, statut')
		.eq('source', SOURCE_KEY)
		.in('statut', ['ecarte', 'transfere']);
	if (dismissed) for (const d of dismissed) if (d.source_id) dismissedIds.add(d.source_id);

	// 5) Lookup signal Veille source (optionnel) pour bonus scoring.
	const signalLookup = from_intelligence
		? await fetchIntelligenceSignalLookup(locals.supabase, from_intelligence, fromItemRank)
		: null;
	const intelligenceSignal = signalLookup?.forScoring ?? null;

	// 6) Construction batch insert.
	const now = new Date().toISOString();
	const inserts: Array<Record<string, unknown>> = [];
	let skipped = 0;

	entries.forEach((entry, idx) => {
		const sourceId = sourceIds[idx];
		if (existingIds.has(sourceId) || dismissedIds.has(sourceId)) {
			skipped++;
			return;
		}
		const secteur = detectSecteurFromEntry(entry);

		const scoreResult = calculerScore({
			canton,
			description: entry.occupation,
			raison_sociale: entry.name,
			secteur_detecte: secteur,
			source: SOURCE_KEY,
			date_publication: null,
			telephone: entry.telephone,
			montant: null,
			intelligenceSignal,
		});

		inserts.push({
			id: randomUUID(),
			source: SOURCE_KEY,
			source_id: sourceId,
			source_url: 'https://tel.search.ch/',
			raison_sociale: entry.name,
			nom_contact: null,
			adresse: entry.adresse,
			npa: entry.npa,
			localite: entry.localite,
			canton,
			telephone: entry.telephone,
			site_web: null,
			email: null,
			secteur_detecte: secteur,
			description: entry.occupation,
			montant: null,
			date_publication: null,
			score_pertinence: scoreResult.total,
			statut: 'nouveau',
			date_import: now,
			date_modification: now,
			source_intelligence_id: from_intelligence,
			source_intelligence_term: from_term,
		});
	});

	// 7) Insertion. Erreur DB → message générique côté client (évite leak schéma/contraintes).
	let imported = 0;
	if (inserts.length > 0) {
		const { error } = await locals.supabase.from('prospect_leads').insert(inserts);
		if (error) {
			console.error(`searchch insert error: ${error.message}`);
			return json(
				{ error: 'Erreur lors de l\'enregistrement des leads. Réessayez.', imported: 0, skipped },
				{ status: 500 },
			);
		}
		imported = inserts.length;
	}

	// 8) Liaison signal Veille → leads (optionnel).
	if (signalLookup && from_intelligence && fromItemRank && inserts.length > 0) {
		await linkImportSignals(locals.supabase, {
			leadIds: inserts.map((i) => i.id as string),
			reportId: from_intelligence,
			itemRank: fromItemRank,
			fromTerm: from_term,
			maturity: signalLookup.snapshot.maturity,
			complianceTag: signalLookup.snapshot.complianceTag,
			signalGeneratedAt: signalLookup.snapshot.generatedAt,
		});
	}

	return json({
		imported,
		skipped,
		total_results: entries.length,
		message:
			imported > 0
				? `${imported} lead${imported > 1 ? 's' : ''} importé${imported > 1 ? 's' : ''} depuis search.ch, ${skipped} ignoré${skipped > 1 ? 's' : ''}.`
				: `Aucun nouveau lead. ${skipped} doublon${skipped > 1 ? 's' : ''} déjà présent${skipped > 1 ? 's' : ''}.`,
	});
};

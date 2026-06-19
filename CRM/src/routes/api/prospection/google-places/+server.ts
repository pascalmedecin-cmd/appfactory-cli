import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { isProspectionSourceEnabled } from '$lib/prospection-flags';
import { API_LIMITS, googlePlacesQuotaStatus } from '$lib/api-limits';
import { getMonthlyUsage, incrementUsage } from '$lib/server/quota';
import { normalizeCompanyName } from '$lib/utils/contactsFormat';
import { lookupEntrepriseByName } from '$lib/server/referentiel/entreprises';
import { fetchIntelligenceSignalLookup } from '$lib/server/intelligence/signal-lookup';
import { linkImportSignals } from '$lib/server/intelligence/link-import-signal';
import {
	validateGooglePlacesImportInput,
	buildTextQuery,
	includedTypeFor,
	cantonRectangle,
	parsePlacesResponse,
	buildSourceId,
	placeMapsUrl,
	detectSecteurFromPlace,
} from './helpers';
import {
	type CandidateCore,
	type PublicCandidate,
	fetchDedupSets,
	statusFor,
	isImportable,
	scoreCandidate,
	candidateToInsertRow,
	toPublicCandidate,
} from '$lib/server/prospection/candidate';

const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const SOURCE_KEY = 'google_places' as const;
const TIMEOUT_MS = 10_000;
const MAX_BYTES = 2 * 1024 * 1024;
// Field mask figé côté serveur (jamais reçu du client) : levier de coût (SKU Enterprise
// à cause de nationalPhoneNumber + websiteUri — assumé, cf. spec A8).
const FIELD_MASK = [
	'places.id',
	'places.displayName',
	'places.formattedAddress',
	'places.addressComponents',
	'places.types',
	'places.location',
	'places.businessStatus',
	'places.nationalPhoneNumber',
	'places.websiteUri',
	'places.googleMapsUri',
].join(',');

export const POST = async ({ request, locals }: RequestEvent) => {
	const { session } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });

	// V5 (2026-06-07) : import de masse Google Places retiré de la Prospection (source payante,
	// acquisition de masse = projet Marketing). Le gate renvoie « désactivée » AVANT tout appel
	// Google et AVANT la réservation de quota (0 coût, 0 quota). La clé GOOGLE_PLACES_API_KEY
	// reste configurée (les scripts Marketing la lisent). Réversible via
	// `config.prospection.sources.google_places.enabled`.
	if (!isProspectionSourceEnabled(SOURCE_KEY)) {
		return json({ error: 'Source désactivée (recentrage Prospection V5).' }, { status: 403 });
	}

	const apiKey = env.GOOGLE_PLACES_API_KEY;
	if (!apiKey) {
		return json({ error: 'Clé API Google Places non configurée (GOOGLE_PLACES_API_KEY).' }, { status: 503 });
	}

	const body = await request.json().catch(() => null);
	// P3 : mode aperçu (preview:true) = parse + dédup, 0 insert. Le quota Google reste débité
	// à l'aperçu (1 recherche = 1 crédit, même sans import) — conforme spec P3 §0.
	const preview = !!body && typeof body === 'object' && (body as { preview?: unknown }).preview === true;
	const validation = validateGooglePlacesImportInput(body);
	if (!validation.valid) return json({ error: validation.error }, { status: 400 });
	const { activityType, keyword, canton, from_intelligence, from_term } = validation.input;

	const fromItemRank =
		typeof (body as { from_item_rank?: unknown })?.from_item_rank === 'number' &&
		(body as { from_item_rank: number }).from_item_rank >= 1 &&
		(body as { from_item_rank: number }).from_item_rank <= 10
			? (body as { from_item_rank: number }).from_item_rank
			: null;

	// 0) Garde-fou quota mensuel. On RÉSERVE le slot (incrément atomique) AVANT l'appel Google
	//    pour fermer la fenêtre TOCTOU (audit secu 2026-05-12, Medium). Conséquence : un appel
	//    réseau qui échoue laisse le slot consommé — c'est la direction sûre pour un garde-fou
	//    de budget (le compteur reste conservateur), et c'est borné par le rate limit (10/min/IP).
	const before = await getMonthlyUsage(locals.supabase, SOURCE_KEY);
	const quota = googlePlacesQuotaStatus(before);
	if (quota.exhausted) {
		return json(
			{ error: `Quota Google Places épuisé pour ce mois (${quota.used}/${quota.cap}). Réessayez le mois prochain.` },
			{ status: 429 },
		);
	}
	const reserved = await incrementUsage(locals.supabase, SOURCE_KEY, 1);
	if (reserved === null) console.error('google-places: réservation slot quota échouée (non bloquant)');

	// 1) Appel Places API (New) — Text Search. Clé en header, pas en query string.
	const includedType = includedTypeFor(activityType);
	const requestBody: Record<string, unknown> = {
		textQuery: buildTextQuery({ activityType, keyword, canton }),
		languageCode: 'fr',
		regionCode: 'CH',
		pageSize: API_LIMITS.google_places.maxResultsPerQuery,
		locationRestriction: { rectangle: cantonRectangle(canton) },
	};
	if (includedType) requestBody.includedType = includedType;

	const controller = new AbortController();
	const timeoutHandle = setTimeout(() => controller.abort(), TIMEOUT_MS);
	let payload: unknown;
	try {
		const resp = await fetch(PLACES_ENDPOINT, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Goog-Api-Key': apiKey,
				'X-Goog-FieldMask': FIELD_MASK,
			},
			body: JSON.stringify(requestBody),
			signal: controller.signal,
		});
		if (resp.status === 401 || resp.status === 403) {
			return json(
				{ error: 'Clé API Google Places invalide ou non autorisée pour Places API (New). Vérifiez GOOGLE_PLACES_API_KEY et l’activation de l’API.' },
				{ status: 503 },
			);
		}
		if (resp.status === 429) {
			return json(
				{ error: 'Quota Google Places côté Google atteint. Réessayez plus tard.' },
				{ status: 429 },
			);
		}
		const contentLength = resp.headers?.get?.('content-length');
		if (contentLength && Number(contentLength) > MAX_BYTES) {
			console.error(`google-places oversize body: ${contentLength} bytes`);
			return json({ error: 'Réponse Google Places anormalement volumineuse.' }, { status: 502 });
		}
		const text = await resp.text();
		if (text.length > MAX_BYTES) {
			console.error(`google-places oversize after read: ${text.length} bytes`);
			return json({ error: 'Réponse Google Places anormalement volumineuse.' }, { status: 502 });
		}
		if (!resp.ok) {
			console.error(`google-places API error ${resp.status}: ${text.slice(0, 300)}`);
			return json({ error: `Erreur API Google Places (${resp.status}). Réessayez plus tard.` }, { status: 502 });
		}
		try {
			payload = JSON.parse(text);
		} catch {
			console.error('google-places: réponse non-JSON');
			return json({ error: 'Réponse Google Places illisible.' }, { status: 502 });
		}
	} catch (err) {
		const isTimeout = err instanceof Error && err.name === 'AbortError';
		console.error(`google-places network error: ${err instanceof Error ? err.message : String(err)}`);
		return json(
			{ error: isTimeout ? 'Timeout Google Places.' : 'Erreur réseau Google Places.' },
			{ status: 502 },
		);
	} finally {
		clearTimeout(timeoutHandle);
	}

	const quotaRemaining = Math.max(0, quota.cap - (reserved ?? quota.used + 1));

	// 2) Parse + dédup.
	const entries = parsePlacesResponse(payload);
	if (entries.length === 0) {
		if (preview) return json({ candidates: [], total_results: 0, quota_remaining: quotaRemaining, message: 'Aucun résultat Google Places pour cette recherche.' });
		return json({ imported: 0, skipped: 0, total_results: 0, quota_remaining: quotaRemaining, message: 'Aucun résultat Google Places pour cette recherche.' });
	}
	const sourceIds = entries.map((e) => buildSourceId(e.placeId));
	const dedup = await fetchDedupSets(locals.supabase, SOURCE_KEY, sourceIds);

	// 3) Dédup cross-source : raison sociale déjà connue dans la table entreprises (Zefix & co).
	//    On ne supprime pas le lead, on le marque pour éviter une re-prospection inutile.
	const knownCompanyNames = new Set<string>();
	for (const e of entries) {
		const normalized = normalizeCompanyName(e.name);
		if (normalized.length < 3 || knownCompanyNames.has(normalized)) continue;
		const matchedId = await lookupEntrepriseByName(locals.supabase, e.name.trim(), normalized);
		if (matchedId) knownCompanyNames.add(normalized);
	}

	// 4) Signal Veille source (optionnel).
	const signalLookup = from_intelligence
		? await fetchIntelligenceSignalLookup(locals.supabase, from_intelligence, fromItemRank)
		: null;
	const intelligenceSignal = signalLookup?.forScoring ?? null;

	// 5) Construction des candidats. Le statut « known_zefix » prime visuellement (la description
	//    porte la mention) mais reste importable (le lead Google a des coordonnées que la fiche
	//    Zefix n'a pas). canton null = lead conservé avec mention « canton non déterminé ».
	let alreadyKnown = 0;
	let cantonMissing = 0;
	const candidates: PublicCandidate[] = entries.map((entry, idx) => {
		const sourceId = sourceIds[idx];
		const secteur = detectSecteurFromPlace(entry);
		const knownEntreprise = knownCompanyNames.has(normalizeCompanyName(entry.name));
		if (knownEntreprise) alreadyKnown++;
		if (!entry.canton) cantonMissing++;

		const descriptionParts = [
			entry.formattedAddress,
			entry.types.length > 0 ? entry.types.join(' / ') : null,
		].filter((s): s is string => !!s && s.length > 0);
		if (knownEntreprise) descriptionParts.push('déjà connue (Zefix)');
		if (!entry.canton) descriptionParts.push('canton non déterminé');
		const description = descriptionParts.length > 0 ? descriptionParts.join(' — ') : null;

		const core: CandidateCore = {
			source: SOURCE_KEY,
			source_id: sourceId,
			source_url: entry.googleMapsUri ?? placeMapsUrl(entry.placeId),
			raison_sociale: entry.name,
			adresse: entry.adresse,
			npa: entry.npa,
			localite: entry.localite,
			canton: entry.canton, // null si Google n'a pas fourni un canton cible — lead conservé quand même
			telephone: entry.telephone,
			site_web: entry.website,
			email: null,
			secteur_detecte: secteur,
			description,
			date_publication: null,
		};
		// Score serveur sur le canton RÉEL (null si Google n'a pas su classer le lieu dans un
		// canton cible → pas de bonus canton, plus honnête qu'un repli sur le canton choisi qui
		// pourrait être faux). Garantit aperçu == import (même canton stocké, même score).
		const score = scoreCandidate(core, { intelligenceSignal });
		const baseStatus = statusFor(sourceId, dedup);
		// known_zefix uniquement si le candidat est par ailleurs « new » (sinon exists/dismissed prime).
		const status = baseStatus === 'new' && knownEntreprise ? 'known_zefix' : baseStatus;
		return toPublicCandidate(core, score, status);
	});

	// Mode aperçu : 0 insert. Le quota a déjà été débité (conforme).
	if (preview) {
		return json({
			candidates,
			total_results: entries.length,
			already_known: alreadyKnown,
			canton_missing: cantonMissing,
			quota_remaining: quotaRemaining,
		});
	}

	// 6) Mode direct (rétro-compat) : insert des importables via le builder partagé.
	const now = new Date().toISOString();
	const importables = candidates.filter((c) => isImportable(c.status_hint));
	const inserts = importables.map((c) => candidateToInsertRow(c, c.score_pertinence, { now, fromIntelligence: from_intelligence, fromTerm: from_term }));
	const skipped = entries.length - importables.length;

	let imported = 0;
	if (inserts.length > 0) {
		const { error } = await locals.supabase.from('prospect_leads').insert(inserts as never);
		if (error) {
			console.error(`google-places insert error: ${error.message}`);
			return json({ error: 'Erreur lors de l’enregistrement des leads. Réessayez.', imported: 0, skipped }, { status: 500 });
		}
		imported = inserts.length;
	}

	// 7) Liaison signal Veille → leads (optionnel).
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

	const bits: string[] = [];
	if (imported > 0) bits.push(`${imported} lead${imported > 1 ? 's' : ''} importé${imported > 1 ? 's' : ''} depuis Google Places`);
	else bits.push('Aucun nouveau lead');
	if (skipped > 0) bits.push(`${skipped} doublon${skipped > 1 ? 's' : ''} ignoré${skipped > 1 ? 's' : ''}`);
	if (alreadyKnown > 0) bits.push(`${alreadyKnown} déjà connue${alreadyKnown > 1 ? 's' : ''} via Zefix`);
	if (cantonMissing > 0) bits.push(`${cantonMissing} sans canton déterminé`);

	return json({
		imported,
		skipped,
		already_known: alreadyKnown,
		canton_missing: cantonMissing,
		total_results: entries.length,
		quota_remaining: quotaRemaining,
		message: bits.join(', ') + '.',
	});
};

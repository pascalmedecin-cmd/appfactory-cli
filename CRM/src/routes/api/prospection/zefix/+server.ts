import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { parseJsonResilient } from '$lib/server/decode-response';
import { fetchIntelligenceSignalLookup } from '$lib/server/intelligence/signal-lookup';
import { linkImportSignals } from '$lib/server/intelligence/link-import-signal';
import { sanitizeError, sanitizeForLog } from '$lib/server/intelligence/sanitize';
import { isProspectionSourceEnabled } from '$lib/prospection-flags';
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

const ZEFIX_BASE = 'https://www.zefix.admin.ch/ZefixPublicREST/api/v1';
const SOURCE_KEY = 'zefix' as const;

// Zefix company search response (partial : fields we use)
interface ZefixCompany {
	name: string;
	uid: string; // CHE-xxx.xxx.xxx
	chid: string;
	ehraid: number;
	legalSeat: string;
	legalForm: { name: { fr?: string; de?: string } };
	status: string;
	sogcDate?: string; // Last FOSC publication date
}

const CANTON_MAP: Record<string, string> = {
	GE: 'GE', VD: 'VD', VS: 'VS', NE: 'NE', FR: 'FR', JU: 'JU',
};

function cantonToLead(abbr: string): string | null {
	return CANTON_MAP[abbr] ?? null;
}

// Detect sector from purpose text
const SECTEURS_KEYWORDS: Record<string, string[]> = {
	construction: ['construction', 'batiment', 'bau', 'genie civil'],
	architecture: ['architecte', 'architecture', 'architektur'],
	hvac: ['chauffage', 'ventilation', 'climatisation', 'hvac', 'heizung'],
	electricite: ['electricite', 'elektro', 'electricien'],
	renovation: ['renovation', 'transformation', 'umbau'],
	menuiserie: ['menuiserie', 'charpente', 'schreinerei', 'zimmerei'],
	ingenieur: ['ingenieur', 'bureau technique', 'ingenieurbüro'],
	regie: ['regie', 'facility', 'immobilier', 'verwaltung'],
};

function detectSecteur(desc: string): string | null {
	const lower = desc.toLowerCase();
	for (const [secteur, kws] of Object.entries(SECTEURS_KEYWORDS)) {
		if (kws.some((kw) => lower.includes(kw))) return secteur;
	}
	return null;
}

export const POST = async ({ request, locals }: RequestEvent) => {
	const { session } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });

	// Gate flag (defense-in-depth : la coupe d'une source n'est pas seulement UI).
	if (!isProspectionSourceEnabled(SOURCE_KEY)) {
		return json({ error: 'Source désactivée.' }, { status: 403 });
	}

	const username = env.ZEFIX_USERNAME;
	const password = env.ZEFIX_PASSWORD;
	if (!username || !password) {
		return json({ error: 'Credentials Zefix non configures (ZEFIX_USERNAME, ZEFIX_PASSWORD)' }, { status: 503 });
	}

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') return json({ error: 'Payload invalide.' }, { status: 400 });
	const b = body as Record<string, unknown>;
	// P3 : mode aperçu (preview:true) = parse + dédup, 0 insert. Sinon import direct (rétro-compat).
	const preview = b.preview === true;
	const canton: string = typeof b.canton === 'string' ? b.canton : '';
	const name: string = typeof b.name === 'string' ? b.name : '';
	const activeOnly: boolean = b.activeOnly !== false;
	const limit: number = Math.min(typeof b.limit === 'number' ? b.limit : 100, 250);

	// Tracabilite Veille -> Prospection (optionnelle).
	const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	const fromIntelligence = typeof b.from_intelligence === 'string' && UUID_RE.test(b.from_intelligence) ? b.from_intelligence : null;
	const fromTerm = typeof b.from_term === 'string' ? b.from_term.slice(0, 200) || null : null;
	// Bloc 3 : from_item_rank permet le lookup de l'item Veille source pour bonus scoring.
	const fromItemRank = typeof b.from_item_rank === 'number' && b.from_item_rank >= 1 && b.from_item_rank <= 10
		? b.from_item_rank
		: null;

	if (!canton || !CANTON_MAP[canton]) {
		return json({ error: 'Canton requis (GE, VD, VS, NE, FR, JU)' }, { status: 400 });
	}

	// Zefix search : POST /api/v1/company/search
	const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

	let companies: ZefixCompany[];
	try {
		const searchBody: Record<string, unknown> = {
			canton: canton,
			activeOnly,
			maxEntries: limit,
		};
		if (name) searchBody.name = name;

		const resp = await fetch(`${ZEFIX_BASE}/company/search`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': authHeader,
				'Accept': 'application/json',
			},
			body: JSON.stringify(searchBody),
		});

		if (resp.status === 401) {
			return json({ error: 'Zefix: credentials invalides (401)' }, { status: 502 });
		}
		if (!resp.ok) {
			const text = await resp.text();
			console.error(`Zefix API error ${resp.status}: ${sanitizeForLog(text.slice(0, 500))}`);
			return json({ error: `Erreur API Zefix (${resp.status}). Réessayez plus tard.` }, { status: 502 });
		}

		// Zefix peut renvoyer du Windows-1252/Latin-1 -> décodage tolérant (sinon accents
		// détruits en U+FFFD, cause racine du mojibake Zefix LIVE-M3). Voir lib/server/decode-response.
		companies = await parseJsonResilient<ZefixCompany[]>(resp);
	} catch (err) {
		// Audit 360 M-01 : sanitize l'exception (cas `TypeError: fetch failed` Node 20+
		// peut stringify l'URL fetch, defense-in-depth).
		return json({ error: `Erreur réseau Zefix: ${sanitizeError(err)}` }, { status: 502 });
	}

	if (!Array.isArray(companies) || companies.length === 0) {
		if (preview) return json({ candidates: [], total_results: 0, message: 'Aucun resultat Zefix pour ces criteres.' });
		return json({ imported: 0, skipped: 0, message: 'Aucun resultat Zefix pour ces criteres.' });
	}

	// Dédup serveur (leads existants même UID + leads écartés/transférés).
	const uids = companies.map((c) => c.uid).filter(Boolean);
	const dedup = await fetchDedupSets(locals.supabase, SOURCE_KEY, uids);

	// The Zefix search endpoint only returns identity fields : canton/address/purpose/capital
	// come from the detail endpoint. Since we filter by canton in the search request, all results
	// belong to `canton`.
	const cantonCode = cantonToLead(canton);

	// Bloc 3 : fetch du signal Veille source (si from_intelligence + from_item_rank fournis).
	const signalLookup = fromIntelligence
		? await fetchIntelligenceSignalLookup(locals.supabase, fromIntelligence, fromItemRank)
		: null;
	const intelligenceSignal = signalLookup?.forScoring ?? null;

	// Construction des candidats (cœur + statut + score serveur). Les entrées sans nom/uid/canton
	// exploitable ne sont pas des candidats (inutilisables) — comptées en « skipped » côté direct.
	const candidates: PublicCandidate[] = [];
	for (const company of companies) {
		if (!company.name || !company.uid || !cantonCode) continue;
		const secteur = detectSecteur(company.name);
		const core: CandidateCore = {
			source: SOURCE_KEY,
			source_id: company.uid,
			source_url: `https://www.zefix.admin.ch/fr/search/entity/list/firm/${company.ehraid}`,
			raison_sociale: company.name,
			adresse: null,
			npa: null,
			localite: company.legalSeat ?? null,
			canton: cantonCode,
			telephone: null,
			site_web: null,
			email: null,
			secteur_detecte: secteur,
			description: null,
			date_publication: company.sogcDate ?? null,
		};
		const score = scoreCandidate(core, { intelligenceSignal });
		const status = statusFor(core.source_id, dedup);
		candidates.push(toPublicCandidate(core, score, status));
	}

	// Mode aperçu : 0 insert, on renvoie les candidats à cocher.
	if (preview) {
		return json({ candidates, total_results: companies.length });
	}

	// Mode direct (rétro-compat) : insert des importables via le builder partagé.
	const now = new Date().toISOString();
	const importables = candidates.filter((c) => isImportable(c.status_hint));
	const inserts = importables.map((c) => candidateToInsertRow(c, c.score_pertinence, { now, fromIntelligence, fromTerm }));

	let imported = 0;
	if (inserts.length > 0) {
		const batchSize = 500;
		for (let i = 0; i < inserts.length; i += batchSize) {
			const batch = inserts.slice(i, i + batchSize);
			const { error } = await locals.supabase.from('prospect_leads').insert(batch as never);
			if (error) {
				return json({ error: `Erreur insertion: ${error.message}`, imported, skipped: companies.length - imported }, { status: 500 });
			}
			imported += batch.length;
		}
	}
	const skipped = companies.length - imported;

	// Phase C : lier les leads importés au signal Veille source.
	if (signalLookup && fromIntelligence && fromItemRank && inserts.length > 0) {
		await linkImportSignals(locals.supabase, {
			leadIds: inserts.map((i) => i.id as string),
			reportId: fromIntelligence,
			itemRank: fromItemRank,
			fromTerm,
			maturity: signalLookup.snapshot.maturity,
			complianceTag: signalLookup.snapshot.complianceTag,
			signalGeneratedAt: signalLookup.snapshot.generatedAt,
		});
	}

	return json({
		imported,
		skipped,
		total_zefix: companies.length,
		message: `${imported} lead${imported > 1 ? 's' : ''} importé${imported > 1 ? 's' : ''} depuis Zefix, ${skipped} ignoré${skipped > 1 ? 's' : ''}.`,
	});
};

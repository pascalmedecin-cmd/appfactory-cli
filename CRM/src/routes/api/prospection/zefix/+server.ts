import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { calculerScore } from '$lib/scoring';
import { fetchIntelligenceSignalLookup } from '$lib/server/intelligence/signal-lookup';
import { linkImportSignals } from '$lib/server/intelligence/link-import-signal';
import { randomUUID } from 'crypto';

const ZEFIX_BASE = 'https://www.zefix.admin.ch/ZefixPublicREST/api/v1';

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

	const username = env.ZEFIX_USERNAME;
	const password = env.ZEFIX_PASSWORD;
	if (!username || !password) {
		return json({ error: 'Credentials Zefix non configures (ZEFIX_USERNAME, ZEFIX_PASSWORD)' }, { status: 503 });
	}

	const body = await request.json();
	const canton: string = body.canton;
	const name: string = body.name ?? '';
	const activeOnly: boolean = body.activeOnly ?? true;
	const limit: number = Math.min(body.limit ?? 100, 250);

	// Tracabilite Veille -> Prospection (optionnelle).
	const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	const fromIntelligence = typeof body.from_intelligence === 'string' && UUID_RE.test(body.from_intelligence) ? body.from_intelligence : null;
	const fromTerm = typeof body.from_term === 'string' ? body.from_term.slice(0, 200) || null : null;
	// Bloc 3 : from_item_rank permet le lookup de l'item Veille source pour bonus scoring.
	const fromItemRank = typeof body.from_item_rank === 'number' && body.from_item_rank >= 1 && body.from_item_rank <= 10
		? body.from_item_rank
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
			console.error(`Zefix API error ${resp.status}: ${text.slice(0, 500)}`);
			return json({ error: `Erreur API Zefix (${resp.status}). Réessayez plus tard.` }, { status: 502 });
		}

		companies = await resp.json();
	} catch (err) {
		return json({ error: `Erreur réseau Zefix: ${String(err)}` }, { status: 502 });
	}

	if (!Array.isArray(companies) || companies.length === 0) {
		return json({ imported: 0, skipped: 0, message: 'Aucun resultat Zefix pour ces criteres.' });
	}

	// Check existing UIDs
	const uids = companies.map((c) => c.uid).filter(Boolean);
	const existingIds = new Set<string>();
	if (uids.length > 0) {
		const { data: existing } = await locals.supabase
			.from('prospect_leads')
			.select('source_id')
			.eq('source', 'zefix')
			.in('source_id', uids);
		if (existing) {
			for (const e of existing) existingIds.add(e.source_id);
		}
	}

	// Check dismissed leads
	const { data: dismissed } = await locals.supabase
		.from('prospect_leads')
		.select('source_id, statut')
		.eq('source', 'zefix')
		.in('statut', ['ecarte', 'transfere']);
	const dismissedIds = new Set<string>();
	if (dismissed) {
		for (const d of dismissed) if (d.source_id) dismissedIds.add(d.source_id);
	}

	const now = new Date().toISOString();
	let imported = 0;
	let skipped = 0;

	const inserts = [];

	// The Zefix search endpoint only returns identity fields : canton/address/purpose/capital
	// come from the detail endpoint (/company/uid/{uid}) via the enrichment feature.
	// Since we filter by canton in the search request, all results belong to `canton`.
	const cantonCode = cantonToLead(canton);

	// Bloc 3 : fetch du signal Veille source (si from_intelligence + from_item_rank fournis).
	// Un seul lookup pour toute la batch = pas d'impact perf.
	const signalLookup = fromIntelligence
		? await fetchIntelligenceSignalLookup(locals.supabase, fromIntelligence, fromItemRank)
		: null;
	const intelligenceSignal = signalLookup?.forScoring ?? null;

	for (const company of companies) {
		if (!company.name || !company.uid) { skipped++; continue; }
		if (existingIds.has(company.uid) || dismissedIds.has(company.uid)) { skipped++; continue; }
		if (!cantonCode) { skipped++; continue; }

		const secteur = detectSecteur(company.name);

		const scoreResult = calculerScore({
			canton: cantonCode,
			description: '',
			raison_sociale: company.name,
			secteur_detecte: secteur,
			source: 'zefix',
			date_publication: company.sogcDate ?? null,
			telephone: null,
			montant: null,
			intelligenceSignal
		});

		inserts.push({
			id: randomUUID(),
			source: 'zefix' as const,
			source_id: company.uid,
			source_url: `https://www.zefix.admin.ch/fr/search/entity/list/firm/${company.ehraid}`,
			raison_sociale: company.name,
			nom_contact: null,
			adresse: null,
			npa: null,
			localite: company.legalSeat ?? null,
			canton: cantonCode,
			telephone: null,
			site_web: null,
			email: null,
			secteur_detecte: secteur,
			description: null,
			montant: null,
			date_publication: company.sogcDate ?? null,
			score_pertinence: scoreResult.total,
			statut: 'nouveau',
			date_import: now,
			date_modification: now,
			source_intelligence_id: fromIntelligence,
			source_intelligence_term: fromTerm,
		});
	}

	// Batch insert
	if (inserts.length > 0) {
		const batchSize = 500;
		for (let i = 0; i < inserts.length; i += batchSize) {
			const batch = inserts.slice(i, i + batchSize);
			const { error } = await locals.supabase.from('prospect_leads').insert(batch);
			if (error) {
				return json({
					error: `Erreur insertion: ${error.message}`,
					imported,
					skipped,
				}, { status: 500 });
			}
			imported += batch.length;
		}
	}

	// Phase C : lier les leads importés au signal Veille source.
	if (signalLookup && fromIntelligence && fromItemRank && inserts.length > 0) {
		await linkImportSignals(locals.supabase, {
			leadIds: inserts.map((i) => i.id),
			reportId: fromIntelligence,
			itemRank: fromItemRank,
			fromTerm,
			maturity: signalLookup.snapshot.maturity,
			complianceTag: signalLookup.snapshot.complianceTag,
			signalGeneratedAt: signalLookup.snapshot.generatedAt
		});
	}

	return json({
		imported,
		skipped,
		total_zefix: companies.length,
		message: `${imported} lead${imported > 1 ? 's' : ''} importé${imported > 1 ? 's' : ''} depuis Zefix, ${skipped} ignoré${skipped > 1 ? 's' : ''}.`,
	});
};

import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { calculerScore } from '$lib/scoring';
import { randomUUID } from 'crypto';

const ZEFIX_BASE = 'https://www.zefix.admin.ch/ZefixPublicREST/api/v1';

// Zefix company search response (partial — fields we use)
interface ZefixCompany {
	name: string;
	uid: string; // CHE-xxx.xxx.xxx
	chid: string;
	ehpiId: number;
	legalSeat: string;
	canton: { cantonAbbreviation: string };
	legalForm: { name: { fr?: string; de?: string } };
	status: string;
	purpose?: { fr?: string; de?: string; it?: string };
	address?: {
		street?: string;
		houseNumber?: string;
		swissZipCode?: string;
		city?: string;
	};
	capitalNominal?: number;
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

	if (!canton || !CANTON_MAP[canton]) {
		return json({ error: 'Canton requis (GE, VD, VS, NE, FR, JU)' }, { status: 400 });
	}

	// Zefix search — POST /api/v1/company/search
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

	for (const company of companies) {
		if (!company.name || !company.uid) { skipped++; continue; }
		if (existingIds.has(company.uid) || dismissedIds.has(company.uid)) { skipped++; continue; }

		const purpose = company.purpose?.fr || company.purpose?.de || company.purpose?.it || '';
		const cantonCode = cantonToLead(company.canton?.cantonAbbreviation ?? '');
		if (!cantonCode) { skipped++; continue; }
		const secteur = detectSecteur(`${purpose} ${company.name}`);
		const addr = company.address;

		const scoreResult = calculerScore({
			canton: cantonCode,
			description: purpose,
			raison_sociale: company.name,
			source: 'zefix',
			date_publication: company.sogcDate ?? null,
			telephone: null,
			montant: company.capitalNominal ?? null,
		});

		inserts.push({
			id: randomUUID(),
			source: 'zefix' as const,
			source_id: company.uid,
			source_url: `https://www.zefix.admin.ch/fr/search/entity/list/firm/${company.ehpiId}`,
			raison_sociale: company.name,
			nom_contact: null,
			adresse: addr ? [addr.street, addr.houseNumber].filter(Boolean).join(' ') || null : null,
			npa: addr?.swissZipCode ?? null,
			localite: addr?.city ?? company.legalSeat ?? null,
			canton: cantonCode,
			telephone: null,
			site_web: null,
			email: null,
			secteur_detecte: secteur,
			description: purpose.slice(0, 5000) || null,
			montant: company.capitalNominal ?? null,
			date_publication: company.sogcDate ?? null,
			score_pertinence: scoreResult.total,
			statut: 'nouveau',
			date_import: now,
			date_modification: now,
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

	return json({
		imported,
		skipped,
		total_zefix: companies.length,
		message: `${imported} lead${imported > 1 ? 's' : ''} importe${imported > 1 ? 's' : ''} depuis Zefix, ${skipped} ignore${skipped > 1 ? 's' : ''}.`,
	});
};

import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { calculerScore } from '$lib/scoring';
import { randomUUID } from 'crypto';

const ZEFIX_BASE = 'https://www.zefix.admin.ch/ZefixPublicREST/api/v1';

// NOGA secteur F = Construction (codes 41-43)
const CONSTRUCTION_KEYWORDS = [
	'construction', 'batiment', 'bâtiment', 'bau', 'génie civil', 'genie civil',
	'architecte', 'architecture', 'architektur',
	'chauffage', 'ventilation', 'climatisation', 'hvac', 'heizung',
	'electricite', 'électricité', 'elektro', 'electricien', 'électricien',
	'renovation', 'rénovation', 'transformation', 'umbau',
	'menuiserie', 'charpente', 'schreinerei', 'zimmerei',
	'ingenieur', 'ingénieur', 'bureau technique', 'ingenieurbüro',
	'regie', 'régie', 'facility', 'immobilier', 'verwaltung',
	'vitrage', 'verre', 'fenetre', 'fenêtre', 'façade', 'facade',
	'plomberie', 'sanitaire', 'peinture', 'isolation', 'toiture',
];

const CANTON_MAP: Record<string, string> = {
	GE: 'GE', VD: 'VD', VS: 'VS', NE: 'NE', FR: 'FR', JU: 'JU',
};

const SECTEURS_KEYWORDS: Record<string, string[]> = {
	construction: ['construction', 'batiment', 'bâtiment', 'bau', 'genie civil', 'génie civil'],
	architecture: ['architecte', 'architecture', 'architektur'],
	hvac: ['chauffage', 'ventilation', 'climatisation', 'hvac', 'heizung'],
	electricite: ['electricite', 'électricité', 'elektro', 'electricien'],
	renovation: ['renovation', 'rénovation', 'transformation', 'umbau'],
	menuiserie: ['menuiserie', 'charpente', 'schreinerei', 'zimmerei'],
	ingenieur: ['ingenieur', 'ingénieur', 'bureau technique', 'ingenieurbüro'],
	regie: ['regie', 'régie', 'facility', 'immobilier', 'verwaltung'],
	vitrage: ['vitrage', 'verre', 'fenetre', 'fenêtre', 'façade', 'facade'],
};

function detectSecteur(desc: string): string | null {
	const lower = desc.toLowerCase();
	for (const [secteur, kws] of Object.entries(SECTEURS_KEYWORDS)) {
		if (kws.some((kw) => lower.includes(kw))) return secteur;
	}
	return null;
}

/** Strip HTML FT tags from SOGC message text */
function stripFtTags(html: string): string {
	return html.replace(/<\/?FT[^>]*>/g, '').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

/** Extract NPA + city from message text (pattern: "1205 Genève") */
function extractNpaCity(message: string): { npa: string | null; city: string | null } {
	const match = message.match(/(\d{4})\s+([A-ZÀ-Ü][a-zà-ü][\w\s-]*?)(?:[.,]|$)/);
	return match ? { npa: match[1], city: match[2].trim() } : { npa: null, city: null };
}

/** Extract street address from message text (before NPA) */
function extractAddress(message: string): string | null {
	const match = message.match(/,\s+((?:rue|avenue|chemin|route|place|boulevard|quai|passage|impasse|ch\.|rte|av\.|bd|pl\.)[^,]+\d{4})/i);
	if (match) {
		return match[1].replace(/\s*\d{4}\s*$/, '').trim() || null;
	}
	return null;
}

interface SogcEntry {
	sogcPublication: {
		sogcDate: string;
		sogcId: number;
		registryOfCommerceId: number;
		registryOfCommerceCanton: string;
		message: string; // HTML with FT tags
		mutationTypes: Array<{ id: number; key: string }>;
	};
	companyShort: {
		name: string;
		ehraid: number;
		uid: string;
		chid?: string;
		legalSeat?: string;
		legalForm?: {
			name?: { fr?: string; de?: string };
		};
		status?: string;
	};
}

export const POST = async ({ request, locals }: RequestEvent) => {
	const { session } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });

	const username = env.ZEFIX_USERNAME;
	const password = env.ZEFIX_PASSWORD;
	if (!username || !password) {
		return json({ error: 'Credentials Zefix non configurés (ZEFIX_USERNAME, ZEFIX_PASSWORD)' }, { status: 503 });
	}

	const body = await request.json();
	const daysBack: number = Math.min(body.daysBack ?? 7, 30);
	const cantons: string[] = body.cantons ?? Object.keys(CANTON_MAP);

	// Validate cantons
	const validCantons = cantons.filter((c) => CANTON_MAP[c]);
	if (validCantons.length === 0) {
		return json({ error: 'Au moins un canton romand requis (GE, VD, VS, NE, FR, JU)' }, { status: 400 });
	}

	const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

	// Fetch SOGC publications for each day in range
	const now = new Date();
	const entries: SogcEntry[] = [];

	for (let d = 0; d < daysBack; d++) {
		const date = new Date(now);
		date.setDate(date.getDate() - d);
		const dateStr = date.toISOString().split('T')[0];

		try {
			const resp = await fetch(`${ZEFIX_BASE}/sogc/bydate/${dateStr}`, {
				headers: {
					'Authorization': authHeader,
					'Accept': 'application/json',
				},
			});

			if (resp.status === 404) continue;
			if (!resp.ok) {
				console.error(`FOSC ${dateStr}: HTTP ${resp.status}`);
				continue;
			}

			const data = await resp.json();
			if (Array.isArray(data)) {
				entries.push(...data);
			}
		} catch (err) {
			console.error(`FOSC ${dateStr}: ${String(err)}`);
		}
	}

	if (entries.length === 0) {
		return json({ imported: 0, skipped: 0, message: 'Aucune publication FOSC trouvée pour cette période.' });
	}

	// Filter: only new registrations in target cantons with construction keywords
	const relevant = entries.filter((entry) => {
		const pub = entry.sogcPublication;
		const company = entry.companyShort;
		if (!pub || !company) return false;

		// Only new registrations (mutationType key = 'status.neu')
		const isNew = pub.mutationTypes?.some((m) => m.key === 'status.neu');
		if (!isNew) return false;

		// Canton filter
		const canton = pub.registryOfCommerceCanton;
		if (!canton || !validCantons.includes(canton)) return false;

		// Construction sector filter on message text + company name
		const plainMessage = stripFtTags(pub.message ?? '');
		const fullText = `${plainMessage} ${company.name}`.toLowerCase();

		return CONSTRUCTION_KEYWORDS.some((kw) => fullText.includes(kw));
	});

	if (relevant.length === 0) {
		return json({
			imported: 0,
			skipped: entries.length,
			message: `${entries.length} publications FOSC analysées, aucune pertinente pour le secteur construction.`,
		});
	}

	// Dedup against existing leads
	const uids = relevant.map((e) => e.companyShort?.uid).filter(Boolean) as string[];
	const existingIds = new Set<string>();
	if (uids.length > 0) {
		const { data: existing } = await locals.supabase
			.from('prospect_leads')
			.select('source_id')
			.in('source', ['zefix', 'fosc'])
			.in('source_id', uids);
		if (existing) {
			for (const e of existing) existingIds.add(e.source_id);
		}
	}

	// Check dismissed
	const { data: dismissed } = await locals.supabase
		.from('prospect_leads')
		.select('source_id, statut')
		.in('source', ['zefix', 'fosc'])
		.in('statut', ['ecarte', 'transfere']);
	const dismissedIds = new Set<string>();
	if (dismissed) {
		for (const d of dismissed) if (d.source_id) dismissedIds.add(d.source_id);
	}

	const nowStr = now.toISOString();
	let imported = 0;
	let skipped = 0;
	const inserts = [];

	for (const entry of relevant) {
		const pub = entry.sogcPublication;
		const company = entry.companyShort;
		if (!company.uid || existingIds.has(company.uid) || dismissedIds.has(company.uid)) {
			skipped++;
			continue;
		}

		const cantonCode = pub.registryOfCommerceCanton;
		if (!CANTON_MAP[cantonCode]) { skipped++; continue; }

		const plainMessage = stripFtTags(pub.message ?? '');
		const secteur = detectSecteur(`${plainMessage} ${company.name}`);
		const { npa, city } = extractNpaCity(plainMessage);
		const adresse = extractAddress(plainMessage);

		const scoreResult = calculerScore({
			canton: cantonCode,
			description: plainMessage,
			raison_sociale: company.name,
			source: 'fosc',
			date_publication: pub.sogcDate ?? null,
			telephone: null,
			montant: null,
		});

		inserts.push({
			id: randomUUID(),
			source: 'fosc' as const,
			source_id: company.uid,
			source_url: `https://www.shab.ch/#!/search/publications/detail/${pub.sogcId}`,
			raison_sociale: company.name,
			nom_contact: null,
			adresse,
			npa,
			localite: city ?? company.legalSeat ?? null,
			canton: cantonCode,
			telephone: null,
			site_web: null,
			email: null,
			secteur_detecte: secteur,
			description: plainMessage.slice(0, 5000) || null,
			montant: null,
			date_publication: pub.sogcDate ?? null,
			score_pertinence: scoreResult.total,
			statut: 'nouveau',
			date_import: nowStr,
			date_modification: nowStr,
		});

		existingIds.add(company.uid);
	}

	// Batch insert
	if (inserts.length > 0) {
		const batchSize = 500;
		for (let i = 0; i < inserts.length; i += batchSize) {
			const batch = inserts.slice(i, i + batchSize);
			const { error } = await locals.supabase.from('prospect_leads').insert(batch);
			if (error) {
				return json({
					error: `Erreur insertion : ${error.message}`,
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
		total_publications: entries.length,
		total_pertinent: relevant.length,
		message: `${imported} lead${imported > 1 ? 's' : ''} importé${imported > 1 ? 's' : ''} depuis la FOSC, ${skipped} ignoré${skipped > 1 ? 's' : ''}.`,
	});
};

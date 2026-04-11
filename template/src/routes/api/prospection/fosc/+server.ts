import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { calculerScore } from '$lib/scoring';
import { randomUUID } from 'crypto';

const ZEFIX_BASE = 'https://www.zefix.admin.ch/ZefixPublicREST/api/v1';

// NOGA secteur F = Construction (codes 41-43)
// 41 = Construction de bâtiments
// 42 = Génie civil
// 43 = Travaux de construction spécialisés
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

interface SogcPublication {
	id: number;
	shabId: number;
	registryOfCommerceId?: string;
	shabDate: string;
	registrationDate?: string;
	message: { fr?: string; de?: string; it?: string };
	company?: {
		name: string;
		uid: string;
		ehpiId?: number;
		legalSeat?: string;
		canton?: { cantonAbbreviation?: string };
		address?: {
			street?: string;
			houseNumber?: string;
			swissZipCode?: string;
			city?: string;
		};
		purpose?: { fr?: string; de?: string; it?: string };
		capitalNominal?: number;
	};
	sogcPubType?: string; // HR01 = inscription, HR02 = mutation, HR03 = radiation
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
	const publications: SogcPublication[] = [];

	for (let d = 0; d < daysBack; d++) {
		const date = new Date(now);
		date.setDate(date.getDate() - d);
		const dateStr = date.toISOString().split('T')[0];

		try {
			const resp = await fetch(`${ZEFIX_BASE}/sogc/ksv/${dateStr}`, {
				headers: {
					'Authorization': authHeader,
					'Accept': 'application/json',
				},
			});

			if (resp.status === 404) continue; // Pas de publications ce jour
			if (!resp.ok) {
				console.error(`FOSC ${dateStr}: HTTP ${resp.status}`);
				continue;
			}

			const data = await resp.json();
			if (Array.isArray(data)) {
				publications.push(...data);
			}
		} catch (err) {
			console.error(`FOSC ${dateStr}: ${String(err)}`);
		}
	}

	if (publications.length === 0) {
		return json({ imported: 0, skipped: 0, message: 'Aucune publication FOSC trouvée pour cette période.' });
	}

	// Filter: only inscriptions (HR01) in target cantons with construction keywords
	const relevant = publications.filter((pub) => {
		// Only new registrations
		if (pub.sogcPubType && !pub.sogcPubType.startsWith('HR01')) return false;

		const company = pub.company;
		if (!company) return false;

		// Canton filter
		const cantonAbbr = company.canton?.cantonAbbreviation;
		if (!cantonAbbr || !validCantons.includes(cantonAbbr)) return false;

		// Construction sector filter
		const purpose = company.purpose?.fr || company.purpose?.de || company.purpose?.it || '';
		const name = company.name || '';
		const message = pub.message?.fr || pub.message?.de || '';
		const fullText = `${purpose} ${name} ${message}`.toLowerCase();

		return CONSTRUCTION_KEYWORDS.some((kw) => fullText.includes(kw));
	});

	if (relevant.length === 0) {
		return json({
			imported: 0,
			skipped: publications.length,
			message: `${publications.length} publications FOSC analysées, aucune pertinente pour le secteur construction.`,
		});
	}

	// Dedup against existing leads
	const uids = relevant.map((p) => p.company?.uid).filter(Boolean) as string[];
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

	for (const pub of relevant) {
		const company = pub.company!;
		if (!company.uid || existingIds.has(company.uid) || dismissedIds.has(company.uid)) {
			skipped++;
			continue;
		}

		const purpose = company.purpose?.fr || company.purpose?.de || company.purpose?.it || '';
		const cantonCode = company.canton?.cantonAbbreviation ?? '';
		if (!CANTON_MAP[cantonCode]) { skipped++; continue; }

		const secteur = detectSecteur(`${purpose} ${company.name}`);
		const addr = company.address;

		const scoreResult = calculerScore({
			canton: cantonCode,
			description: purpose,
			raison_sociale: company.name,
			source: 'fosc',
			date_publication: pub.shabDate ?? null,
			telephone: null,
			montant: company.capitalNominal ?? null,
		});

		inserts.push({
			id: randomUUID(),
			source: 'fosc' as const,
			source_id: company.uid,
			source_url: `https://www.shab.ch/#!/search/publications/detail/${pub.shabId}`,
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
			date_publication: pub.shabDate ?? null,
			score_pertinence: scoreResult.total,
			statut: 'nouveau',
			date_import: nowStr,
			date_modification: nowStr,
		});

		existingIds.add(company.uid); // Prevent duplicates within same batch
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
		total_publications: publications.length,
		total_pertinent: relevant.length,
		message: `${imported} lead${imported > 1 ? 's' : ''} importé${imported > 1 ? 's' : ''} depuis la FOSC, ${skipped} ignoré${skipped > 1 ? 's' : ''}.`,
	});
};

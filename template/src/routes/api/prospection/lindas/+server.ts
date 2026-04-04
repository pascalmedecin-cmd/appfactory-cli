import { json, type RequestEvent } from '@sveltejs/kit';
import { calculerScore } from '$lib/scoring';
import { config } from '$lib/config';
import { randomUUID } from 'crypto';

// Canton code → LINDAS canton ID
const CANTON_IDS: Record<string, string> = {
	GE: '25', VD: '22', VS: '23', NE: '24', FR: '10', JU: '26',
};

// Canton code → addressRegion (2 lettres)
const CANTON_REGIONS: Record<string, string> = {
	'25': 'GE', '22': 'VD', '23': 'VS', '24': 'NE', '10': 'FR', '26': 'JU',
};

const LINDAS_ENDPOINT = 'https://lindas.admin.ch/query';

// Sanitize keyword for safe SPARQL string interpolation
function sanitizeSparql(s: string): string {
	return s.replace(/["\\{}()]/g, '').slice(0, 50).trim();
}

function buildSparqlQuery(cantonId: string, keywords: string[], limit: number): string {
	const safeKeywords = keywords
		.map((kw) => sanitizeSparql(kw.toLowerCase()))
		.filter((kw) => kw.length > 0);

	const keywordFilter = safeKeywords.length > 0
		? safeKeywords.map((kw) =>
			`(CONTAINS(LCASE(?description), "${kw}") || CONTAINS(LCASE(?name), "${kw}"))`
		).join(' || ')
		: '';

	return `
PREFIX schema: <http://schema.org/>
PREFIX admin: <https://schema.ld.admin.ch/>
PREFIX locn: <http://www.w3.org/ns/locn#>

SELECT ?company ?name ?legalName ?description ?url ?uid ?street ?zip ?city ?region
WHERE {
  ?company a admin:ZefixOrganisation ;
           schema:name ?name .

  ?company schema:address ?addr .
  ?addr schema:addressRegion ?region .
  FILTER(?region = "${CANTON_REGIONS[cantonId]}")

  OPTIONAL { ?company schema:legalName ?legalName }
  OPTIONAL { ?company schema:description ?description }
  OPTIONAL { ?company schema:url ?url }
  OPTIONAL {
    ?company schema:identifier ?uidNode .
    FILTER(CONTAINS(STR(?uidNode), "/UID/"))
  }
  OPTIONAL { ?addr schema:streetAddress ?street }
  OPTIONAL { ?addr schema:postalCode ?zip }
  OPTIONAL { ?addr schema:addressLocality ?city }

  BIND(REPLACE(STR(?uidNode), "^.*/UID/", "") AS ?uid)

  ${keywordFilter ? `FILTER(${keywordFilter})` : ''}
}
LIMIT ${limit}
`;
}

interface SparqlBinding {
	value: string;
	type: string;
}

interface SparqlResult {
	company?: SparqlBinding;
	name?: SparqlBinding;
	legalName?: SparqlBinding;
	description?: SparqlBinding;
	url?: SparqlBinding;
	uid?: SparqlBinding;
	street?: SparqlBinding;
	zip?: SparqlBinding;
	city?: SparqlBinding;
	region?: SparqlBinding;
}

export const POST = async ({ request, locals }: RequestEvent) => {
	const { session } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifie' }, { status: 401 });

	const body = await request.json();
	const canton: string = body.canton;
	const keywords: string[] = body.keywords ?? [];
	const limit: number = Math.min(body.limit ?? 100, 500);

	if (!canton || !CANTON_IDS[canton]) {
		return json({ error: 'Canton requis (GE, VD, VS, NE, FR, JU)' }, { status: 400 });
	}

	const cantonId = CANTON_IDS[canton];
	const sparql = buildSparqlQuery(cantonId, keywords, limit);

	// Query LINDAS
	let sparqlResults: SparqlResult[];
	try {
		const resp = await fetch(LINDAS_ENDPOINT, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/sparql-query',
				'Accept': 'application/sparql-results+json',
			},
			body: sparql,
		});

		if (!resp.ok) {
			const text = await resp.text();
			return json({ error: `LINDAS error ${resp.status}: ${text.slice(0, 200)}` }, { status: 502 });
		}

		const data = await resp.json();
		sparqlResults = data.results?.bindings ?? [];
	} catch (err) {
		return json({ error: `Erreur reseau LINDAS: ${String(err)}` }, { status: 502 });
	}

	if (sparqlResults.length === 0) {
		return json({ imported: 0, skipped: 0, message: 'Aucun resultat LINDAS pour ces criteres.' });
	}

	// Deduplicate SPARQL results by company URI (multiple identifiers per company)
	const seen = new Map<string, SparqlResult>();
	for (const row of sparqlResults) {
		const companyUri = row.company?.value ?? '';
		if (!seen.has(companyUri)) {
			seen.set(companyUri, row);
		} else if (row.uid?.value && !seen.get(companyUri)!.uid?.value) {
			// Prefer the row that has a UID
			seen.set(companyUri, row);
		}
	}

	const uniqueResults = Array.from(seen.values());

	// Check existing source_ids to avoid re-importing
	const uids = uniqueResults
		.map((r) => r.uid?.value)
		.filter((v): v is string => !!v && v !== '');

	const existingIds = new Set<string>();
	if (uids.length > 0) {
		const { data: existing } = await locals.supabase
			.from('prospect_leads')
			.select('source_id')
			.eq('source', 'lindas')
			.in('source_id', uids);
		if (existing) {
			for (const e of existing) existingIds.add(e.source_id);
		}
	}

	// Also check transferred/dismissed leads
	const { data: dismissed } = await locals.supabase
		.from('prospect_leads')
		.select('source_id, statut')
		.eq('source', 'lindas')
		.in('statut', ['ecarte', 'transfere']);
	const dismissedIds = new Set<string>();
	if (dismissed) {
		for (const d of dismissed) if (d.source_id) dismissedIds.add(d.source_id);
	}

	const now = new Date().toISOString();
	let imported = 0;
	let skipped = 0;

	// Map canton region code to our CANTONS_LEAD
	const regionToCanton = (region: string): string => {
		const map: Record<string, string> = { GE: 'GE', VD: 'VD', VS: 'VS', NE: 'NE', FR: 'FR', JU: 'JU' };
		return map[region] ?? 'Autre';
	};

	// Detect sector from description (uses config)
	function detectSecteur(desc: string): string | null {
		const lower = desc.toLowerCase();
		for (const [secteur, kws] of Object.entries(config.prospection.secteurKeywords)) {
			if (kws.some((kw) => lower.includes(kw))) return secteur;
		}
		return null;
	}

	const inserts = [];

	for (const row of uniqueResults) {
		const uid = row.uid?.value ?? '';
		const name = row.legalName?.value || row.name?.value || '';
		if (!name) { skipped++; continue; }

		// Skip already imported or dismissed
		if (uid && (existingIds.has(uid) || dismissedIds.has(uid))) {
			skipped++;
			continue;
		}

		const desc = row.description?.value ?? '';
		const region = row.region?.value ?? '';
		const cantonCode = regionToCanton(region);
		const secteur = detectSecteur(`${desc} ${name}`);

		const scoreResult = calculerScore({
			canton: cantonCode,
			description: desc,
			raison_sociale: name,
			source: 'lindas',
			date_publication: null,
			telephone: null,
			montant: null,
		});

		inserts.push({
			id: randomUUID(),
			source: 'lindas' as const,
			source_id: uid || null,
			source_url: row.company?.value ?? null,
			raison_sociale: name,
			nom_contact: null,
			adresse: row.street?.value ?? null,
			npa: row.zip?.value ?? null,
			localite: row.city?.value ?? null,
			canton: cantonCode,
			telephone: null,
			site_web: row.url?.value ?? null,
			email: null,
			secteur_detecte: secteur,
			description: desc.slice(0, 5000) || null,
			montant: null,
			date_publication: null,
			score_pertinence: scoreResult.total,
			statut: 'nouveau',
			date_import: now,
			date_modification: now,
		});
	}

	// Batch insert (Supabase limit ~1000 rows per insert)
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
		total_lindas: uniqueResults.length,
		message: `${imported} lead${imported > 1 ? 's' : ''} importe${imported > 1 ? 's' : ''}, ${skipped} ignore${skipped > 1 ? 's' : ''}.`,
	});
};

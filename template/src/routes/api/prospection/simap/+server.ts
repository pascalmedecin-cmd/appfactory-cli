import { json, type RequestEvent } from '@sveltejs/kit';
import { calculerScore } from '$lib/scoring';
import { randomUUID } from 'crypto';
import { translate, cantonToLead, CANTON_MAP, type Translation } from './helpers';

const SIMAP_BASE = 'https://www.simap.ch/api';
const PROJECT_SEARCH = '/publications/v2/project/project-search';

interface SimapProject {
	id: string;
	title: Translation;
	projectNumber: string;
	projectSubType: string;
	processType: string;
	publicationDate: string;
	pubType: string;
	procOfficeName: Translation;
	orderAddress?: {
		city?: string | Translation | null;
		canton?: string | null;
		postalCode?: string | null;
	} | null;
}

export const POST = async ({ request, locals }: RequestEvent) => {
	const { session } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifie' }, { status: 401 });

	const body = await request.json();
	const canton: string = body.canton;
	const search: string = body.search ?? '';
	const daysBack: number = Math.min(body.daysBack ?? 30, 365);

	if (!canton || !CANTON_MAP[canton]) {
		return json({ error: 'Canton requis (GE, VD, VS, NE, FR, JU)' }, { status: 400 });
	}

	// Build query params
	const params = new URLSearchParams();
	params.append('orderAddressCantons', canton);
	params.append('projectSubTypes', 'construction');

	if (search && search.length >= 3) {
		params.append('search', search);
	}

	// Date range
	const fromDate = new Date();
	fromDate.setDate(fromDate.getDate() - daysBack);
	params.append('newestPublicationFrom', fromDate.toISOString().split('T')[0]);

	// Only tenders (not awards, corrections, etc.)
	params.append('newestPubTypes', 'tender');

	let projects: SimapProject[];
	try {
		const resp = await fetch(`${SIMAP_BASE}${PROJECT_SEARCH}?${params}`, {
			headers: { 'Accept': 'application/json' },
		});

		if (!resp.ok) {
			const text = await resp.text();
			return json({ error: `SIMAP error ${resp.status}: ${text.slice(0, 200)}` }, { status: 502 });
		}

		const data = await resp.json();
		projects = data.projects ?? [];
	} catch (err) {
		return json({ error: `Erreur reseau SIMAP: ${String(err)}` }, { status: 502 });
	}

	if (projects.length === 0) {
		return json({ imported: 0, skipped: 0, message: 'Aucun appel d\'offres SIMAP pour ces criteres.' });
	}

	// Check existing
	const projectIds = projects.map((p) => p.id).filter(Boolean);
	const existingIds = new Set<string>();
	if (projectIds.length > 0) {
		const { data: existing } = await locals.supabase
			.from('prospect_leads')
			.select('source_id')
			.eq('source', 'simap')
			.in('source_id', projectIds);
		if (existing) {
			for (const e of existing) existingIds.add(e.source_id);
		}
	}

	// Check dismissed
	const { data: dismissed } = await locals.supabase
		.from('prospect_leads')
		.select('source_id, statut')
		.eq('source', 'simap')
		.in('statut', ['ecarte', 'transfere']);
	const dismissedIds = new Set<string>();
	if (dismissed) {
		for (const d of dismissed) if (d.source_id) dismissedIds.add(d.source_id);
	}

	const now = new Date().toISOString();
	let imported = 0;
	let skipped = 0;
	const inserts = [];

	for (const project of projects) {
		if (!project.id || !project.title) { skipped++; continue; }
		if (existingIds.has(project.id) || dismissedIds.has(project.id)) { skipped++; continue; }

		const title = translate(project.title);
		const procOffice = translate(project.procOfficeName);
		const addr = project.orderAddress;
		const cantonCode = cantonToLead(addr?.canton);
		const city = addr?.city ? translate(addr.city as Translation) : '';

		const description = [
			title,
			procOffice ? `Pouvoir adjudicateur: ${procOffice}` : '',
			`Type: ${project.projectSubType} | Procedure: ${project.processType}`,
			`Publication: ${project.pubType} — ${project.publicationDate}`,
		].filter(Boolean).join('\n');

		const scoreResult = calculerScore({
			canton: cantonCode,
			description,
			raison_sociale: procOffice || title,
			source: 'simap',
			date_publication: project.publicationDate,
			telephone: null,
			montant: null,
		});

		inserts.push({
			id: randomUUID(),
			source: 'simap' as const,
			source_id: project.id,
			source_url: `https://www.simap.ch/publications/${project.projectNumber}`,
			raison_sociale: procOffice || title,
			nom_contact: null,
			adresse: null,
			npa: addr?.postalCode ?? null,
			localite: city || null,
			canton: cantonCode,
			telephone: null,
			site_web: null,
			email: null,
			secteur_detecte: 'construction',
			description: description.slice(0, 5000),
			montant: null,
			date_publication: project.publicationDate,
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
				return json({ error: `Erreur insertion: ${error.message}`, imported, skipped }, { status: 500 });
			}
			imported += batch.length;
		}
	}

	return json({
		imported,
		skipped,
		total_simap: projects.length,
		message: `${imported} appel${imported > 1 ? 's' : ''} d'offres importe${imported > 1 ? 's' : ''}, ${skipped} ignore${skipped > 1 ? 's' : ''}.`,
	});
};

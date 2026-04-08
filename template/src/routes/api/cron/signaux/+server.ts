import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import { calculerScore } from '$lib/scoring';
import { config } from '$lib/config';
import { timingSafeEqual } from 'crypto';
import { randomUUID } from 'crypto';
import { translate, cantonToLead, CANTON_MAP } from '../../prospection/simap/helpers';
import type { Translation } from '../../prospection/simap/helpers';

const CANTONS = Object.keys(CANTON_MAP); // GE, VD, VS, NE, FR, JU
const ZEFIX_BASE = 'https://www.zefix.admin.ch/ZefixPublicREST/api/v1';
const SIMAP_BASE = 'https://www.simap.ch/api';
const DAYS_BACK = 7;

function verifyCronSecret(authHeader: string | null): boolean {
	const secret = env.CRON_SECRET;
	if (!secret || !authHeader) return false;
	const expected = `Bearer ${secret}`;
	if (authHeader.length !== expected.length) return false;
	return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
}

// --- Zefix types ---
interface ZefixCompany {
	name: string;
	uid: string;
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
	sogcDate?: string;
}

// --- SIMAP types ---
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

// --- Zefix import ---
async function importZefix(
	supabase: ReturnType<typeof createSupabaseServiceClient>,
	authHeader: string,
): Promise<{ imported: number; skipped: number; errors: string[] }> {
	let imported = 0;
	let skipped = 0;
	const errors: string[] = [];
	const now = new Date().toISOString();

	for (const canton of CANTONS) {
		let companies: ZefixCompany[];
		try {
			const resp = await fetch(`${ZEFIX_BASE}/company/search`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': authHeader,
					'Accept': 'application/json',
				},
				body: JSON.stringify({
					canton,
					activeOnly: true,
					maxEntries: 200,
				}),
			});

			if (!resp.ok) {
				errors.push(`Zefix ${canton}: HTTP ${resp.status}`);
				continue;
			}
			companies = await resp.json();
		} catch (err) {
			errors.push(`Zefix ${canton}: ${String(err)}`);
			continue;
		}

		if (!Array.isArray(companies) || companies.length === 0) continue;

		// Filtrer par sogcDate < DAYS_BACK jours (créations récentes)
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - DAYS_BACK);
		const recent = companies.filter((c) => {
			if (!c.sogcDate) return false;
			return new Date(c.sogcDate) >= cutoff;
		});

		if (recent.length === 0) continue;

		// Dédup : vérifier source_id existants
		const uids = recent.map((c) => c.uid).filter(Boolean);
		const { data: existing } = await supabase
			.from('signaux_affaires')
			.select('source_id')
			.eq('source_officielle', 'zefix')
			.in('source_id', uids);
		const existingIds = new Set(existing?.map((e) => e.source_id) ?? []);

		const inserts = [];
		for (const company of recent) {
			if (!company.uid || existingIds.has(company.uid)) { skipped++; continue; }

			const purpose = company.purpose?.fr || company.purpose?.de || company.purpose?.it || '';
			const cantonCode = company.canton?.cantonAbbreviation ?? canton;
			const addr = company.address;

			const score = calculerScore({
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
				type_signal: 'creation_entreprise',
				source_officielle: 'zefix',
				source_id: company.uid,
				description_projet: purpose.slice(0, 5000) || company.name,
				maitre_ouvrage: company.name,
				canton: cantonCode,
				commune: addr?.city ?? company.legalSeat ?? null,
				date_publication: company.sogcDate ?? null,
				date_detection: now,
				statut_traitement: 'nouveau',
				score_pertinence: score.total,
				notes_libres: score.criteres.join(', '),
			});
		}

		if (inserts.length > 0) {
			const { error } = await supabase.from('signaux_affaires').insert(inserts);
			if (error) {
				errors.push(`Zefix ${canton} insert: ${error.message}`);
			} else {
				imported += inserts.length;
			}
		}
	}

	return { imported, skipped, errors };
}

// --- SIMAP import ---
async function importSimap(
	supabase: ReturnType<typeof createSupabaseServiceClient>,
): Promise<{ imported: number; skipped: number; errors: string[] }> {
	let imported = 0;
	let skipped = 0;
	const errors: string[] = [];
	const now = new Date().toISOString();

	const fromDate = new Date();
	fromDate.setDate(fromDate.getDate() - DAYS_BACK);
	const fromStr = fromDate.toISOString().split('T')[0];

	for (const canton of CANTONS) {
		const params = new URLSearchParams({
			orderAddressCantons: canton,
			projectSubTypes: 'construction',
			newestPublicationFrom: fromStr,
			newestPubTypes: 'tender',
		});

		let projects: SimapProject[];
		try {
			const resp = await fetch(`${SIMAP_BASE}/publications/v2/project/project-search?${params}`, {
				headers: { Accept: 'application/json' },
			});
			if (!resp.ok) {
				errors.push(`SIMAP ${canton}: HTTP ${resp.status}`);
				continue;
			}
			const data = await resp.json();
			projects = data.projects ?? [];
		} catch (err) {
			errors.push(`SIMAP ${canton}: ${String(err)}`);
			continue;
		}

		if (projects.length === 0) continue;

		// Dédup
		const projectIds = projects.map((p) => p.id).filter(Boolean);
		const { data: existing } = await supabase
			.from('signaux_affaires')
			.select('source_id')
			.eq('source_officielle', 'simap')
			.in('source_id', projectIds);
		const existingIds = new Set(existing?.map((e) => e.source_id) ?? []);

		const inserts = [];
		for (const project of projects) {
			if (!project.id || existingIds.has(project.id)) { skipped++; continue; }

			const title = translate(project.title);
			const procOffice = translate(project.procOfficeName);
			const addr = project.orderAddress;
			const cantonCode = cantonToLead(addr?.canton) !== 'Autre' ? cantonToLead(addr?.canton) : canton;
			const city = addr?.city ? translate(addr.city as Translation) : '';

			const description = [
				title,
				procOffice ? `Pouvoir adjudicateur : ${procOffice}` : '',
				`Type : ${project.projectSubType} | Procédure : ${project.processType}`,
			].filter(Boolean).join('\n');

			// Filtrer par pertinence secteur : ne garder que les projets liés aux mots-clés cibles
			const texteLower = `${title} ${procOffice} ${description}`.toLowerCase();
			const isRelevant = config.scoring.secteursCibles.keywords.some((kw) => texteLower.includes(kw));
			if (!isRelevant) { skipped++; continue; }

			const score = calculerScore({
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
				type_signal: 'appel_offres',
				source_officielle: 'simap',
				source_id: project.id,
				description_projet: description.slice(0, 5000),
				maitre_ouvrage: procOffice || title,
				canton: cantonCode,
				commune: city || null,
				date_publication: project.publicationDate ?? null,
				date_detection: now,
				statut_traitement: 'nouveau',
				score_pertinence: score.total,
				notes_libres: score.criteres.join(', '),
			});
		}

		if (inserts.length > 0) {
			const { error } = await supabase.from('signaux_affaires').insert(inserts);
			if (error) {
				errors.push(`SIMAP ${canton} insert: ${error.message}`);
			} else {
				imported += inserts.length;
			}
		}
	}

	return { imported, skipped, errors };
}

// --- Endpoint ---
export async function GET(event: RequestEvent) {
	const authHeader = event.request.headers.get('authorization');
	if (!verifyCronSecret(authHeader)) {
		return json({ error: 'Non autorisé' }, { status: 401 });
	}

	const supabase = createSupabaseServiceClient();

	// Zefix
	const zefixAuth = (() => {
		const u = env.ZEFIX_USERNAME;
		const p = env.ZEFIX_PASSWORD;
		if (!u || !p) return null;
		return 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');
	})();

	const zefix = zefixAuth
		? await importZefix(supabase, zefixAuth)
		: { imported: 0, skipped: 0, errors: ['Credentials Zefix non configurés'] };

	const simap = await importSimap(supabase);

	const totalImported = zefix.imported + simap.imported;
	const totalErrors = [...zefix.errors, ...simap.errors];

	if (totalErrors.length > 0) {
		console.error('Cron signaux — erreurs:', totalErrors);
	}

	return json({
		message: `${totalImported} ${totalImported > 1 ? 'signaux importés' : 'signal importé'}`,
		zefix: { imported: zefix.imported, skipped: zefix.skipped },
		simap: { imported: simap.imported, skipped: simap.skipped },
		errors: totalErrors.length,
	});
}

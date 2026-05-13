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
const ROMANDIE = new Set(CANTONS);
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
// L'endpoint /sogc/bydate/{date} renvoie un agrégat publication SOGC + entreprise courte.
// /company/search est saturé (HTTP 400 RESULTLIST_TO_LARGE) sans filtre date — pas adapté
// au scan quotidien Romandie. On scanne donc les 7 dernières publications par date.
interface ZefixSogcEntry {
	sogcPublication: {
		sogcDate: string;
		sogcId: number;
		registryOfCommerceCanton: string;
		message?: string;
		mutationTypes?: Array<{ id: number; key: string }>;
	};
	companyShort: {
		name: string;
		uid: string;
		ehraid?: number;
		legalSeat?: string;
		status?: string;
		sogcDate?: string;
	};
}

const PURPOSE_LABELS = ['But', 'Zweck', 'Scopo', 'Purpose'];
const PURPOSE_STOP = /(?:Personnes? inscrites|Eingetragene Personen|Persone iscritte|Registered persons)/i;
const HTML_ENTITIES: Record<string, string> = {
	'&apos;': "'", '&quot;': '"', '&lt;': '<', '&gt;': '>', '&amp;': '&', '&nbsp;': ' ',
};

// Zefix sert le JSON avec Content-Type: application/json (UTF-8) mais le champ `message`
// est doublement encodé : octets latin-1 ré-encodés en UTF-8 (mojibake type "société").
// On inverse le double encoding en relisant la string comme latin-1 puis en la décodant
// en UTF-8 — opération sûre puisque la chaîne d'origine est ASCII + mojibake.
function fixZefixMojibake(s: string): string {
	try {
		return Buffer.from(s, 'latin1').toString('utf8');
	} catch {
		return s;
	}
}

function decodeHtmlEntities(s: string): string {
	return s
		.replace(/&(?:apos|quot|lt|gt|amp|nbsp);/g, (m) => HTML_ENTITIES[m] ?? m)
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
		.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

// Extrait l'objet social depuis le `message` SOGC (SGML-like avec balises <FT TYPE="...">).
// Robuste à l'absence : retourne '' si rien d'exploitable. Pas de 2e fetch /company/uid
// par défaut (volume ~50 créations Romandie/jour, fetch supplémentaire = facteur ×2 d'appels).
function extractPurposeFromMessage(message: string | undefined): string {
	if (!message) return '';
	const clean = decodeHtmlEntities(fixZefixMojibake(message))
		.replace(/<[^>]+>/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	for (const label of PURPOSE_LABELS) {
		const re = new RegExp(`\\b${label}\\s*:\\s*`, 'i');
		const m = clean.match(re);
		if (!m || m.index === undefined) continue;
		const start = m.index + m[0].length;
		const rest = clean.slice(start);
		const stop = rest.search(PURPOSE_STOP);
		return (stop > 0 ? rest.slice(0, stop) : rest).trim().slice(0, 5000);
	}
	return '';
}

// Le `companyShort.name` est servi avec le même mojibake. On nettoie aussi.
function fixCompanyName(name: string): string {
	return decodeHtmlEntities(fixZefixMojibake(name)).trim();
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
// Stratégie : on scanne les 7 derniers jours via /sogc/bydate/{date}, on filtre côté
// code sur Romandie (registryOfCommerceCanton ∈ CANTONS) + créations (mutationType
// status.neu). Une seule réponse HTTP par jour (≈ 1300 publications nationales/jour),
// ~50 créations Romandie/jour retenues en moyenne.
async function importZefix(
	supabase: ReturnType<typeof createSupabaseServiceClient>,
	authHeader: string,
): Promise<{ imported: number; skipped: number; errors: string[] }> {
	let imported = 0;
	let skipped = 0;
	const errors: string[] = [];
	const now = new Date().toISOString();

	// Construit la liste des dates à scanner (today inclus).
	const dates: string[] = [];
	for (let i = 0; i < DAYS_BACK; i++) {
		const d = new Date();
		d.setDate(d.getDate() - i);
		dates.push(d.toISOString().slice(0, 10));
	}

	// 1) Récolte des créations Romandie sur la fenêtre.
	const creations: ZefixSogcEntry[] = [];
	for (const date of dates) {
		let entries: ZefixSogcEntry[];
		try {
			const resp = await fetch(`${ZEFIX_BASE}/sogc/bydate/${date}`, {
				headers: { Authorization: authHeader, Accept: 'application/json' },
			});
			if (!resp.ok) {
				// 404 = pas de publication ce jour (weekend), pas une erreur applicative.
				if (resp.status !== 404) errors.push(`Zefix ${date}: HTTP ${resp.status}`);
				continue;
			}
			entries = await resp.json();
		} catch (err) {
			errors.push(`Zefix ${date}: ${String(err)}`);
			continue;
		}
		if (!Array.isArray(entries) || entries.length === 0) continue;

		for (const e of entries) {
			const canton = e.sogcPublication?.registryOfCommerceCanton;
			if (!canton || !ROMANDIE.has(canton)) continue;
			const muts = e.sogcPublication?.mutationTypes;
			if (!Array.isArray(muts) || !muts.some((m) => m?.key === 'status.neu')) continue;
			if (!e.companyShort?.uid) continue;
			creations.push(e);
		}
	}

	if (creations.length === 0) return { imported, skipped, errors };

	// 2) Dédup global par source_id (uid Zefix) — 1 requête au lieu d'1 par canton.
	const uids = creations.map((e) => e.companyShort.uid);
	const { data: existing } = await supabase
		.from('signaux_affaires')
		.select('source_id')
		.eq('source_officielle', 'zefix')
		.in('source_id', uids);
	const existingIds = new Set(existing?.map((e) => e.source_id) ?? []);

	// 3) Construit les inserts.
	const inserts = [];
	for (const e of creations) {
		const { companyShort: c, sogcPublication: p } = e;
		if (existingIds.has(c.uid)) { skipped++; continue; }

		// Garde anti drop silencieux (audit 360 V3b L-11 conservé en V2 du cron).
		const sogcDate = p.sogcDate;
		const d = new Date(sogcDate);
		if (Number.isNaN(d.getTime())) {
			errors.push(`Zefix ${p.registryOfCommerceCanton}: sogcDate invalide "${sogcDate}" (uid=${c.uid})`);
			continue;
		}

		const purpose = extractPurposeFromMessage(p.message);
		const cleanName = fixCompanyName(c.name);
		const cleanSeat = c.legalSeat ? fixCompanyName(c.legalSeat) : null;
		const score = calculerScore({
			canton: p.registryOfCommerceCanton,
			description: purpose,
			raison_sociale: cleanName,
			secteur_detecte: null,
			source: 'zefix',
			date_publication: sogcDate ?? null,
			telephone: null,
			montant: null,
		});

		inserts.push({
			id: randomUUID(),
			type_signal: 'creation_entreprise',
			source_officielle: 'zefix',
			source_id: c.uid,
			description_projet: purpose || cleanName,
			maitre_ouvrage: cleanName,
			canton: p.registryOfCommerceCanton,
			commune: cleanSeat,
			date_publication: sogcDate ?? null,
			date_detection: now,
			statut_traitement: 'nouveau',
			score_pertinence: score.total,
			notes_libres: score.criteres.join(', '),
		});
	}

	if (inserts.length === 0) return { imported, skipped, errors };

	const { error } = await supabase.from('signaux_affaires').insert(inserts);
	if (error) {
		errors.push(`Zefix insert: ${error.message}`);
	} else {
		imported = inserts.length;
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
				secteur_detecte: 'construction',
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
		console.error('Cron signaux : erreurs:', totalErrors);
	}

	return json({
		message: `${totalImported} ${totalImported > 1 ? 'signaux importés' : 'signal importé'}`,
		zefix: { imported: zefix.imported, skipped: zefix.skipped },
		simap: { imported: simap.imported, skipped: simap.skipped },
		errors: totalErrors.length,
	});
}

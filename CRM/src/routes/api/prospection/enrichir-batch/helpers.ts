/**
 * Helpers pour l'enrichissement batch : logique pure, testable sans I/O.
 */

export interface EnrichFields {
	[key: string]: string | undefined;
	telephone?: string;
	adresse?: string;
	npa?: string;
	localite?: string;
	description?: string;
	source_url?: string;
}

/**
 * Parse la reponse Atom XML de search.ch et extrait les champs manquants.
 */
export function parseSearchChResponse(
	xml: string,
	lead: { telephone?: string | null; adresse?: string | null; npa?: string | null; localite?: string | null }
): { fields: EnrichFields; found: boolean } {
	const fields: EnrichFields = {};
	let found = false;

	const phoneMatch = xml.match(/<tel:phone>([^<]+)<\/tel:phone>/);
	if (phoneMatch && !lead.telephone) {
		fields.telephone = phoneMatch[1].trim();
		found = true;
	}

	const streetMatch = xml.match(/<tel:street>([^<]+)<\/tel:street>/);
	const streetNoMatch = xml.match(/<tel:streetno>([^<]+)<\/tel:streetno>/);
	if (!lead.adresse && streetMatch) {
		fields.adresse = streetMatch[1] + (streetNoMatch ? ` ${streetNoMatch[1]}` : '');
		found = true;
	}

	const zipMatch = xml.match(/<tel:zip>([^<]+)<\/tel:zip>/);
	if (!lead.npa && zipMatch) {
		fields.npa = zipMatch[1];
		found = true;
	}

	const cityMatch = xml.match(/<tel:city>([^<]+)<\/tel:city>/);
	if (!lead.localite && cityMatch) {
		fields.localite = cityMatch[1];
		found = true;
	}

	return { fields, found };
}

/**
 * Extrait les champs manquants depuis une reponse Zefix company.
 */
export function parseZefixCompany(
	company: {
		address?: { street?: string; houseNumber?: string; swissZipCode?: string; city?: string };
		legalSeat?: string;
		purpose?: { fr?: string; de?: string; it?: string };
		ehpiId?: number;
	},
	lead: { adresse?: string | null; npa?: string | null; localite?: string | null; description?: string | null; source_url?: string | null }
): { fields: EnrichFields; found: boolean } {
	const fields: EnrichFields = {};
	let found = false;

	if (!lead.adresse && company.address?.street) {
		fields.adresse = [company.address.street, company.address.houseNumber].filter(Boolean).join(' ');
		found = true;
	}
	if (!lead.npa && company.address?.swissZipCode) {
		fields.npa = company.address.swissZipCode;
		found = true;
	}
	if (!lead.localite && (company.address?.city || company.legalSeat)) {
		fields.localite = company.address?.city || company.legalSeat;
		found = true;
	}

	const purpose = company.purpose?.fr || company.purpose?.de || company.purpose?.it || '';
	if (!lead.description && purpose) {
		fields.description = purpose.slice(0, 5000);
		found = true;
	}

	if (!lead.source_url && company.ehpiId) {
		fields.source_url = `https://www.zefix.admin.ch/fr/search/entity/list/firm/${company.ehpiId}`;
		found = true;
	}

	return { fields, found };
}

/**
 * Determine le statut d'enrichissement d'un lead.
 */
export function determineLeadStatus(
	lead: { telephone?: string | null; adresse?: string | null; localite?: string | null },
	fieldsUpdated: number
): 'enriched' | 'already_complete' | 'not_found' {
	if (fieldsUpdated > 0) return 'enriched';
	if (lead.telephone && lead.adresse && lead.localite) return 'already_complete';
	return 'not_found';
}

/**
 * Formate un SSE event.
 */
export function sseEvent(event: string, data: unknown): string {
	return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Valide les parametres d'entree du batch.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: unknown): value is string {
	return typeof value === 'string' && UUID_RE.test(value);
}

export function validateBatchInput(
	leadIds: unknown,
	sources: unknown
): { valid: true; leadIds: string[]; sources: string[] } | { valid: false; error: string } {
	if (!Array.isArray(leadIds) || leadIds.length === 0) {
		return { valid: false, error: 'lead_ids requis (tableau non vide)' };
	}
	if (leadIds.length > 200) {
		return { valid: false, error: 'Maximum 200 leads par batch' };
	}
	if (!leadIds.every(isValidUuid)) {
		return { valid: false, error: 'Tous les IDs doivent être des UUIDs valides' };
	}

	const validSources = ['search_ch', 'zefix'];
	const srcArray = Array.isArray(sources) ? sources : ['search_ch', 'zefix'];
	const filtered = srcArray.filter((s: string) => validSources.includes(s));

	if (filtered.length === 0) {
		return { valid: false, error: 'Au moins une source valide requise (search_ch, zefix)' };
	}

	return { valid: true, leadIds: leadIds as string[], sources: filtered };
}

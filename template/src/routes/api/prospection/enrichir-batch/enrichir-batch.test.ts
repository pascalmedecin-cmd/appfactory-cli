import { describe, it, expect } from 'vitest';
import {
	parseSearchChResponse,
	parseZefixCompany,
	determineLeadStatus,
	sseEvent,
	validateBatchInput,
} from './helpers';

// --- parseSearchChResponse ---

describe('parseSearchChResponse', () => {
	const xmlFull = `
		<entry>
			<tel:phone>+41 22 123 45 67</tel:phone>
			<tel:street>Rue du Lac</tel:street>
			<tel:streetno>12</tel:streetno>
			<tel:zip>1200</tel:zip>
			<tel:city>Geneve</tel:city>
		</entry>
	`;

	it('extrait telephone, adresse, npa, localite si manquants', () => {
		const lead = { telephone: null, adresse: null, npa: null, localite: null };
		const { fields, found } = parseSearchChResponse(xmlFull, lead);
		expect(found).toBe(true);
		expect(fields.telephone).toBe('+41 22 123 45 67');
		expect(fields.adresse).toBe('Rue du Lac 12');
		expect(fields.npa).toBe('1200');
		expect(fields.localite).toBe('Geneve');
	});

	it('ne remplace pas les champs existants', () => {
		const lead = { telephone: '+41 79 999 99 99', adresse: 'Existante', npa: '1201', localite: 'Geneve' };
		const { fields, found } = parseSearchChResponse(xmlFull, lead);
		expect(found).toBe(false);
		expect(fields.telephone).toBeUndefined();
		expect(fields.adresse).toBeUndefined();
	});

	it('gere un XML sans resultats', () => {
		const { fields, found } = parseSearchChResponse('<feed></feed>', { telephone: null, adresse: null, npa: null, localite: null });
		expect(found).toBe(false);
		expect(Object.keys(fields)).toHaveLength(0);
	});

	it('extrait adresse sans numero de rue', () => {
		const xml = '<entry><tel:street>Avenue de la Gare</tel:street><tel:zip>1003</tel:zip></entry>';
		const { fields, found } = parseSearchChResponse(xml, { telephone: null, adresse: null, npa: null, localite: null });
		expect(found).toBe(true);
		expect(fields.adresse).toBe('Avenue de la Gare');
		expect(fields.npa).toBe('1003');
	});

	it('extrait uniquement les champs manquants (mix)', () => {
		const lead = { telephone: null, adresse: 'Deja la', npa: null, localite: 'Geneve' };
		const { fields, found } = parseSearchChResponse(xmlFull, lead);
		expect(found).toBe(true);
		expect(fields.telephone).toBe('+41 22 123 45 67');
		expect(fields.adresse).toBeUndefined();
		expect(fields.npa).toBe('1200');
		expect(fields.localite).toBeUndefined();
	});
});

// --- parseZefixCompany ---

describe('parseZefixCompany', () => {
	const company = {
		address: { street: 'Quai du Mont-Blanc', houseNumber: '5', swissZipCode: '1201', city: 'Geneve' },
		legalSeat: 'Geneve',
		purpose: { fr: 'Commerce de films de protection solaire', de: 'Sonnenschutzfolien Handel' },
		ehpiId: 12345,
	};

	it('extrait tous les champs manquants', () => {
		const lead = { adresse: null, npa: null, localite: null, description: null, source_url: null };
		const { fields, found } = parseZefixCompany(company, lead);
		expect(found).toBe(true);
		expect(fields.adresse).toBe('Quai du Mont-Blanc 5');
		expect(fields.npa).toBe('1201');
		expect(fields.localite).toBe('Geneve');
		expect(fields.description).toBe('Commerce de films de protection solaire');
		expect(fields.source_url).toContain('12345');
	});

	it('ne remplace pas les champs existants', () => {
		const lead = { adresse: 'Existe', npa: '1200', localite: 'Exist', description: 'Exist', source_url: 'https://example.com' };
		const { fields, found } = parseZefixCompany(company, lead);
		expect(found).toBe(false);
		expect(Object.keys(fields)).toHaveLength(0);
	});

	it('utilise legalSeat si pas de city dans address', () => {
		const co = { ...company, address: { street: 'Rue Test' } };
		const lead = { adresse: null, npa: null, localite: null, description: null, source_url: null };
		const { fields } = parseZefixCompany(co, lead);
		expect(fields.localite).toBe('Geneve');
	});

	it('prefere fr pour le but social, fallback de', () => {
		const co = { ...company, purpose: { de: 'Nur Deutsch' } };
		const lead = { adresse: 'X', npa: 'X', localite: 'X', description: null, source_url: 'X' };
		const { fields, found } = parseZefixCompany(co, lead);
		expect(found).toBe(true);
		expect(fields.description).toBe('Nur Deutsch');
	});

	it('tronque le but social a 5000 caracteres', () => {
		const longPurpose = 'A'.repeat(6000);
		const co = { ...company, purpose: { fr: longPurpose } };
		const lead = { adresse: 'X', npa: 'X', localite: 'X', description: null, source_url: 'X' };
		const { fields } = parseZefixCompany(co, lead);
		expect(fields.description).toHaveLength(5000);
	});
});

// --- determineLeadStatus ---

describe('determineLeadStatus', () => {
	it('retourne enriched si des champs ont ete mis a jour', () => {
		expect(determineLeadStatus({ telephone: null, adresse: null, localite: null }, 3)).toBe('enriched');
	});

	it('retourne already_complete si complet et rien de nouveau', () => {
		expect(determineLeadStatus({ telephone: '+41...', adresse: 'Rue X', localite: 'Geneve' }, 0)).toBe('already_complete');
	});

	it('retourne not_found si incomplet et rien trouve', () => {
		expect(determineLeadStatus({ telephone: null, adresse: null, localite: null }, 0)).toBe('not_found');
	});

	it('retourne not_found si partiellement complet et rien trouve', () => {
		expect(determineLeadStatus({ telephone: '+41...', adresse: null, localite: null }, 0)).toBe('not_found');
	});
});

// --- sseEvent ---

describe('sseEvent', () => {
	it('formate correctement un event SSE', () => {
		const result = sseEvent('progress', { current: 1, total: 10 });
		expect(result).toBe('event: progress\ndata: {"current":1,"total":10}\n\n');
	});

	it('gere les donnees complexes', () => {
		const result = sseEvent('done', { enriched: 5, errors: 1 });
		expect(result).toContain('event: done');
		expect(result).toContain('"enriched":5');
	});
});

// --- validateBatchInput ---

describe('validateBatchInput', () => {
	const UUID_A = '00000000-0000-0000-0000-000000000001';
	const UUID_B = '00000000-0000-0000-0000-000000000002';

	it('valide un input correct', () => {
		const result = validateBatchInput([UUID_A, UUID_B], ['search_ch']);
		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.leadIds).toEqual([UUID_A, UUID_B]);
			expect(result.sources).toEqual(['search_ch']);
		}
	});

	it('refuse un tableau vide', () => {
		const result = validateBatchInput([], ['search_ch']);
		expect(result.valid).toBe(false);
	});

	it('refuse plus de 200 leads', () => {
		const ids = Array.from({ length: 201 }, (_, i) =>
			`00000000-0000-0000-0000-${String(i).padStart(12, '0')}`
		);
		const result = validateBatchInput(ids, ['search_ch']);
		expect(result.valid).toBe(false);
		if (!result.valid) expect(result.error).toContain('200');
	});

	it('refuse un non-tableau', () => {
		const result = validateBatchInput('not-array', ['search_ch']);
		expect(result.valid).toBe(false);
	});

	it('refuse des IDs non-UUID', () => {
		const result = validateBatchInput(['not-a-uuid', UUID_A], ['search_ch']);
		expect(result.valid).toBe(false);
		if (!result.valid) expect(result.error).toContain('UUID');
	});

	it('utilise les sources par defaut si non fournies', () => {
		const result = validateBatchInput([UUID_A], undefined);
		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.sources).toEqual(['search_ch', 'zefix']);
		}
	});

	it('filtre les sources invalides', () => {
		const result = validateBatchInput([UUID_A], ['search_ch', 'invalid', 'zefix']);
		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.sources).toEqual(['search_ch', 'zefix']);
		}
	});

	it('refuse si toutes les sources sont invalides', () => {
		const result = validateBatchInput([UUID_A], ['invalid1', 'invalid2']);
		expect(result.valid).toBe(false);
	});
});

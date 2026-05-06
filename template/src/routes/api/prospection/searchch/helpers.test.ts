import { describe, it, expect } from 'vitest';
import {
	normalizeTerm,
	isGenericTerm,
	validateSearchChImportInput,
	buildSearchChQueryParams,
	parseSearchChImportFeed,
	buildSourceId,
	detectSecteurFromEntry,
	sanitizeApiKeyInLogs,
} from './helpers';

// --- normalizeTerm ---
describe('normalizeTerm', () => {
	it('strip accents + lowercase + trim', () => {
		expect(normalizeTerm('  Société  ')).toBe('societe');
		expect(normalizeTerm('SARL')).toBe('sarl');
		expect(normalizeTerm('Sàrl')).toBe('sarl');
		expect(normalizeTerm('GmbH')).toBe('gmbh');
		expect(normalizeTerm('VITRERIE')).toBe('vitrerie');
		expect(normalizeTerm('façade')).toBe('facade');
	});
});

// --- isGenericTerm ---
describe('isGenericTerm', () => {
	it('refuse les formes juridiques courantes (FR/DE/EN)', () => {
		expect(isGenericTerm('SA')).toBe(true);
		expect(isGenericTerm('Sàrl')).toBe(true);
		expect(isGenericTerm('SARL')).toBe(true);
		expect(isGenericTerm('GmbH')).toBe(true);
		expect(isGenericTerm('AG')).toBe(true);
		expect(isGenericTerm('Ltd')).toBe(true);
		expect(isGenericTerm('LLC')).toBe(true);
		expect(isGenericTerm('société')).toBe(true);
		expect(isGenericTerm('societe')).toBe(true);
		expect(isGenericTerm('entreprise')).toBe(true);
		expect(isGenericTerm('  SA  ')).toBe(true);
	});

	it('accepte les termes métiers spécifiques', () => {
		expect(isGenericTerm('vitrerie')).toBe(false);
		expect(isGenericTerm('façade')).toBe(false);
		expect(isGenericTerm('architecte')).toBe(false);
		expect(isGenericTerm('Vitrerie SA')).toBe(false); // composé non générique
		expect(isGenericTerm('miroiterie')).toBe(false);
		expect(isGenericTerm('store')).toBe(false);
	});
});

// --- validateSearchChImportInput ---
describe('validateSearchChImportInput', () => {
	it('accepte un payload valide minimal', () => {
		const r = validateSearchChImportInput({ term: 'vitrerie', canton: 'GE' });
		expect(r.valid).toBe(true);
		if (r.valid) {
			expect(r.input.term).toBe('vitrerie');
			expect(r.input.canton).toBe('GE');
			expect(r.input.ville).toBeNull();
			expect(r.input.from_intelligence).toBeNull();
			expect(r.input.from_term).toBeNull();
		}
	});

	it('accepte ville optionnelle + UUID + term Veille', () => {
		const r = validateSearchChImportInput({
			term: 'façade',
			canton: 'vd',
			ville: 'Lausanne',
			from_intelligence: '11111111-2222-3333-4444-555555555555',
			from_term: 'rénovation patrimoine',
		});
		expect(r.valid).toBe(true);
		if (r.valid) {
			expect(r.input.canton).toBe('VD'); // upcased
			expect(r.input.ville).toBe('Lausanne');
			expect(r.input.from_intelligence).toBe('11111111-2222-3333-4444-555555555555');
			expect(r.input.from_term).toBe('rénovation patrimoine');
		}
	});

	it('refuse term trop court (< 3)', () => {
		const r = validateSearchChImportInput({ term: 'ab', canton: 'GE' });
		expect(r.valid).toBe(false);
		if (!r.valid) expect(r.error).toMatch(/3 caractères/);
	});

	it('refuse term vide', () => {
		expect(validateSearchChImportInput({ term: '', canton: 'GE' }).valid).toBe(false);
		expect(validateSearchChImportInput({ term: '   ', canton: 'GE' }).valid).toBe(false);
	});

	it('refuse term > 100 chars', () => {
		const r = validateSearchChImportInput({ term: 'x'.repeat(101), canton: 'GE' });
		expect(r.valid).toBe(false);
		if (!r.valid) expect(r.error).toMatch(/trop long/);
	});

	it('refuse term générique (formes juridiques)', () => {
		expect(validateSearchChImportInput({ term: 'SARL', canton: 'GE' }).valid).toBe(false);
		expect(validateSearchChImportInput({ term: 'Sàrl', canton: 'GE' }).valid).toBe(false);
		expect(validateSearchChImportInput({ term: 'GmbH', canton: 'GE' }).valid).toBe(false);
		expect(validateSearchChImportInput({ term: 'Société', canton: 'GE' }).valid).toBe(false);
	});

	it('refuse canton inconnu', () => {
		expect(validateSearchChImportInput({ term: 'vitrerie', canton: 'ZH' }).valid).toBe(false);
		expect(validateSearchChImportInput({ term: 'vitrerie', canton: '' }).valid).toBe(false);
		expect(validateSearchChImportInput({ term: 'vitrerie' }).valid).toBe(false);
	});

	it('refuse ville > 60 chars', () => {
		const r = validateSearchChImportInput({ term: 'vitrerie', canton: 'GE', ville: 'x'.repeat(61) });
		expect(r.valid).toBe(false);
	});

	it('rejette payload null/non-objet', () => {
		expect(validateSearchChImportInput(null).valid).toBe(false);
		expect(validateSearchChImportInput('string').valid).toBe(false);
		expect(validateSearchChImportInput(42).valid).toBe(false);
	});

	it('UUID invalide → from_intelligence null (silencieux, pas un fail)', () => {
		const r = validateSearchChImportInput({
			term: 'vitrerie',
			canton: 'GE',
			from_intelligence: 'not-a-uuid',
		});
		expect(r.valid).toBe(true);
		if (r.valid) expect(r.input.from_intelligence).toBeNull();
	});

	it('from_term tronqué à 200 chars', () => {
		const r = validateSearchChImportInput({
			term: 'vitrerie',
			canton: 'GE',
			from_term: 'x'.repeat(300),
		});
		expect(r.valid).toBe(true);
		if (r.valid) expect(r.input.from_term?.length).toBe(200);
	});
});

// --- buildSearchChQueryParams ---
describe('buildSearchChQueryParams', () => {
	it('construit les params canoniques avec ville', () => {
		const p = buildSearchChQueryParams({
			term: 'vitrerie',
			canton: 'GE',
			ville: 'Carouge',
			apiKey: 'secret-key',
		});
		expect(p.get('was')).toBe('vitrerie');
		expect(p.get('wo')).toBe('Carouge');
		expect(p.get('firma')).toBe('1');
		expect(p.get('privat')).toBe('0');
		expect(p.get('maxnum')).toBe('20');
		expect(p.get('lang')).toBe('fr');
		expect(p.get('key')).toBe('secret-key');
	});

	it('utilise nom canton FR si pas de ville', () => {
		const p = buildSearchChQueryParams({
			term: 'façade',
			canton: 'VD',
			ville: null,
			apiKey: 'k',
		});
		expect(p.get('wo')).toBe('Vaud');
	});

	it('canton inconnu → fallback code', () => {
		const p = buildSearchChQueryParams({
			term: 'x',
			canton: 'XX',
			ville: null,
			apiKey: 'k',
		});
		expect(p.get('wo')).toBe('XX');
	});
});

// --- parseSearchChImportFeed ---
describe('parseSearchChImportFeed', () => {
	const feedFull = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:tel="http://www.search.ch/tel/1.4">
	<entry>
		<title>Vitrerie Dupont SA, Genève</title>
		<tel:name>Vitrerie Dupont SA</tel:name>
		<tel:phone>+41 22 123 45 67</tel:phone>
		<tel:street>Rue du Lac</tel:street>
		<tel:streetno>12</tel:streetno>
		<tel:zip>1200</tel:zip>
		<tel:city>Genève</tel:city>
		<tel:occupation>Vitrerie - Miroiterie</tel:occupation>
	</entry>
	<entry>
		<title>Façades Martin Sàrl | Vitrerie | Genève</title>
		<tel:name>Façades Martin Sàrl</tel:name>
		<tel:phone>022 700 00 00</tel:phone>
		<tel:street>Avenue de la Praille</tel:street>
		<tel:zip>1227</tel:zip>
		<tel:city>Carouge</tel:city>
		<tel:occupation>Construction de façades</tel:occupation>
	</entry>
</feed>`;

	it('parse 2 entrées avec tous les champs', () => {
		const entries = parseSearchChImportFeed(feedFull);
		expect(entries).toHaveLength(2);

		expect(entries[0]).toEqual({
			name: 'Vitrerie Dupont SA',
			telephone: '+41 22 123 45 67',
			adresse: 'Rue du Lac 12',
			npa: '1200',
			localite: 'Genève',
			occupation: 'Vitrerie - Miroiterie',
		});

		expect(entries[1].name).toBe('Façades Martin Sàrl');
		expect(entries[1].adresse).toBe('Avenue de la Praille'); // pas de streetno
	});

	it('fallback sur <title> si pas de <tel:name>', () => {
		const xml = `<entry><title>ACME SA, Genève</title><tel:phone>022 1</tel:phone></entry>`;
		const entries = parseSearchChImportFeed(xml);
		expect(entries).toHaveLength(1);
		expect(entries[0].name).toBe('ACME SA'); // split sur virgule
	});

	it('skip entry sans nom', () => {
		const xml = `<entry><tel:phone>022 1</tel:phone></entry>`;
		expect(parseSearchChImportFeed(xml)).toHaveLength(0);
	});

	it('skip entry avec nom < 2 chars', () => {
		const xml = `<entry><tel:name>X</tel:name></entry>`;
		expect(parseSearchChImportFeed(xml)).toHaveLength(0);
	});

	it('feed vide retourne []', () => {
		expect(parseSearchChImportFeed('<feed></feed>')).toEqual([]);
		expect(parseSearchChImportFeed('')).toEqual([]);
	});

	it('décode entités XML (&amp; &lt; &quot;)', () => {
		const xml = `<entry><tel:name>Smith &amp; Co</tel:name></entry>`;
		const entries = parseSearchChImportFeed(xml);
		expect(entries[0].name).toBe('Smith & Co');
	});

	it('robuste aux entries sur plusieurs lignes + attributs sur <entry>', () => {
		const xml = `<entry id="x" type="firma">
			<tel:name>Multi-Line SA</tel:name>
		</entry>`;
		expect(parseSearchChImportFeed(xml)).toHaveLength(1);
	});

	it('tous les champs optionnels manquants → null sauf name', () => {
		const xml = `<entry><tel:name>Solo SA</tel:name></entry>`;
		const entries = parseSearchChImportFeed(xml);
		expect(entries[0]).toEqual({
			name: 'Solo SA',
			telephone: null,
			adresse: null,
			npa: null,
			localite: null,
			occupation: null,
		});
	});

	it('input invalide → []', () => {
		expect(parseSearchChImportFeed(null as unknown as string)).toEqual([]);
		expect(parseSearchChImportFeed(undefined as unknown as string)).toEqual([]);
	});
});

// --- buildSourceId ---
describe('buildSourceId', () => {
	it('génère un id stable name+npa', () => {
		expect(buildSourceId({ name: 'Vitrerie Dupont SA', npa: '1200' })).toBe('vitrerie-dupont-sa|1200');
	});

	it('strip accents', () => {
		expect(buildSourceId({ name: 'Façades Élégantes', npa: '1227' })).toBe('facades-elegantes|1227');
	});

	it('strip caractères non-ascii', () => {
		expect(buildSourceId({ name: 'Smith & Co!', npa: null })).toBe('smith--co|unknown');
	});

	it('npa null → unknown', () => {
		expect(buildSourceId({ name: 'X', npa: null })).toBe('x|unknown');
	});

	it('garde uniquement chiffres dans npa', () => {
		expect(buildSourceId({ name: 'X', npa: 'CH-1200' })).toBe('x|1200');
	});

	it('tronqué à 80 chars', () => {
		const id = buildSourceId({ name: 'a'.repeat(120), npa: '1200' });
		expect(id.length).toBeLessThanOrEqual(80);
	});

	it('même name+npa → même id (déterministe)', () => {
		const a = buildSourceId({ name: 'ACME SA', npa: '1200' });
		const b = buildSourceId({ name: 'ACME SA', npa: '1200' });
		expect(a).toBe(b);
	});
});

// --- sanitizeApiKeyInLogs ---
describe('sanitizeApiKeyInLogs', () => {
	it('redacte la clé API dans une URL', () => {
		const url = 'https://search.ch/tel/api/?was=vitrerie&key=secret-key&maxnum=20';
		expect(sanitizeApiKeyInLogs(url)).toBe(
			'https://search.ch/tel/api/?was=vitrerie&key=[REDACTED]&maxnum=20',
		);
	});

	it('redacte clé en fin de string (pas de & suivant)', () => {
		expect(sanitizeApiKeyInLogs('foo key=abc123def')).toBe('foo key=[REDACTED]');
	});

	it('redacte plusieurs occurrences', () => {
		expect(sanitizeApiKeyInLogs('a key=k1&b key=k2')).toBe('a key=[REDACTED]&b key=[REDACTED]');
	});

	it('insensible à la casse', () => {
		expect(sanitizeApiKeyInLogs('KEY=secret')).toBe('key=[REDACTED]');
	});

	it('passe-through si pas de clé', () => {
		expect(sanitizeApiKeyInLogs('Erreur réseau')).toBe('Erreur réseau');
	});

	it('vide → vide', () => {
		expect(sanitizeApiKeyInLogs('')).toBe('');
	});

	it('exemple typique fetch error trace TypeError', () => {
		const errMsg =
			'TypeError: fetch failed, request to https://search.ch/tel/api/?was=x&key=ABC123XYZ&maxnum=20 failed';
		expect(sanitizeApiKeyInLogs(errMsg)).toContain('key=[REDACTED]');
		expect(sanitizeApiKeyInLogs(errMsg)).not.toContain('ABC123XYZ');
	});
});

// --- detectSecteurFromEntry ---
describe('detectSecteurFromEntry', () => {
	it('détecte vitrerie via menuiserie keywords', () => {
		expect(detectSecteurFromEntry({ name: 'Vitrerie Dupont', occupation: null })).toBe('menuiserie');
		expect(detectSecteurFromEntry({ name: 'X', occupation: 'Vitrerie - Miroiterie' })).toBe('menuiserie');
	});

	it('détecte construction', () => {
		expect(detectSecteurFromEntry({ name: 'Bau AG', occupation: null })).toBe('construction');
	});

	it('détecte architecte', () => {
		expect(detectSecteurFromEntry({ name: 'Bureau d\'architectes Smith', occupation: null })).toBe('architecture');
	});

	it('insensible aux accents', () => {
		expect(detectSecteurFromEntry({ name: 'RÉNOVATION SA', occupation: null })).toBe('renovation');
	});

	it('inconnu → null', () => {
		expect(detectSecteurFromEntry({ name: 'Coiffure Léa', occupation: null })).toBeNull();
	});
});

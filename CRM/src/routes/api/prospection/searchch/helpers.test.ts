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
	// Format réel API search.ch (capturé sur appel live 2026-05-06).
	const feedReal = `<?xml version="1.0" encoding="utf-8" ?>
<feed xml:lang="fr" xmlns="http://www.w3.org/2005/Atom" xmlns:tel="http://tel.search.ch/api/spec/result/1.0/">
	<entry>
		<id>urn:uuid:cbcd31f79d0cfbd2</id>
		<title type="text">AA A &amp; Artisans Genevois Sàrl</title>
		<link href="https://search.ch/tel/geneve/aa-a-artisans-genevois-sarl.fr.html" title="Details" rel="alternate" type="text/html" />
		<link href="https://search.ch/tel/tel/vcard/X.vcf?key=cbcd31f79d0cfbd2" type="text/x-vcard" rel="alternate" />
		<tel:id>cbcd31f79d0cfbd2</tel:id>
		<tel:type>Organisation</tel:type>
		<tel:name>AA A &amp; Artisans Genevois Sàrl</tel:name>
		<tel:street>Boulevard D'Yvoy</tel:street>
		<tel:streetno>27</tel:streetno>
		<tel:zip>1205</tel:zip>
		<tel:city>Genève</tel:city>
		<tel:canton>GE</tel:canton>
		<tel:category>Dépannage</tel:category>
		<tel:category>Vitrerie</tel:category>
		<tel:category>Construction métallique</tel:category>
		<tel:phone>+41224363839</tel:phone>
		<tel:extra type="email">artisansgenevois@bluewin.ch*</tel:extra>
		<tel:extra type="website">www.artisans.ch: https://www.artisans.ch</tel:extra>
	</entry>
	<entry>
		<id>urn:uuid:4a8c1866bfbceea1</id>
		<title type="text">BP Stores SA</title>
		<tel:id>4a8c1866bfbceea1</tel:id>
		<tel:name>BP Stores SA</tel:name>
		<tel:street>Rue De-Candolle</tel:street>
		<tel:streetno>11</tel:streetno>
		<tel:zip>1205</tel:zip>
		<tel:city>Genève</tel:city>
		<tel:canton>GE</tel:canton>
		<tel:category>Stores</tel:category>
		<tel:phone>+41228190815</tel:phone>
	</entry>
</feed>`;

	it('parse format API réel : tel:id, categories N, extras email/website, link alternate', () => {
		const entries = parseSearchChImportFeed(feedReal);
		expect(entries).toHaveLength(2);

		expect(entries[0]).toMatchObject({
			telId: 'cbcd31f79d0cfbd2',
			name: 'AA A & Artisans Genevois Sàrl',
			telephone: '+41224363839',
			adresse: "Boulevard D'Yvoy 27",
			npa: '1205',
			localite: 'Genève',
			canton: 'GE',
			occupation: null,
			categories: ['Dépannage', 'Vitrerie', 'Construction métallique'],
			email: 'artisansgenevois@bluewin.ch',
			website: 'https://www.artisans.ch',
			sourceUrl: 'https://search.ch/tel/geneve/aa-a-artisans-genevois-sarl.fr.html',
		});

		expect(entries[1].telId).toBe('4a8c1866bfbceea1');
		expect(entries[1].categories).toEqual(['Stores']);
		expect(entries[1].email).toBeNull(); // pas d'extra email
		expect(entries[1].website).toBeNull();
	});

	it('email avec suffixe * (refus pub) → strippé', () => {
		const xml = `<entry><tel:name>XX</tel:name><tel:extra type="email">a@b.ch*</tel:extra></entry>`;
		expect(parseSearchChImportFeed(xml)[0].email).toBe('a@b.ch');
	});

	it('email malformé → null (validation @)', () => {
		const xml = `<entry><tel:name>XX</tel:name><tel:extra type="email">pasunemail</tel:extra></entry>`;
		expect(parseSearchChImportFeed(xml)[0].email).toBeNull();
	});

	it('website format "domaine: https://..." → URL canonique', () => {
		const xml = `<entry><tel:name>XX</tel:name><tel:extra type="website">www.foo.ch: https://www.foo.ch/path</tel:extra></entry>`;
		expect(parseSearchChImportFeed(xml)[0].website).toBe('https://www.foo.ch/path');
	});

	it('website juste un domaine → préfixé https://', () => {
		const xml = `<entry><tel:name>XX</tel:name><tel:extra type="website">www.foo.ch</tel:extra></entry>`;
		expect(parseSearchChImportFeed(xml)[0].website).toBe('https://www.foo.ch');
	});

	it('plusieurs <tel:category> → toutes collectées dans l\'ordre', () => {
		const xml = `<entry><tel:name>XX</tel:name><tel:category>A</tel:category><tel:category>B</tel:category></entry>`;
		expect(parseSearchChImportFeed(xml)[0].categories).toEqual(['A', 'B']);
	});

	it('aucune <tel:category> → []', () => {
		const xml = `<entry><tel:name>XX</tel:name></entry>`;
		expect(parseSearchChImportFeed(xml)[0].categories).toEqual([]);
	});

	it('fallback <title> → name si pas de <tel:name>', () => {
		const xml = `<entry><title type="text">ACME SA, Genève</title></entry>`;
		const entries = parseSearchChImportFeed(xml);
		expect(entries).toHaveLength(1);
		expect(entries[0].name).toBe('ACME SA');
	});

	it('skip entry sans nom', () => {
		expect(parseSearchChImportFeed(`<entry><tel:phone>022 1</tel:phone></entry>`)).toHaveLength(0);
	});

	it('skip entry avec nom < 2 chars', () => {
		expect(parseSearchChImportFeed(`<entry><tel:name>X</tel:name></entry>`)).toHaveLength(0);
	});

	it('feed vide retourne []', () => {
		expect(parseSearchChImportFeed('<feed></feed>')).toEqual([]);
		expect(parseSearchChImportFeed('')).toEqual([]);
	});

	it('décode entités XML', () => {
		const xml = `<entry><tel:name>Smith &amp; Co</tel:name></entry>`;
		expect(parseSearchChImportFeed(xml)[0].name).toBe('Smith & Co');
	});

	it('robuste aux entries multi-lignes + attributs sur <entry>', () => {
		const xml = `<entry id="x" type="firma">
			<tel:name>Multi-Line SA</tel:name>
		</entry>`;
		expect(parseSearchChImportFeed(xml)).toHaveLength(1);
	});

	it('tous les champs optionnels manquants → defaults null/[]', () => {
		const entries = parseSearchChImportFeed(`<entry><tel:name>Solo SA</tel:name></entry>`);
		expect(entries[0]).toEqual({
			telId: null,
			name: 'Solo SA',
			telephone: null,
			adresse: null,
			npa: null,
			localite: null,
			canton: null,
			occupation: null,
			categories: [],
			email: null,
			website: null,
			sourceUrl: null,
		});
	});

	it('input invalide → []', () => {
		expect(parseSearchChImportFeed(null as unknown as string)).toEqual([]);
		expect(parseSearchChImportFeed(undefined as unknown as string)).toEqual([]);
	});
});

// --- buildSourceId ---
describe('buildSourceId', () => {
	it('utilise tel:id préfixé id: si présent (cas nominal API)', () => {
		expect(buildSourceId({ telId: 'cbcd31f79d0cfbd2', name: 'X', npa: '1200' })).toBe(
			'id:cbcd31f79d0cfbd2',
		);
	});

	it('rejette tel:id non-hex et fallback synthétique', () => {
		expect(buildSourceId({ telId: 'not-hex!', name: 'Vitrerie Dupont SA', npa: '1200' })).toBe(
			'vitrerie-dupont-sa|1200',
		);
	});

	it('telId null → fallback synthétique name+npa', () => {
		expect(buildSourceId({ telId: null, name: 'Vitrerie Dupont SA', npa: '1200' })).toBe(
			'vitrerie-dupont-sa|1200',
		);
	});

	it('telId absent (undefined) → fallback synthétique', () => {
		expect(buildSourceId({ name: 'Vitrerie Dupont SA', npa: '1200' })).toBe(
			'vitrerie-dupont-sa|1200',
		);
	});

	it('strip accents (fallback synthétique)', () => {
		expect(buildSourceId({ name: 'Façades Élégantes', npa: '1227' })).toBe(
			'facades-elegantes|1227',
		);
	});

	it('strip caractères non-ascii (fallback synthétique)', () => {
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

	it('même telId hex 8+ → même id (déterministe, name/npa ignorés)', () => {
		const a = buildSourceId({ telId: 'abc12345', name: 'X', npa: '1200' });
		const b = buildSourceId({ telId: 'abc12345', name: 'Z', npa: '9999' });
		// même telId = même source_id, même si name/npa diffèrent (UID search.ch fait foi)
		expect(a).toBe(b);
		expect(a).toBe('id:abc12345');
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
	it('détecte vitrerie via name', () => {
		expect(detectSecteurFromEntry({ name: 'Vitrerie Dupont', occupation: null }, 'filmpro')).toBe('menuiserie');
	});

	it('détecte vitrerie via occupation', () => {
		expect(detectSecteurFromEntry({ name: 'X', occupation: 'Vitrerie - Miroiterie' }, 'filmpro')).toBe('menuiserie');
	});

	it('détecte vitrerie via tel:category multiple', () => {
		expect(
			detectSecteurFromEntry({
				name: 'AA Artisans',
				occupation: null,
				categories: ['Dépannage', 'Vitrerie', 'Serrurerie'],
			}, 'filmpro'),
		).toBe('menuiserie');
	});

	it('détecte construction', () => {
		expect(detectSecteurFromEntry({ name: 'Bau AG', occupation: null }, 'filmpro')).toBe('construction');
	});

	it('détecte architecte', () => {
		expect(detectSecteurFromEntry({ name: 'Bureau d\'architectes Smith', occupation: null }, 'filmpro')).toBe('architecture');
	});

	it('insensible aux accents', () => {
		expect(detectSecteurFromEntry({ name: 'RÉNOVATION SA', occupation: null }, 'filmpro')).toBe('renovation');
	});

	it('catégories vides → fallback name/occupation', () => {
		expect(
			detectSecteurFromEntry({ name: 'Vitrerie X', occupation: null, categories: [] }, 'filmpro'),
		).toBe('menuiserie');
	});

	it('inconnu → null', () => {
		expect(detectSecteurFromEntry({ name: 'Coiffure Léa', occupation: null, categories: [] }, 'filmpro')).toBeNull();
	});
});

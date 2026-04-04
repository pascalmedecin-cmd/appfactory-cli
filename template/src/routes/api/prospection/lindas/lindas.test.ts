import { describe, it, expect } from 'vitest';
import { sanitizeSparql, buildSparqlQuery } from './sparql';

describe('sanitizeSparql', () => {
	it('supprime les guillemets et backslashes', () => {
		expect(sanitizeSparql('test"value\\other')).toBe('testvalueother');
	});

	it('supprime les accolades et parentheses', () => {
		expect(sanitizeSparql('hello{world}(foo)')).toBe('helloworldfoo');
	});

	it('tronque a 50 caracteres', () => {
		const long = 'a'.repeat(100);
		expect(sanitizeSparql(long)).toHaveLength(50);
	});

	it('trim les espaces', () => {
		expect(sanitizeSparql('  hello  ')).toBe('hello');
	});

	it('retourne vide pour une chaine de caracteres speciaux', () => {
		expect(sanitizeSparql('"{}\\"()')).toBe('');
	});
});

describe('buildSparqlQuery', () => {
	it('genere une requete SPARQL sans keywords', () => {
		const query = buildSparqlQuery('25', [], 100);
		expect(query).toContain('LIMIT 100');
		expect(query).toContain('admin:ZefixOrganisation');
		expect(query).toContain('"GE"'); // canton region for ID 25
		// Pas de FILTER keyword (le CONTAINS statique sur UID est dans l'OPTIONAL)
		expect(query).not.toContain('CONTAINS(LCASE(?description)');
	});

	it('genere une requete SPARQL avec keywords', () => {
		const query = buildSparqlQuery('25', ['construction', 'renovation'], 50);
		expect(query).toContain('LIMIT 50');
		expect(query).toContain('CONTAINS(LCASE(?description), "construction")');
		expect(query).toContain('CONTAINS(LCASE(?name), "renovation")');
	});

	it('filtre les keywords vides apres sanitisation', () => {
		const query = buildSparqlQuery('22', ['""', 'valid'], 10);
		expect(query).toContain('CONTAINS(LCASE(?description), "valid")');
		// Le keyword '""' doit etre sanitise et filtre (vide apres suppression des guillemets)
		expect(query).not.toContain('CONTAINS(LCASE(?description), "")');
	});

	it('sanitise les keywords dangereux', () => {
		const query = buildSparqlQuery('25', ['test"injection'], 10);
		expect(query).toContain('"testinjection"');
		expect(query).not.toContain('"test"injection"');
	});
});

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { parseCsv, csvToObjects, stripBom, validateRows } from './csv-import';

describe('stripBom', () => {
	it('retire le BOM UTF-8', () => {
		expect(stripBom('\ufeffhello')).toBe('hello');
	});

	it('pas de BOM → inchangé', () => {
		expect(stripBom('hello')).toBe('hello');
	});
});

describe('parseCsv', () => {
	it('parse CSV basique', () => {
		const input = 'a,b,c\r\n1,2,3\r\n4,5,6';
		expect(parseCsv(input)).toEqual([
			['a', 'b', 'c'],
			['1', '2', '3'],
			['4', '5', '6']
		]);
	});

	it('gère séparateur LF seul (pas CRLF)', () => {
		expect(parseCsv('a,b\n1,2\n3,4')).toEqual([
			['a', 'b'],
			['1', '2'],
			['3', '4']
		]);
	});

	it('cellule vide préservée', () => {
		expect(parseCsv('a,,c\n1,,3')).toEqual([
			['a', '', 'c'],
			['1', '', '3']
		]);
	});

	it('quote simple avec virgule intégrée', () => {
		expect(parseCsv('a,"b,c",d')).toEqual([['a', 'b,c', 'd']]);
	});

	it('guillemet doublé dans quote', () => {
		expect(parseCsv('a,"il dit ""hello""",c')).toEqual([['a', 'il dit "hello"', 'c']]);
	});

	it('LF intégré dans cellule quotée', () => {
		expect(parseCsv('a,"line1\nline2",c')).toEqual([['a', 'line1\nline2', 'c']]);
	});

	it('BOM retiré automatiquement', () => {
		expect(parseCsv('\ufeffa,b\n1,2')).toEqual([
			['a', 'b'],
			['1', '2']
		]);
	});

	it('input vide → array vide', () => {
		expect(parseCsv('')).toEqual([]);
	});

	it('trailing newline ne crée pas ligne vide', () => {
		expect(parseCsv('a,b\n1,2\n')).toEqual([
			['a', 'b'],
			['1', '2']
		]);
	});
});

describe('csvToObjects', () => {
	it('headers → clés des objets', () => {
		const rows = [
			['Nom', 'Email'],
			['Alice', 'a@b.c'],
			['Bob', 'b@c.d']
		];
		expect(csvToObjects(rows)).toEqual([
			{ nom: 'Alice', email: 'a@b.c' },
			{ nom: 'Bob', email: 'b@c.d' }
		]);
	});

	it('normalise headers : lowercase + espaces → _', () => {
		const rows = [
			['Raison Sociale', 'Canton'],
			['ACME SA', 'VD']
		];
		expect(csvToObjects(rows)).toEqual([{ raison_sociale: 'ACME SA', canton: 'VD' }]);
	});

	it('trim des valeurs', () => {
		const rows = [
			['a', 'b'],
			[' foo ', ' bar ']
		];
		expect(csvToObjects(rows)).toEqual([{ a: 'foo', b: 'bar' }]);
	});

	it('< 2 lignes → tableau vide (pas de data)', () => {
		expect(csvToObjects([])).toEqual([]);
		expect(csvToObjects([['a', 'b']])).toEqual([]);
	});

	it('cellule manquante → chaîne vide', () => {
		const rows = [
			['a', 'b', 'c'],
			['1', '2'] // c manquante
		];
		expect(csvToObjects(rows)).toEqual([{ a: '1', b: '2', c: '' }]);
	});
});

describe('validateRows', () => {
	const schema = z.object({
		nom: z.string().min(1),
		age: z.coerce.number().min(0)
	});

	it('retourne ok + errors séparés', () => {
		const rows = [
			{ nom: 'Alice', age: '30' },
			{ nom: '', age: '25' }, // nom trop court
			{ nom: 'Bob', age: '-5' } // age négatif
		];
		const r = validateRows(rows, schema);
		expect(r.total).toBe(3);
		expect(r.ok).toHaveLength(1);
		expect(r.errors).toHaveLength(2);
	});

	it('ligne number = index + 2 (header = 1)', () => {
		const rows = [{ nom: '', age: '0' }];
		const r = validateRows(rows, schema);
		expect(r.errors[0].line).toBe(2);
	});

	it('errors.errors contient chemin + message Zod', () => {
		const rows = [{ nom: '', age: '30' }];
		const r = validateRows(rows, schema);
		expect(r.errors[0].errors[0]).toContain('nom');
	});

	it('rows vides → résultat vide', () => {
		const r = validateRows([], schema);
		expect(r.total).toBe(0);
		expect(r.ok).toEqual([]);
		expect(r.errors).toEqual([]);
	});
});

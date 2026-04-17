import { describe, it, expect } from 'vitest';
import { toCsv, csvFilename, escapeCell } from './csv-export';

describe('escapeCell', () => {
	it('null / undefined → string vide', () => {
		expect(escapeCell(null)).toBe('');
		expect(escapeCell(undefined)).toBe('');
	});

	it('valeur simple sans caractère spécial → inchangée', () => {
		expect(escapeCell('Paris')).toBe('Paris');
		expect(escapeCell(42)).toBe('42');
	});

	it('virgule → quote entière', () => {
		expect(escapeCell('Paris, France')).toBe('"Paris, France"');
	});

	it('guillemet → double + quote', () => {
		expect(escapeCell('Il a dit "bonjour"')).toBe('"Il a dit ""bonjour"""');
	});

	it('LF → quote', () => {
		expect(escapeCell('ligne1\nligne2')).toBe('"ligne1\nligne2"');
	});

	it('CR → quote', () => {
		expect(escapeCell('ligne1\rligne2')).toBe('"ligne1\rligne2"');
	});

	it('accents français conservés', () => {
		expect(escapeCell('Crédit Suisse')).toBe('Crédit Suisse');
	});
});

describe('toCsv', () => {
	interface Row extends Record<string, unknown> {
		id: string;
		nom: string;
		age: number;
	}

	it('header + rows basiques', () => {
		const rows: Row[] = [
			{ id: '1', nom: 'Alice', age: 30 },
			{ id: '2', nom: 'Bob', age: 25 }
		];
		const csv = toCsv(rows, [
			{ key: 'id', label: 'ID' },
			{ key: 'nom', label: 'Nom' },
			{ key: 'age', label: 'Âge' }
		]);
		expect(csv).toBe('ID,Nom,Âge\r\n1,Alice,30\r\n2,Bob,25');
	});

	it('rows vides → header seul', () => {
		const csv = toCsv([], [{ key: 'id' as keyof Row, label: 'ID' }]);
		expect(csv).toBe('ID');
	});

	it('applique transform sur une colonne', () => {
		const rows: Row[] = [{ id: '1', nom: 'Alice', age: 30 }];
		const csv = toCsv(rows, [
			{ key: 'nom', label: 'Nom' },
			{
				key: 'age',
				label: 'Âge formaté',
				transform: (v) => `${v} ans`
			}
		]);
		expect(csv).toBe('Nom,Âge formaté\r\nAlice,30 ans');
	});

	it('gère cellules null/undefined correctement', () => {
		const rows: Record<string, unknown>[] = [{ a: null, b: undefined, c: 'x' }];
		const csv = toCsv(rows, [
			{ key: 'a', label: 'A' },
			{ key: 'b', label: 'B' },
			{ key: 'c', label: 'C' }
		]);
		expect(csv).toBe('A,B,C\r\n,,x');
	});

	it('quote les cellules avec séparateur', () => {
		const rows: Record<string, unknown>[] = [{ text: 'a,b,c' }];
		const csv = toCsv(rows, [{ key: 'text', label: 'Text' }]);
		expect(csv).toBe('Text\r\n"a,b,c"');
	});

	it('escape des guillemets dans le header', () => {
		const csv = toCsv([], [{ key: 'x' as keyof Record<string, unknown>, label: 'Col "avec" quotes' }]);
		expect(csv).toBe('"Col ""avec"" quotes"');
	});

	it('multi-ligne CRLF cohérent', () => {
		const rows: Record<string, unknown>[] = [{ x: 'a' }, { x: 'b' }, { x: 'c' }];
		const csv = toCsv(rows, [{ key: 'x', label: 'X' }]);
		expect(csv.split('\r\n')).toEqual(['X', 'a', 'b', 'c']);
	});
});

describe('csvFilename', () => {
	it('format entity-YYYY-MM-DD.csv', () => {
		const now = new Date('2026-04-17T12:00:00Z');
		expect(csvFilename('contacts', now)).toBe('contacts-2026-04-17.csv');
	});

	it('différentes entities', () => {
		const now = new Date('2026-01-05T00:00:00Z');
		expect(csvFilename('leads', now)).toBe('leads-2026-01-05.csv');
		expect(csvFilename('entreprises', now)).toBe('entreprises-2026-01-05.csv');
	});
});

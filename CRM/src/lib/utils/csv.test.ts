import { describe, it, expect } from 'vitest';
import { parseCsv, csvToObjects, detectDelimiter, stripBom, decodeCsvBytes } from './csv';

describe('detectDelimiter', () => {
	it('détecte la virgule (défaut)', () => {
		expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',');
	});
	it('détecte le point-virgule (export européen)', () => {
		expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
	});
	it('détecte la tabulation (copier-coller tableur)', () => {
		expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
	});
	it('ignore les délimiteurs dans un champ quoté de la 1re ligne', () => {
		// En-tête quoté « a,b » = 1 colonne ; le vrai séparateur est le ;
		expect(detectDelimiter('"a,b";c\n1;2')).toBe(';');
	});
	it('égalité / aucune → virgule', () => {
		expect(detectDelimiter('abc')).toBe(',');
	});
	it('gère le BOM', () => {
		expect(detectDelimiter('﻿a;b\n1;2')).toBe(';');
	});
});

describe('parseCsv', () => {
	it('parse un CSV virgule avec guillemets doublés', () => {
		expect(parseCsv('nom,ville\n"Naef, Cie",Genève')).toEqual([
			['nom', 'ville'],
			['Naef, Cie', 'Genève'],
		]);
	});
	it('parse un CSV point-virgule (auto-détecté)', () => {
		expect(parseCsv('nom;npa\nRégie;1204')).toEqual([
			['nom', 'npa'],
			['Régie', '1204'],
		]);
	});
	it('parse un TSV (auto-détecté)', () => {
		expect(parseCsv('nom\tnpa\nX\t1000')).toEqual([
			['nom', 'npa'],
			['X', '1000'],
		]);
	});
	it('gère les sauts de ligne intégrés dans un champ quoté', () => {
		expect(parseCsv('a,b\n"li1\nli2",x')).toEqual([
			['a', 'b'],
			['li1\nli2', 'x'],
		]);
	});
	it('gère CRLF', () => {
		expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
			['a', 'b'],
			['1', '2'],
		]);
	});
	it('délimiteur explicite ignore l’auto-détection', () => {
		// Forcer virgule sur une ligne qui contient des ; → 1 seule colonne
		expect(parseCsv('a;b\n1;2', ',')).toEqual([['a;b'], ['1;2']]);
	});
});

describe('stripBom', () => {
	it('retire le BOM UTF-8', () => {
		expect(stripBom('﻿hello')).toBe('hello');
	});
	it('laisse une chaîne sans BOM', () => {
		expect(stripBom('hello')).toBe('hello');
	});
});

describe('csvToObjects', () => {
	it('normalise les clés et trim les valeurs', () => {
		expect(csvToObjects([['Nom ', 'Code Postal'], [' Naef ', '1204']])).toEqual([
			{ nom: 'Naef', code_postal: '1204' },
		]);
	});
	it('renvoie [] si < 2 lignes', () => {
		expect(csvToObjects([['a', 'b']])).toEqual([]);
	});
});

describe('decodeCsvBytes (encodage réel du fichier)', () => {
	const bytes = (arr: number[]) => new Uint8Array(arr).buffer;
	it('décode un CSV UTF-8 (accents corrects)', () => {
		// « Genève » en UTF-8 : è = C3 A8
		expect(decodeCsvBytes(bytes([0x47, 0x65, 0x6e, 0xc3, 0xa8, 0x76, 0x65]))).toBe('Genève');
	});
	it('décode un CSV Windows-1252/Latin-1 (Excel FR) sans casser les accents', () => {
		// « Genève » en Windows-1252 : è = E8 (octet isolé invalide en UTF-8 → repli 1252, pas de �)
		expect(decodeCsvBytes(bytes([0x47, 0x65, 0x6e, 0xe8, 0x76, 0x65]))).toBe('Genève');
	});
	it('gère é (E9), ç (E7) en Latin-1', () => {
		expect(decodeCsvBytes(bytes([0x52, 0xe9, 0x67, 0x69, 0x65]))).toBe('Régie');
		expect(decodeCsvBytes(bytes([0x46, 0x61, 0xe7, 0x6f, 0x6e]))).toBe('Façon');
	});
});

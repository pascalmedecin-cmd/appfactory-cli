import { describe, it, expect } from 'vitest';
import { npaToCanton } from './npa-canton';

describe('npaToCanton - villes-ancres romandes', () => {
	const anchors: Array<[string, string]> = [
		['1204', 'GE'], // Genève
		['1227', 'GE'], // Carouge
		['1003', 'VD'], // Lausanne
		['1110', 'VD'], // Morges
		['1260', 'VD'], // Nyon
		['1400', 'VD'], // Yverdon-les-Bains
		['1800', 'VD'], // Vevey
		['1820', 'VD'], // Montreux
		['1860', 'VD'], // Aigle
		['1870', 'VS'], // Monthey
		['1920', 'VS'], // Martigny
		['1950', 'VS'], // Sion
		['3960', 'VS'], // Sierre
		['1700', 'FR'], // Fribourg
		['1630', 'FR'], // Bulle
		['2000', 'NE'], // Neuchâtel
		['2300', 'NE'], // La Chaux-de-Fonds
		['2400', 'NE'], // Le Locle
		['2800', 'JU'], // Delémont
		['2900', 'JU'], // Porrentruy
	];
	for (const [npa, canton] of anchors) {
		it(`${npa} → ${canton}`, () => {
			expect(npaToCanton(npa)).toBe(canton);
		});
	}
});

describe('npaToCanton - hors périmètre / dégénéré → null (défaut sûr)', () => {
	it('Zürich (8000) → null', () => expect(npaToCanton('8000')).toBeNull());
	it('Berne (3000) → null', () => expect(npaToCanton('3000')).toBeNull());
	it('Bienne (2500, BE) → null', () => expect(npaToCanton('2500')).toBeNull());
	it('vide → null', () => expect(npaToCanton('')).toBeNull());
	it('null → null', () => expect(npaToCanton(null)).toBeNull());
	it('non numérique → null', () => expect(npaToCanton('abc')).toBeNull());
	it('3 chiffres → null', () => expect(npaToCanton('120')).toBeNull());
});

describe('npaToCanton - tolérant au format', () => {
	it('extrait les 4 chiffres d’une chaîne bruitée', () => {
		expect(npaToCanton('CH-1204 Genève')).toBe('GE');
	});
	it('accepte un nombre', () => {
		expect(npaToCanton(1700)).toBe('FR');
	});
});

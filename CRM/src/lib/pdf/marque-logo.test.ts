import { describe, it, expect } from 'vitest';
import { filmproLogoSvg } from './filmpro-logo';
import { ledstudioLogoSvg, ledstudioLogoWidth } from './ledstudio-logo';
import { marqueLogoSvg } from './marque-logo';

describe('ledstudioLogoSvg (fragment PDF LED verbatim)', () => {
	it('émet un groupe positionné à (x, y) et échelle h / viewBox(191)', () => {
		const svg = ledstudioLogoSvg(34, 34, 18);
		expect(svg.startsWith('<g transform="translate(34 34) scale(')).toBe(true);
		// k = 18 / 191 = 0.0942 (4 décimales)
		expect(svg).toContain('scale(0.0942)');
	});

	it('échelle = 1 quand h == hauteur du viewBox', () => {
		expect(ledstudioLogoSvg(0, 0, 191)).toContain('scale(1)');
	});

	it('applique la couleur de marque magenta au cadre (stroke) ET aux glyphes (fill)', () => {
		const svg = ledstudioLogoSvg(34, 34, 18);
		expect(svg).toContain('stroke="#FF05A8"');
		expect(svg).toContain('<g fill="#FF05A8">');
	});

	it('tracés verbatim de l’asset (cadre arrondi + « L » + wordmark)', () => {
		const svg = ledstudioLogoSvg(34, 34, 18);
		expect(svg).toContain('rx="30" ry="30"');
		expect(svg).toContain('M233 132H457V0H62V702H233Z'); // glyphe « L »
	});

	it('couleur paramétrable (rendu monochrome, pas de magenta résiduel)', () => {
		const svg = ledstudioLogoSvg(0, 0, 18, '#00003B');
		expect(svg).toContain('stroke="#00003B"');
		expect(svg).toContain('<g fill="#00003B">');
		expect(svg).not.toContain('#FF05A8');
	});

	it('fragment structurellement équilibré (9 tracés « LED studio », 1 cadre, groupes fermés)', () => {
		const frag = ledstudioLogoSvg(34, 34, 18);
		expect((frag.match(/<path /g) ?? []).length).toBe(9);
		expect((frag.match(/<rect /g) ?? []).length).toBe(1);
		expect((frag.match(/<g\b/g) ?? []).length).toBe((frag.match(/<\/g>/g) ?? []).length);
	});

	it('largeur rendue = ratio de l’asset (895:191)', () => {
		expect(ledstudioLogoWidth(191)).toBeCloseTo(895, 6);
		expect(ledstudioLogoWidth(18)).toBeCloseTo((895 / 191) * 18, 6);
	});
});

describe('marqueLogoSvg (dispatcher de logo par marque)', () => {
	it('filmpro = byte-identique à filmproLogoSvg (non-régression PDF FilmPro)', () => {
		expect(marqueLogoSvg('filmpro', 34, 34, 18, '#00003B')).toBe(
			filmproLogoSvg(34, 34, 18, '#00003B')
		);
	});

	it('led = fragment LED magenta, ignore la couleur monochrome du document', () => {
		const svg = marqueLogoSvg('led', 34, 34, 18, '#00003B');
		expect(svg).toBe(ledstudioLogoSvg(34, 34, 18));
		expect(svg).toContain('#FF05A8');
		expect(svg).not.toContain('#00003B');
	});
});

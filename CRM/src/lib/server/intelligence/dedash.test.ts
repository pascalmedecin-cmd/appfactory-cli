import { describe, it, expect } from 'vitest';
import { dedashText, dedashItem, dedashReport } from './dedash';

describe('dedashText', () => {
	it('remplace le cadratin espacé par un tiret court espacé', () => {
		expect(dedashText('décret n° 2026-16) — signal miroir')).toBe(
			'décret n° 2026-16) - signal miroir'
		);
	});

	it('remplace le cadratin collé par un tiret court espacé', () => {
		expect(dedashText('confort d’été—tertiaire')).toBe('confort d’été - tertiaire');
	});

	it('gère la barre horizontale (U+2015) et le figure dash (U+2012)', () => {
		expect(dedashText('A ― B')).toBe('A - B');
		expect(dedashText('A ‒ B')).toBe('A - B');
	});

	it('resserre une plage numérique en-dash en hyphen collé', () => {
		expect(dedashText('2020–2025')).toBe('2020-2025');
		expect(dedashText('+6,39 % sur 2020 – 2025')).toBe('+6,39 % sur 2020-2025');
	});

	it('resserre une plage numérique cadratin en hyphen collé', () => {
		expect(dedashText('pages 10—12')).toBe('pages 10-12');
	});

	it('traite un en-dash de prose comme un tiret court espacé', () => {
		expect(dedashText('films solaires – la demande monte')).toBe(
			'films solaires - la demande monte'
		);
	});

	it('ne touche jamais le hyphen-minus normal', () => {
		expect(dedashText('Saint-Gobain COOL-LITE SKN 155')).toBe('Saint-Gobain COOL-LITE SKN 155');
	});

	it('ne laisse pas d’espace parasite en début/fin de chaîne', () => {
		expect(dedashText('— ouverture')).toBe('- ouverture');
		expect(dedashText('clôture —')).toBe('clôture -');
	});

	it('ne laisse pas d’espace parasite en début/fin de ligne', () => {
		expect(dedashText('ligne 1\n— ligne 2')).toBe('ligne 1\n- ligne 2');
	});

	it('collapse les espaces horizontaux introduits sans toucher aux newlines', () => {
		expect(dedashText('A  —  B')).toBe('A - B');
		expect(dedashText('para 1\n\npara 2')).toBe('para 1\n\npara 2');
	});

	it('est idempotent', () => {
		const once = dedashText('A — B et 2020–2025');
		expect(dedashText(once)).toBe(once);
	});

	it('passe null / undefined / chaîne vide tels quels', () => {
		expect(dedashText(null)).toBeNull();
		expect(dedashText(undefined)).toBeUndefined();
		expect(dedashText('')).toBe('');
	});

	it('ne fabrique aucun chiffre ni n’altère un fait (zéro-hallu : substitution typographique seule)', () => {
		// Le « 37°C » et « 28°C » restent intacts ; seul le cadratin change.
		expect(dedashText('jusqu’à 37°C — mesures dès 28°C')).toBe('jusqu’à 37°C - mesures dès 28°C');
	});
});

describe('dedashItem', () => {
	it('nettoie title, summary, filmpro_relevance, deep_dive et source.name', () => {
		const item = {
			title: 'Canicule — bureaux',
			summary: 'mesures dès 28°C — Suva',
			filmpro_relevance: 'opportunité tertiaire — régies VD',
			deep_dive: 'analyse — détails',
			source: { name: 'RTS — Info', url: 'https://rts.ch/x', published_at: '2026-06-18' }
		};
		const out = dedashItem(item);
		expect(out.title).toBe('Canicule - bureaux');
		expect(out.summary).toBe('mesures dès 28°C - Suva');
		expect(out.filmpro_relevance).toBe('opportunité tertiaire - régies VD');
		expect(out.deep_dive).toBe('analyse - détails');
		expect(out.source.name).toBe('RTS - Info');
		// URL jamais touchée.
		expect(out.source.url).toBe('https://rts.ch/x');
	});

	it('tolère deep_dive null', () => {
		const out = dedashItem({
			title: 'X',
			summary: 'Y',
			filmpro_relevance: 'Z',
			deep_dive: null,
			source: { name: 'N', url: 'u', published_at: 'd' }
		});
		expect(out.deep_dive).toBeNull();
	});
});

describe('dedashReport', () => {
	it('nettoie executive_summary, tous les items et impacts_filmpro[].note', () => {
		const report = {
			meta: { executive_summary: 'Semaine W25 — canicule' },
			items: [
				{
					title: 'A — B',
					summary: 's — t',
					filmpro_relevance: 'r — w',
					deep_dive: null,
					source: { name: 'src — x', url: 'u', published_at: 'd' }
				}
			],
			impacts_filmpro: [{ note: 'impact — direct' }]
		};
		const out = dedashReport(report);
		expect(out.meta.executive_summary).toBe('Semaine W25 - canicule');
		expect(out.items[0].title).toBe('A - B');
		expect(out.items[0].source.name).toBe('src - x');
		expect(out.impacts_filmpro[0].note).toBe('impact - direct');
	});

	it('tolère impacts_filmpro absent ou note manquante', () => {
		const out = dedashReport({
			meta: { executive_summary: 'ok' },
			items: [],
			impacts_filmpro: undefined
		});
		expect(out.impacts_filmpro).toBeUndefined();
	});
});

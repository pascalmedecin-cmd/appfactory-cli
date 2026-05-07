import { describe, it, expect } from 'vitest';
import { inferSegmentFromText } from './segment-mapper';

describe('inferSegmentFromText', () => {
	it('retourne null sur input vide', () => {
		expect(inferSegmentFromText('')).toBeNull();
		expect(inferSegmentFromText('', '')).toBeNull();
	});

	it('match controle-solaire sur titre "film solaire"', () => {
		expect(inferSegmentFromText('Film solaire vs remplacement fenêtres ROI')).toBe('controle-solaire');
	});

	it('match securite sur "anti-vol" + "intrusion"', () => {
		expect(inferSegmentFromText('Films anti-vol contre intrusion résidentielle')).toBe('securite');
	});

	it('match discretion sur "frosted glass" / "vis-à-vis"', () => {
		expect(inferSegmentFromText('Frosted privacy film for offices', 'élimine vis-à-vis')).toBe(
			'discretion'
		);
	});

	it('match facade sur "façade immeuble"', () => {
		expect(inferSegmentFromText('Rénovation façade immeuble bureaux')).toBe('facade');
	});

	it('insensible aux accents et casse', () => {
		expect(inferSegmentFromText('SÉCURITÉ vitrage banque', '')).toBe('securite');
		expect(inferSegmentFromText('securite vitrage banque', '')).toBe('securite');
		expect(inferSegmentFromText('Sécurité Vitrage Banque', '')).toBe('securite');
	});

	it('ignore les keywords non-word-boundary (ex: "uv" dans "vue")', () => {
		// "vue panoramique" ne doit PAS matcher controle-solaire (contient 'uv' substring)
		expect(inferSegmentFromText('Belle vue panoramique sur le lac')).toBeNull();
	});

	it('match controle-solaire sur "UV" mot isolé', () => {
		expect(inferSegmentFromText('Protection UV vitrage hôpital')).toBe('controle-solaire');
	});

	it('priorité au segment avec le plus de matches', () => {
		// 1 match "façade" vs 2 matches confort-thermique → confort-thermique gagne
		const seg = inferSegmentFromText(
			'Rénovation façade : isolation thermique et économies énergie'
		);
		expect(seg).toBe('confort-thermique');
	});

	it('combine titre et summary', () => {
		expect(inferSegmentFromText('Nouveau projet', 'salle de réunion confidentialité RGPD')).toBe(
			'confidentialite'
		);
	});

	it('retourne null si aucun keyword ne match', () => {
		expect(inferSegmentFromText('Compte rendu général semaine 16')).toBeNull();
	});

	it('match pourquoi-filmpro sur ROI / amortissement', () => {
		expect(inferSegmentFromText('Films solaires : ROI 3 ans avec amortissement rapide')).toBe(
			// "film solaires" + "ROI" + "amortissement" : controle-solaire 1, pourquoi-filmpro 2
			'pourquoi-filmpro'
		);
	});
});

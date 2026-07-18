import { describe, it, expect } from 'vitest';
import { prospectionCopies, PROSPECTION_COPIES } from './prospection-copies';

describe('prospection-copies marque-aware (#4/#6)', () => {
	it('FilmPro = byte-identique aux chaînes existantes (non-régression stricte)', () => {
		const c = prospectionCopies('filmpro');
		expect(c.searchchPlaceholder).toBe('vitrerie, façade, régie…');
		expect(c.searchchGenericExemples).toBe('vitrerie, façade…');
		expect(c.gpKeywordPlaceholder).toBe('ex : ventilation…');
		expect(c.gpKeywordPlaceholderLibre).toBe('ex : agencement magasins');
		expect(c.importRegistreHelperExemples).toBe('vitrerie, façade, architecte');
		expect(c.importRegistrePlaceholder).toBe('vitrerie, façade, architecte, construction…');
		expect(c.importAnnuairePlaceholder).toBe('vitrerie, façade, miroiterie, store…');
		expect(c.importAnnuaireGenericExemples).toBe('vitrerie, façade, architecte, …');
		expect(c.importGpKeywordPlaceholder).toBe('ex: ventilation, charpente métallique…');
		expect(c.importGpKeywordPlaceholderLibre).toBe('ex: agencement de magasins');
	});

	it('le helper Zefix reconstruit FilmPro reste identique à l’original', () => {
		// Miroir de la reconstruction dans ImportModal.svelte (activeHelper).
		const c = prospectionCopies('filmpro');
		const helper = `Mieux vaut 50 prospects ciblés que 500 à trier - filtrez sur un terme précis (${c.importRegistreHelperExemples}).`;
		expect(helper).toBe('Mieux vaut 50 prospects ciblés que 500 à trier - filtrez sur un terme précis (vitrerie, façade, architecte).');
	});

	it('LED = exemples métier LED, aucun terme vitrage', () => {
		const c = prospectionCopies('led');
		for (const v of Object.values(c)) {
			expect(v.toLowerCase()).not.toContain('vitrerie');
			expect(v.toLowerCase()).not.toContain('façade');
		}
		expect(c.searchchPlaceholder).toBe('signalétique, stand, enseigne…');
		expect(c.importRegistrePlaceholder).toContain('événementiel');
	});

	it('les 2 marques ont exactement les mêmes clés', () => {
		expect(Object.keys(PROSPECTION_COPIES.filmpro).sort()).toEqual(Object.keys(PROSPECTION_COPIES.led).sort());
	});

	it('défaut sûr : marque inconnue → FilmPro', () => {
		// @ts-expect-error test du repli runtime
		expect(prospectionCopies('xxx')).toBe(PROSPECTION_COPIES.filmpro);
	});
});

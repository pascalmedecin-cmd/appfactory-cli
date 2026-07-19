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
		// WP-C : 6 clés ajoutées, FilmPro verbatim des littéraux d'origine.
		expect(c.expressRaisonPlaceholder).toBe('Ex : Vitrerie Dupond Sàrl');
		expect(c.expressNotePlaceholder).toBe('Ex : RDV 5 mai vitrage SE');
		expect(c.pipelineActionPlaceholder).toBe('Ex : Envoi devis film solaire 80m²');
		expect(c.photoEmptyHint).toBe('Aucune photo. Ajoute une vue façade ou vitrage pour étoffer le dossier.');
		expect(c.importTemplateExampleRow).toBe(
			'Miroiterie Cornavin Sàrl,Rue de Cornavin 5,1201,Genève,+41 22 000 00 00,Vitrerie,https://exemple.ch,contact@exemple.ch'
		);
		// Helper Google : byte-identique à la source ImportModal (mêmes escapes ’/ /€).
		expect(c.importGpHelper).toBe(
			'Ideal pour reperer regies, entreprises generales et corps d’etat dans un canton. Cout : 0 € jusqu’a 900 recherches/mois.'
		);
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
		// WP-C : libellés LED validés Pascal 2026-07-18 (maquette Chrome).
		expect(c.expressRaisonPlaceholder).toBe('Ex : Enseignes Dupond Sàrl');
		expect(c.expressNotePlaceholder).toBe('Ex : RDV 5 mai pose enseigne');
		expect(c.pipelineActionPlaceholder).toBe('Ex : Envoi devis enseigne lumineuse');
		expect(c.photoEmptyHint).toContain('enseigne');
		expect(c.photoEmptyHint).toContain('stand');
		expect(c.importTemplateExampleRow).toContain('Signalétique');
		expect(c.importGpHelper).toContain('exploitants de salles');
		expect(c.importGpHelper).toContain('agences événementielles');
	});

	it('les 2 marques ont exactement les mêmes clés', () => {
		expect(Object.keys(PROSPECTION_COPIES.filmpro).sort()).toEqual(Object.keys(PROSPECTION_COPIES.led).sort());
	});

	it('défaut sûr : marque inconnue → FilmPro', () => {
		// @ts-expect-error test du repli runtime
		expect(prospectionCopies('xxx')).toBe(PROSPECTION_COPIES.filmpro);
	});
});

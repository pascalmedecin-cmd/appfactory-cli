import { describe, it, expect } from 'vitest';
import { scoreLabel, scoreIcon, scoreToCategory, formatLeadContext } from './prospection-utils';

describe('scoreLabel : tags métier Phase 0', () => {
	it('Prioritaire pour score >= 7', () => {
		expect(scoreLabel(7)).toBe('Prioritaire');
		expect(scoreLabel(9)).toBe('Prioritaire');
		expect(scoreLabel(12)).toBe('Prioritaire');
	});
	it('À qualifier pour score 4-6', () => {
		expect(scoreLabel(4)).toBe('À qualifier');
		expect(scoreLabel(5)).toBe('À qualifier');
		expect(scoreLabel(6)).toBe('À qualifier');
	});
	it('Faible signal pour score < 4', () => {
		expect(scoreLabel(0)).toBe('Faible signal');
		expect(scoreLabel(3)).toBe('Faible signal');
	});
});

describe('scoreIcon : glyphes Lucide associés', () => {
	it('flame pour Prioritaire', () => {
		expect(scoreIcon(9)).toBe('flame');
		expect(scoreIcon(7)).toBe('flame');
	});
	it('target pour À qualifier', () => {
		expect(scoreIcon(6)).toBe('target');
		expect(scoreIcon(4)).toBe('target');
	});
	it('eye pour Faible signal', () => {
		expect(scoreIcon(3)).toBe('eye');
		expect(scoreIcon(0)).toBe('eye');
	});
});

describe('scoreToCategory cohérent avec scoreLabel', () => {
	it('chaud / tiede / froid', () => {
		expect(scoreToCategory(9)).toBe('chaud');
		expect(scoreToCategory(5)).toBe('tiede');
		expect(scoreToCategory(2)).toBe('froid');
	});
});

describe('formatLeadContext : phrase courte par source (Phase 1 queue triage)', () => {
	it('SIMAP avec montant + date', () => {
		const ctx = formatLeadContext({
			source: 'simap',
			montant: 487200,
			date_publication: '2026-04-15',
		});
		expect(ctx).toContain('Marché public');
		expect(ctx).toContain('487 k CHF');
	});

	it('SIMAP sans montant → fallback "n/d"', () => {
		const ctx = formatLeadContext({ source: 'simap', montant: null });
		expect(ctx).toContain('montant n/d');
	});

	it('RegBL utilise adresse en priorité', () => {
		expect(formatLeadContext({ source: 'regbl', adresse: '12 rue Bovy', localite: 'Genève' })).toContain('12 rue Bovy');
	});

	it('RegBL fallback localité si pas adresse', () => {
		expect(formatLeadContext({ source: 'regbl', localite: 'Carouge' })).toContain('Carouge');
	});

	it('Zefix utilise ancienneté en jours si récente', () => {
		const recent = new Date(Date.now() - 12 * 86_400_000).toISOString();
		const ctx = formatLeadContext({ source: 'zefix', date_publication: recent, canton: 'GE' });
		expect(ctx).toContain('Inscription RC');
		expect(ctx).toContain('12 j');
	});

	it('Zefix sans date → fallback générique', () => {
		const ctx = formatLeadContext({ source: 'zefix', canton: 'VD' });
		expect(ctx).toContain('Registre du commerce');
		expect(ctx).toContain('Vaud');
	});

	it('lead_express avec téléphone et note', () => {
		const ctx = formatLeadContext({
			source: 'lead_express',
			telephone: '022 731 88 41',
			description: 'à rappeler après confirmation budget juin',
		});
		expect(ctx).toContain('Saisie terrain');
		expect(ctx).toContain('022 731 88 41');
		expect(ctx).toContain('budget juin');
	});

	it('search_ch fallback canton', () => {
		expect(formatLeadContext({ source: 'search_ch', canton: 'GE' })).toContain('Annuaire');
	});

	it('source inconnue : libellé + canton', () => {
		const ctx = formatLeadContext({ source: 'inconnu', canton: 'JU' });
		expect(ctx).toContain('inconnu');
		expect(ctx).toContain('JU');
	});

	// Fallbacks robustesse (ajoutés post code-reviewer I7)
	it('SIMAP sans date_publication ni montant → double "n/d"', () => {
		const ctx = formatLeadContext({ source: 'simap' });
		expect(ctx).toContain('Marché public');
		expect(ctx).toContain('montant n/d');
		expect(ctx).toContain('date n/d');
	});

	it('RegBL sans adresse/localité/canton → fallback "Suisse romande"', () => {
		const ctx = formatLeadContext({ source: 'regbl' });
		expect(ctx).toContain('Permis');
		expect(ctx).toContain('Suisse romande');
	});

	it('SIMAP montant=0 (lot non valorisé SIMAP) → "n/d" pas "0 CHF"', () => {
		const ctx = formatLeadContext({ source: 'simap', montant: 0 });
		expect(ctx).toContain('montant n/d');
		expect(ctx).not.toContain('0 CHF');
	});

	it('lead_express description multi-ligne → squashed sans retour ligne', () => {
		const ctx = formatLeadContext({
			source: 'lead_express',
			description: 'à rappeler\nbudget juin\n0223110000',
		});
		expect(ctx).not.toContain('\n');
	});
});

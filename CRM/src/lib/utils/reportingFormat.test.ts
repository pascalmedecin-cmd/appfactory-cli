import { describe, it, expect } from 'vitest';
import {
	formatCHF,
	formatPercent,
	formatMonth,
	reportingIndicators,
	conversionVariant,
	exportEntries,
	reportingTabs,
	type ReportingTab,
	type ReportingData,
	type ExportEntry,
} from './reportingFormat';

describe('formatCHF', () => {
	it('formate 0 (suffixe CHF, locale fr-CH)', () => {
		const out = formatCHF(0);
		expect(out).toContain('CHF');
		expect(out.replace(/\D/g, '')).toBe('0');
	});
	it('formate 1234 (séparateur fr-CH)', () => {
		const out = formatCHF(1234);
		expect(out).toContain('CHF');
		expect(out.replace(/\D/g, '')).toBe('1234');
	});
	it('formate 1234567 sans décimales', () => {
		const out = formatCHF(1234567);
		expect(out.replace(/\D/g, '')).toBe('1234567');
		expect(out).not.toMatch(/\.\d/);
	});
	it('formate négatif', () => {
		const out = formatCHF(-500);
		expect(out).toMatch(/-|−/);
		expect(out.replace(/[^\d]/g, '')).toBe('500');
	});
});

describe('formatPercent', () => {
	it('formate 0 → 0,0 %', () => {
		expect(formatPercent(0)).toBe('0,0 %');
	});
	it('formate 38.2 → 38,2 %', () => {
		expect(formatPercent(38.2)).toBe('38,2 %');
	});
	it('formate 100 → 100,0 %', () => {
		expect(formatPercent(100)).toBe('100,0 %');
	});
	it('formate décimale fr-CH virgule', () => {
		expect(formatPercent(12.5)).toContain(',');
		expect(formatPercent(12.5)).not.toContain('.');
	});
});

describe('formatMonth', () => {
	it('formate 2026-01 → Jan', () => {
		expect(formatMonth('2026-01')).toBe('Jan');
	});
	it('formate 2026-12 → Déc', () => {
		expect(formatMonth('2026-12')).toBe('Déc');
	});
	it('formate 2026-05 → Mai', () => {
		expect(formatMonth('2026-05')).toBe('Mai');
	});
	it('renvoie clé brute si format invalide', () => {
		expect(formatMonth('foo')).toBe('foo');
	});
});

const sampleData: ReportingData = {
	pipelineActifTotal: 1245000,
	conversion: { total_leads: 110, opportunites_depuis_lead: 42, taux_pct: 38.2 },
	activityContacts: { last_30_days: 23, last_90_days: 71, total: 412 },
	activityEntreprises: { last_30_days: 12, last_90_days: 38, total: 187 },
	activityOpportunites: { last_30_days: 11, last_90_days: 28, total: 142 },
};

describe('reportingIndicators', () => {
	it('retourne 4 indicateurs alignés avec les données', () => {
		const out = reportingIndicators(sampleData);
		expect(out.pipelineActifCHF).toBe(1245000);
		expect(out.conversionPct).toBe(38.2);
		expect(out.contacts30).toBe(23);
		expect(out.contacts90).toBe(71);
		expect(out.opportunites30).toBe(11);
		expect(out.opportunites90).toBe(28);
	});

	it('expose le ratio conversion lisible', () => {
		const out = reportingIndicators(sampleData);
		expect(out.conversionRatio).toEqual({ numerator: 42, denominator: 110 });
	});

	it('reste cohérent sur dataset vide', () => {
		const empty: ReportingData = {
			pipelineActifTotal: 0,
			conversion: { total_leads: 0, opportunites_depuis_lead: 0, taux_pct: 0 },
			activityContacts: { last_30_days: 0, last_90_days: 0, total: 0 },
			activityEntreprises: { last_30_days: 0, last_90_days: 0, total: 0 },
			activityOpportunites: { last_30_days: 0, last_90_days: 0, total: 0 },
		};
		const out = reportingIndicators(empty);
		expect(out.pipelineActifCHF).toBe(0);
		expect(out.conversionPct).toBe(0);
		expect(out.contacts30).toBe(0);
	});
});

describe('conversionVariant', () => {
	it('renvoie warning si conversion = 0 et leads > 0', () => {
		expect(conversionVariant(0, 50)).toBe('warning');
	});
	it('renvoie default si entre 1 et 29.99', () => {
		expect(conversionVariant(15, 50)).toBe('default');
		expect(conversionVariant(29.9, 50)).toBe('default');
	});
	it('renvoie success si >= 30', () => {
		expect(conversionVariant(30, 50)).toBe('success');
		expect(conversionVariant(75, 50)).toBe('success');
	});
	it('renvoie default si total leads = 0 (rien à juger)', () => {
		expect(conversionVariant(0, 0)).toBe('default');
	});
});

describe('exportEntries', () => {
	it('expose 3 cibles export avec href, label, count', () => {
		const out = exportEntries(sampleData);
		expect(out).toHaveLength(3);
		const keys = out.map((e: ExportEntry) => e.key);
		expect(keys).toContain('contacts');
		expect(keys).toContain('entreprises');
		expect(keys).toContain('leads');
	});

	it('contacts pointe vers /api/export/contacts avec total', () => {
		const out = exportEntries(sampleData);
		const c = out.find((e) => e.key === 'contacts');
		expect(c?.href).toBe('/api/export/contacts');
		expect(c?.total).toBe(412);
	});

	it('chaque entry expose icon Lucide-mapped', () => {
		const out = exportEntries(sampleData);
		for (const e of out) {
			expect(e.icon).toBeTruthy();
			expect(typeof e.icon).toBe('string');
		}
	});
});

describe('reportingTabs', () => {
	it('expose 4 onglets dans l ordre Synthèse / Pipeline / Activité / Export', () => {
		const tabs = reportingTabs();
		expect(tabs).toHaveLength(4);
		const keys = tabs.map((t) => t.key);
		expect(keys).toEqual(['synthese', 'pipeline', 'activite', 'export']);
	});
	it('Synthèse = défaut', () => {
		const tabs = reportingTabs();
		const def = tabs.find((t) => t.key === 'synthese');
		expect(def?.label).toBe('Synthèse');
	});
	it('chaque onglet expose un label affichable', () => {
		const tabs = reportingTabs();
		for (const t of tabs) {
			expect(t.label.length).toBeGreaterThan(2);
		}
	});
});

describe('type ReportingTab whitelist', () => {
	it('couvre les 4 valeurs', () => {
		const all: ReportingTab[] = ['synthese', 'pipeline', 'activite', 'export'];
		expect(all).toHaveLength(4);
	});
});

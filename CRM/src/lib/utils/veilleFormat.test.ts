import { describe, it, expect } from 'vitest';
import {
	ActionabilityEnum,
	SegmentEnum,
	GeoScopeEnum,
	MaturityEnum,
	ImpactAxisEnum,
	ChipKindEnum,
	ComplianceTagEnum
} from '$lib/server/intelligence/schema';
import {
	actionabilityLabel,
	segmentLabel,
	geoScopeLabel,
	geoScopeShortLabel,
	maturityLabel,
	impactAxisLabel,
	chipKindLabel,
	complianceTagLabel,
	humanizeSlug,
	themeLabel,
	themeLabelMap,
	actionabilityStyle,
	segmentStyle
} from './veilleFormat';

/**
 * Garde « zéro underscore user-facing » (commentaire Pascal W25 #1). Itère sur les
 * valeurs RÉELLES des enums du schema (.options), donc toute nouvelle valeur d'enum
 * ajoutée au schema sans libellé fera échouer ce test (totalité forcée).
 */
const CASES: Array<{ name: string; values: readonly string[]; fn: (v: string) => string }> = [
	{ name: 'actionability', values: ActionabilityEnum.options, fn: actionabilityLabel },
	{ name: 'segment', values: SegmentEnum.options, fn: segmentLabel },
	{ name: 'geo_scope', values: GeoScopeEnum.options, fn: geoScopeLabel },
	{ name: 'geo_scope (court)', values: GeoScopeEnum.options, fn: geoScopeShortLabel },
	{ name: 'maturity', values: MaturityEnum.options, fn: maturityLabel },
	{ name: 'impact axis', values: ImpactAxisEnum.options, fn: impactAxisLabel },
	{ name: 'chip kind', values: ChipKindEnum.options, fn: chipKindLabel },
	{ name: 'compliance_tag', values: ComplianceTagEnum.options, fn: complianceTagLabel }
];

describe('veilleFormat : libellés humains (0 underscore user-facing)', () => {
	for (const c of CASES) {
		it(`${c.name} : chaque valeur a un libellé non vide sans underscore`, () => {
			for (const v of c.values) {
				const label = c.fn(v);
				expect(label, `valeur ${v}`).toBeTruthy();
				expect(label, `valeur ${v} contient un underscore`).not.toMatch(/_/);
			}
		});
	}

	it('fallback : une valeur d enum inconnue est humanisée, jamais brute', () => {
		expect(actionabilityLabel('valeur_inconnue')).toBe('Valeur inconnue');
		expect(segmentLabel('niche_speciale')).toBe('Niche speciale');
		expect(impactAxisLabel('go_nogo')).toBe('Go / No-go'); // valeur connue avec underscore
	});

	it('valeurs nulles / vides : chaîne vide, jamais "undefined"', () => {
		expect(actionabilityLabel(null)).toBe('');
		expect(segmentLabel(undefined)).toBe('');
		expect(geoScopeLabel('')).toBe('');
	});
});

describe('humanizeSlug', () => {
	it('remplace les underscores et capitalise', () => {
		expect(humanizeSlug('smart_glass')).toBe('Smart glass');
		expect(humanizeSlug('discretion_smartfilm')).toBe('Discretion smartfilm');
	});
	it('vide / null -> chaîne vide', () => {
		expect(humanizeSlug('')).toBe('');
		expect(humanizeSlug(null)).toBe('');
	});
});

describe('themeLabel : slug DB éditable, jamais affiché brut', () => {
	const labels = themeLabelMap([
		{ slug: 'discretion_smartfilm', label: 'Discrétion / smart film' },
		{ slug: 'films_solaires', label: 'Films solaires' }
	]);

	it('utilise le label DB quand il existe', () => {
		expect(themeLabel('discretion_smartfilm', labels)).toBe('Discrétion / smart film');
	});

	it('humanise (jamais le slug brut) si le label DB manque', () => {
		// Cas exact du commentaire Pascal W25 : slug custom non couvert.
		const r = themeLabel('nouveau_theme_custom', labels);
		expect(r).not.toMatch(/_/);
		expect(r).toBe('Nouveau theme custom');
	});

	it('humanise aussi sans aucune map fournie', () => {
		expect(themeLabel('ia_outils')).toBe('Ia outils');
		expect(themeLabel('ia_outils')).not.toMatch(/_/);
	});

	it('slug vide -> chaîne vide', () => {
		expect(themeLabel('', labels)).toBe('');
		expect(themeLabel(null, labels)).toBe('');
	});
});

describe('styles partagés (fallback neutre, jamais undefined)', () => {
	it('actionabilityStyle couvre les valeurs connues', () => {
		for (const v of ActionabilityEnum.options) {
			expect(actionabilityStyle(v)).toBeTruthy();
		}
	});
	it('segmentStyle couvre les valeurs connues', () => {
		for (const v of SegmentEnum.options) {
			expect(segmentStyle(v)).toBeTruthy();
		}
	});
	it('valeur inconnue -> style neutre non vide', () => {
		expect(actionabilityStyle('???')).toContain('bg-surface-alt');
		expect(segmentStyle('???')).toContain('bg-surface-alt');
	});
});

import { describe, it, expect } from 'vitest';
import { buildRedirect } from './+server';

const RPT = '11111111-2222-3333-4444-555555555555';

describe('buildRedirect - alignement onglet Prospection (fix chips invisibles)', () => {
	it('zefix -> tab=entreprises (l’onglet qui CONTIENT la source zefix)', () => {
		const url = buildRedirect('zefix', 'VD', RPT, 'Glas SA');
		const params = new URLSearchParams(url.split('?')[1]);
		expect(params.get('tab')).toBe('entreprises');
		expect(params.get('source')).toBe('zefix');
		expect(params.get('canton')).toBe('VD');
	});

	it('simap -> tab=simap', () => {
		const params = new URLSearchParams(buildRedirect('simap', 'GE', RPT, 'x').split('?')[1]);
		expect(params.get('tab')).toBe('simap');
		expect(params.get('source')).toBe('simap');
	});

	it('regbl -> tab=regbl', () => {
		const params = new URLSearchParams(buildRedirect('regbl', 'NE', RPT, 'x').split('?')[1]);
		expect(params.get('tab')).toBe('regbl');
		expect(params.get('source')).toBe('regbl');
	});

	it('propage traçabilité + tri date_import desc (clé de tri valide)', () => {
		const params = new URLSearchParams(buildRedirect('zefix', 'VD', RPT, 'mon terme').split('?')[1]);
		expect(params.get('from_intelligence')).toBe(RPT);
		expect(params.get('from_term')).toBe('mon terme');
		expect(params.get('sort')).toBe('date_import');
		expect(params.get('dir')).toBe('desc');
	});

	it('le tab posé rend la source compatible (pas de sourceFilterIncompatible -> 0 résultat)', async () => {
		// Vérifie l'invariant contre la source de vérité : la source du chip appartient
		// bien à l'onglet posé (sinon parseProspectionFilter renverrait 0 résultat).
		const { TAB_SOURCE_MAP } = await import('$lib/prospection-utils');
		for (const source of ['zefix', 'simap', 'regbl'] as const) {
			const tab = new URLSearchParams(
				buildRedirect(source, 'VD', RPT, 'x').split('?')[1]
			).get('tab') as keyof typeof TAB_SOURCE_MAP;
			expect(TAB_SOURCE_MAP[tab]).toContain(source);
		}
	});
});

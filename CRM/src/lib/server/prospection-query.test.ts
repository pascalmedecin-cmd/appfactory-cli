import { describe, it, expect, vi } from 'vitest';
import {
	parseProspectionFilter,
	applyProspectionFilters,
	applyProspectionScopeFilters,
	prospectionSearchPattern,
	applyCampagneLeadFilter,
	resolveCampagneLeadIds,
	MAX_FILTER_VALUES,
} from './prospection-query';

/**
 * Tests du module unique de filtre Prospection (Vague 3.2). Garantissent que le parsing
 * et l'application des filtres sont déterministes et partagés par les 3 appelants (load,
 * export CSV, sélection globale) — c'est ce qui résorbe la dette des 3 filtres dupliqués.
 */

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

const u = (qs: string) => new URL('http://localhost/x' + qs);

describe('parseProspectionFilter', () => {
	it('onglet inconnu/masqué → retombe sur le défaut visible (entreprises en V5)', () => {
		expect(parseProspectionFilter(u('?tab=zzz')).tab).toBe('entreprises');
		expect(parseProspectionFilter(u('?tab=simap')).tab).toBe('entreprises'); // SIMAP masqué V5
	});

	it('sources intersectées avec l’onglet (source hors onglet ignorée)', () => {
		const f = parseProspectionFilter(u('?tab=entreprises&source=zefix&source=lead_express'));
		expect(f.effectiveSources).toEqual(['zefix']);
		expect(f.sourceFilterIncompatible).toBe(false);
	});

	it('source entièrement incompatible avec l’onglet → sourceFilterIncompatible', () => {
		const f = parseProspectionFilter(u('?tab=entreprises&source=lead_express'));
		expect(f.effectiveSources).toEqual([]);
		expect(f.sourceFilterIncompatible).toBe(true);
	});

	it('température hors liste ignorée', () => {
		expect(parseProspectionFilter(u('?temp=chaud&temp=zzz')).filterTemperatures).toEqual(['chaud']);
	});

	it('recherche bornée à 200 + tri whitelisté', () => {
		const f = parseProspectionFilter(u('?q=' + 'a'.repeat(300) + '&sort=evil'));
		expect(f.search.length).toBe(200);
		expect(f.sortKey).toBe('score_pertinence');
		expect(parseProspectionFilter(u('?sort=raison_sociale')).sortKey).toBe('raison_sociale');
		expect(parseProspectionFilter(u('?dir=asc')).sortAsc).toBe(true);
	});

	it('MAX_FILTER_VALUES borne les tableaux de filtres (anti-DoS)', () => {
		const many = Array.from({ length: 60 }, (_, i) => 'canton=C' + i).join('&');
		expect(parseProspectionFilter(u('?' + many)).filterCantons.length).toBe(MAX_FILTER_VALUES);
	});

	it('showTransferred=1 reconnu', () => {
		expect(parseProspectionFilter(u('?showTransferred=1')).showTransferred).toBe(true);
		expect(parseProspectionFilter(u('?showTransferred=0')).showTransferred).toBe(false);
	});
});

type Call = [string, ...unknown[]];
function spyBuilder() {
	const calls: Call[] = [];
	const b: Record<string, unknown> = {
		in(c: string, v: unknown) { calls.push(['in', c, v]); return b; },
		neq(c: string, v: unknown) { calls.push(['neq', c, v]); return b; },
		or(e: unknown) { calls.push(['or', e]); return b; },
	};
	return { b, calls };
}

describe('applyProspectionFilters / applyProspectionScopeFilters', () => {
	it('filtre complet = source de l’onglet + canton + neq transfere par défaut', () => {
		const { b, calls } = spyBuilder();
		applyProspectionFilters(b, parseProspectionFilter(u('?tab=entreprises&canton=GE')));
		expect(calls.find((c) => c[0] === 'in' && c[1] === 'source')?.[2]).toEqual(['zefix', 'search_ch', 'google_places']);
		expect(calls.find((c) => c[0] === 'in' && c[1] === 'canton')?.[2]).toEqual(['GE']);
		expect(calls.some((c) => c[0] === 'neq' && c[1] === 'statut')).toBe(true);
	});

	it('scope-only n’applique PAS le filtre source (utilisé pour les compteurs par onglet)', () => {
		const { b, calls } = spyBuilder();
		applyProspectionScopeFilters(b, parseProspectionFilter(u('?tab=entreprises&canton=GE')));
		expect(calls.some((c) => c[0] === 'in' && c[1] === 'source')).toBe(false);
		expect(calls.some((c) => c[0] === 'in' && c[1] === 'canton')).toBe(true);
	});

	it('statut explicite → in(statut) sans neq transfere', () => {
		const { b, calls } = spyBuilder();
		applyProspectionFilters(b, parseProspectionFilter(u('?tab=entreprises&statut=nouveau')));
		expect(calls.find((c) => c[0] === 'in' && c[1] === 'statut')?.[2]).toEqual(['nouveau']);
		expect(calls.some((c) => c[0] === 'neq' && c[1] === 'statut')).toBe(false);
	});

	it('température chaud → or(score>=7), littéraux seuls', () => {
		const { b, calls } = spyBuilder();
		applyProspectionScopeFilters(b, parseProspectionFilter(u('?temp=chaud')));
		expect(String(calls.find((c) => c[0] === 'or')?.[1])).toContain('score_pertinence.gte.7');
	});
});

describe('prospectionSearchPattern', () => {
	it('échappe les wildcards SQL % _ \\ et borne par %...%', () => {
		expect(prospectionSearchPattern('a%_\\b')).toBe('%a\\%\\_\\\\b%');
	});
});

describe('filtre campagne (Vague 3.2, relation N-N)', () => {
	const cid = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;

	it('parse ?campagne (multi, uuid) et borne à MAX_FILTER_VALUES', () => {
		const a = cid(1), b = cid(2);
		expect(parseProspectionFilter(u(`?campagne=${a}&campagne=${b}`)).filterCampagnes).toEqual([a, b]);
		const many = Array.from({ length: MAX_FILTER_VALUES + 5 }, (_, i) => `campagne=${cid(i)}`).join('&');
		expect(parseProspectionFilter(u('?' + many)).filterCampagnes.length).toBe(MAX_FILTER_VALUES);
	});

	it('ignore les ?campagne hors format uuid (defense-in-depth)', () => {
		expect(parseProspectionFilter(u('?campagne=abc&campagne=foobar')).filterCampagnes).toEqual([]);
		expect(parseProspectionFilter(u(`?campagne=${cid(1)}&campagne=pas-un-uuid`)).filterCampagnes).toEqual([cid(1)]);
	});

	it('filterCampagnes vide par défaut', () => {
		expect(parseProspectionFilter(u('')).filterCampagnes).toEqual([]);
	});

	it('applyCampagneLeadFilter(null) = no-op (aucun .in appliqué)', () => {
		const calls: unknown[][] = [];
		const q = { in: (...a: unknown[]) => { calls.push(a); return q; } };
		expect(applyCampagneLeadFilter(q, null)).toBe(q);
		expect(calls.length).toBe(0);
	});

	it('applyCampagneLeadFilter(ids) applique .in("id", ids) (jamais un .or interpolé)', () => {
		const calls: unknown[][] = [];
		const q = { in: (...a: unknown[]) => { calls.push(a); return q; } };
		applyCampagneLeadFilter(q, ['l1', 'l2']);
		expect(calls).toEqual([['id', ['l1', 'l2']]]);
	});

	it('resolveCampagneLeadIds = null quand aucun filtre campagne (aucune requête DB)', async () => {
		const f = parseProspectionFilter(u(''));
		const sb = { from: () => { throw new Error('ne doit pas requêter la jonction'); } };
		expect(await resolveCampagneLeadIds(sb as never, f)).toBe(null);
	});
});

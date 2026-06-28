import { describe, it, expect } from 'vitest';
import {
	parseEntreprisesQuery,
	resolveEntreprisesTab,
	applyEntreprisesBaseFilter,
	applyEntreprisesTabFilter,
	applyEntreprisesSansCantonFilter,
	entreprisesSearchPattern,
	ENTREPRISES_DEFAULT_PAGE_SIZE,
} from './entreprises-query';

const u = (qs = ''): URL => new URL(`https://x.test/crm/entreprises${qs}`);

/**
 * Recorder de query builder PostgREST : chaque méthode renvoie `this` et journalise l'appel.
 * On teste ainsi le ROUTAGE des filtres (quelle méthode/quels arguments par onglet), pas un
 * comportement Supabase. C'est notre logique de branchement qui est sous test.
 */
function recorder() {
	const calls: { method: string; args: unknown[] }[] = [];
	const proxy: Record<string, (...a: unknown[]) => unknown> = {};
	for (const m of ['eq', 'or', 'not', 'in', 'ilike']) {
		proxy[m] = (...args: unknown[]) => {
			calls.push({ method: m, args });
			return proxy;
		};
	}
	return { q: proxy as never, calls };
}

describe('resolveEntreprisesTab', () => {
	it('retombe sur "toutes" si tab absent ou inconnu', () => {
		expect(resolveEntreprisesTab(null)).toBe('toutes');
		expect(resolveEntreprisesTab('nimporte')).toBe('toutes');
		expect(resolveEntreprisesTab('')).toBe('toutes');
	});
	it('accepte les 4 onglets connus', () => {
		for (const t of ['toutes', 'qualifiees', 'a-qualifier', 'sans-contact']) {
			expect(resolveEntreprisesTab(t)).toBe(t);
		}
	});
});

describe('parseEntreprisesQuery', () => {
	it('défauts : toutes / page 0 / pageSize 50 / pas de recherche / tri date desc', () => {
		const q = parseEntreprisesQuery(u());
		expect(q).toEqual({
			tab: 'toutes',
			page: 0,
			pageSize: ENTREPRISES_DEFAULT_PAGE_SIZE,
			search: '',
			sortKey: 'date_derniere_modification',
			sortAsc: false,
		});
	});

	it('parse page (≥0, NaN → 0)', () => {
		expect(parseEntreprisesQuery(u('?page=3')).page).toBe(3);
		expect(parseEntreprisesQuery(u('?page=-5')).page).toBe(0);
		expect(parseEntreprisesQuery(u('?page=abc')).page).toBe(0);
	});

	it('perPage : whitelist stricte 25/50/100, sinon défaut', () => {
		expect(parseEntreprisesQuery(u('?perPage=25')).pageSize).toBe(25);
		expect(parseEntreprisesQuery(u('?perPage=100')).pageSize).toBe(100);
		expect(parseEntreprisesQuery(u('?perPage=999')).pageSize).toBe(ENTREPRISES_DEFAULT_PAGE_SIZE);
		expect(parseEntreprisesQuery(u('?perPage=1')).pageSize).toBe(ENTREPRISES_DEFAULT_PAGE_SIZE);
	});

	it('recherche : trim + cap 200', () => {
		expect(parseEntreprisesQuery(u('?q=%20%20vitr%20%20')).search).toBe('vitr');
		expect(parseEntreprisesQuery(u(`?q=${'a'.repeat(300)}`)).search.length).toBe(200);
	});

	it('tri : whitelist de colonnes (sort inconnu → défaut)', () => {
		expect(parseEntreprisesQuery(u('?sort=raison_sociale&dir=asc')).sortKey).toBe('raison_sociale');
		expect(parseEntreprisesQuery(u('?sort=raison_sociale&dir=asc')).sortAsc).toBe(true);
		// colonne hors whitelist (anti-injection) → défaut
		expect(parseEntreprisesQuery(u('?sort=DROP_TABLE')).sortKey).toBe('date_derniere_modification');
		expect(parseEntreprisesQuery(u('?sort=secteur_activite&dir=desc')).sortAsc).toBe(false);
	});
});

describe('applyEntreprisesBaseFilter', () => {
	it('filtre toujours sur statut_archive=false', () => {
		const { q, calls } = recorder();
		applyEntreprisesBaseFilter(q);
		expect(calls).toEqual([{ method: 'eq', args: ['statut_archive', false] }]);
	});
});

describe('applyEntreprisesTabFilter (routage)', () => {
	const IDS = ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'];

	it('toutes : aucun filtre supplémentaire', () => {
		const { q, calls } = recorder();
		applyEntreprisesTabFilter(q, 'toutes', IDS);
		expect(calls).toHaveLength(0);
	});

	it('qualifiees : eq statut_qualification=qualifie', () => {
		const { q, calls } = recorder();
		applyEntreprisesTabFilter(q, 'qualifiees', IDS);
		expect(calls).toEqual([{ method: 'eq', args: ['statut_qualification', 'qualifie'] }]);
	});

	it('a-qualifier : or nouveau|null (littéraux seuls)', () => {
		const { q, calls } = recorder();
		applyEntreprisesTabFilter(q, 'a-qualifier', IDS);
		expect(calls).toEqual([{ method: 'or', args: ['statut_qualification.eq.nouveau,statut_qualification.is.null'] }]);
	});

	it('sans-contact : anti-join not in (ids)', () => {
		const { q, calls } = recorder();
		applyEntreprisesTabFilter(q, 'sans-contact', IDS);
		expect(calls).toEqual([{ method: 'not', args: ['id', 'in', `(${IDS.join(',')})`] }]);
	});

	it('sans-contact, set vide : aucun filtre (toutes les entreprises sont sans contact)', () => {
		const { q, calls } = recorder();
		applyEntreprisesTabFilter(q, 'sans-contact', []);
		expect(calls).toHaveLength(0);
	});

	it('sans-contact : n’injecte que des ids au format UUID (defense-in-depth)', () => {
		const { q, calls } = recorder();
		applyEntreprisesTabFilter(q, 'sans-contact', ['not-a-uuid', IDS[0], 'x); DROP TABLE']);
		expect(calls).toEqual([{ method: 'not', args: ['id', 'in', `(${IDS[0]})`] }]);
	});

	it('sans-contact : que des ids invalides → aucun filtre (pas d’IN vide invalide)', () => {
		const { q, calls } = recorder();
		applyEntreprisesTabFilter(q, 'sans-contact', ['bad', '']);
		expect(calls).toHaveLength(0);
	});
});

describe('applyEntreprisesSansCantonFilter', () => {
	it('or canton null|vide (littéraux seuls)', () => {
		const { q, calls } = recorder();
		applyEntreprisesSansCantonFilter(q);
		expect(calls).toEqual([{ method: 'or', args: ['canton.is.null,canton.eq.'] }]);
	});
});

describe('entreprisesSearchPattern', () => {
	it('encadre de %…% et échappe les wildcards de la saisie', () => {
		expect(entreprisesSearchPattern('vitr')).toBe('%vitr%');
		// % et _ de la saisie neutralisés (escapeIlike) → pas de wildcard injecté
		const p = entreprisesSearchPattern('100%_test');
		expect(p.startsWith('%')).toBe(true);
		expect(p.endsWith('%')).toBe(true);
		expect(p.slice(1, -1)).not.toBe('100%_test');
	});
});

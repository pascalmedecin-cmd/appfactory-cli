import { describe, it, expect, vi } from 'vitest';

/**
 * `load` de /crm/entreprises — refonte serveur Bloc A (2026-06-28).
 *
 * Couvre l'INVARIANT NOMMÉ du cadrage : les counts d'onglet et les KPI sont calculés via des
 * requêtes `count:'exact'` SÉPARÉES (sans `limit`, sans filtre d'onglet pour les KPI globaux), et
 * l'anti-join `sans-contact` est exact. Un builder FILTRE-CONSCIENT applique réellement les
 * prédicats au dataset à l'await → prouve que :
 *  - les entreprises archivées sont exclues PARTOUT (vue + counts + KPI) ;
 *  - tabCounts (toutes/qualifiees/a-qualifier/sans-contact) sont exacts ;
 *  - KPI (total/qualifiees/avecContact/sansCanton/affairesEnCours/sansContact) sont exacts ;
 *  - avecContact = total - sansContact ;
 *  - la pagination renvoie la page (range) + le count total ;
 *  - la recherche filtre la vue sans toucher les counts d'onglet (globaux).
 */

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

type Row = Record<string, unknown>;

const cmp = (a: unknown, b: unknown): number => String(a ?? '').localeCompare(String(b ?? ''));

/** Prédicat d'une expression PostgREST `.or()` (littéraux seuls : `col.op.val,...`). */
function orPredicate(expr: string): (r: Row) => boolean {
	const terms = expr.split(',').map((t) => {
		const i1 = t.indexOf('.');
		const i2 = t.indexOf('.', i1 + 1);
		const col = t.slice(0, i1);
		const op = t.slice(i1 + 1, i2);
		const val = t.slice(i2 + 1);
		if (op === 'is' && val === 'null') return (r: Row) => r[col] === null || r[col] === undefined;
		if (op === 'eq') return (r: Row) => r[col] === val; // val '' = chaîne vide
		throw new Error('or term non supporté: ' + t);
	});
	return (r: Row) => terms.some((p) => p(r));
}

function parseInList(val: string): Set<unknown> {
	return new Set(val.replace(/^\(|\)$/g, '').split(',').filter(Boolean));
}

/** Builder entreprises filtre-conscient : eq/or/not/in/ilike accumulent des prédicats appliqués
 *  à l'await ; head:true → {count} sans data ; sinon {data: page (range), count}. */
function entreprisesBuilder(fx: Row[], selectOpts: { count?: string; head?: boolean }) {
	const preds: ((r: Row) => boolean)[] = [];
	let rangeStart = 0, rangeEnd = Infinity, hasRange = false;
	let orderKey: string | null = null, orderAsc = true;
	const builder = {
		eq(col: string, val: unknown) { preds.push((r) => r[col] === val); return builder; },
		or(expr: string) { preds.push(orPredicate(expr)); return builder; },
		not(col: string, op: string, val: string) {
			if (op !== 'in') throw new Error('not op non supporté: ' + op);
			const set = parseInList(val);
			preds.push((r) => !set.has(r[col]));
			return builder;
		},
		in(col: string, vals: unknown[]) { const set = new Set(vals); preds.push((r) => set.has(r[col])); return builder; },
		ilike(col: string, pat: string) {
			const needle = pat.replace(/%/g, '').toLowerCase();
			preds.push((r) => String(r[col] ?? '').toLowerCase().includes(needle));
			return builder;
		},
		order(key: string, opts?: { ascending?: boolean }) { orderKey = key; orderAsc = opts?.ascending ?? true; return builder; },
		range(start: number, end: number) { rangeStart = start; rangeEnd = end; hasRange = true; return builder; },
		then(resolve: (v: unknown) => void) {
			let rows = fx.filter((r) => preds.every((p) => p(r)));
			const count = rows.length;
			if (orderKey) rows = [...rows].sort((a, b) => cmp(a[orderKey!], b[orderKey!]) * (orderAsc ? 1 : -1));
			if (selectOpts.head) return resolve({ data: null, count, error: null });
			const paged = hasRange ? rows.slice(rangeStart, rangeEnd + 1) : rows;
			return resolve({ data: paged, count, error: null });
		},
	};
	return builder;
}

function makeSupabase(fx: { entreprises: Row[]; contacts: Row[]; opportunites: Row[] }) {
	return {
		from(table: string) {
			if (table === 'entreprises') {
				return { select: (_cols: string, opts: { count?: string; head?: boolean } = {}) => entreprisesBuilder(fx.entreprises, opts ?? {}) };
			}
			if (table === 'contacts') {
				return { select: () => ({ eq: () => Promise.resolve({ data: fx.contacts, error: null }) }) };
			}
			if (table === 'opportunites') {
				return {
					select: () => ({
						not: () => ({ order: () => ({ limit: () => Promise.resolve({ data: fx.opportunites, error: null }) }) }),
					}),
				};
			}
			throw new Error('table inattendue: ' + table);
		},
	};
}

// --- Fixture ---------------------------------------------------------------
// Ids = VRAIS UUID (l'anti-join `sans-contact` n'injecte que des ids au format UUID :
// defense-in-depth contre une injection via la table contacts). En prod, `entreprises.id` EST
// un UUID — une fixture à ids courts serait silencieusement laissée passer par le garde.
const A = 'aaaaaaaa-0000-4000-8000-000000000001';
const B = 'bbbbbbbb-0000-4000-8000-000000000002';
const C = 'cccccccc-0000-4000-8000-000000000003';
const D = 'dddddddd-0000-4000-8000-000000000004';
const E = 'eeeeeeee-0000-4000-8000-000000000005';
const F = 'ffffffff-0000-4000-8000-000000000006';
// Non archivées : A,B,C,D,E. Archivée : F (doit être exclue PARTOUT).
const ENTREPRISES: Row[] = [
	{ id: A, statut_qualification: 'qualifie', canton: 'GE', statut_archive: false, date_derniere_modification: '2026-06-05' },
	{ id: B, statut_qualification: 'qualifie', canton: null, statut_archive: false, date_derniere_modification: '2026-06-04' },
	{ id: C, statut_qualification: 'nouveau', canton: 'VD', statut_archive: false, date_derniere_modification: '2026-06-03' },
	{ id: D, statut_qualification: null, canton: '', statut_archive: false, date_derniere_modification: '2026-06-02' },
	{ id: E, statut_qualification: 'en_cours', canton: 'NE', statut_archive: false, date_derniere_modification: '2026-06-01' },
	{ id: F, statut_qualification: 'qualifie', canton: 'VS', statut_archive: true, date_derniere_modification: '2026-06-06' },
];
const CONTACTS: Row[] = [
	{ entreprise_id: A }, { entreprise_id: A }, { entreprise_id: C }, { entreprise_id: null },
];
const OPPORTUNITES: Row[] = [
	{ entreprise_id: B, etape_pipeline: 'qualification' }, // affaire active
	{ entreprise_id: E, etape_pipeline: 'identification' }, // affaire active
	{ entreprise_id: C, etape_pipeline: 'xxx' }, // étape inconnue → ignorée (pas une affaire)
];

async function runLoad(qs = '', fx: { entreprises: Row[]; contacts: Row[]; opportunites: Row[] } = { entreprises: ENTREPRISES, contacts: CONTACTS, opportunites: OPPORTUNITES }) {
	const { load } = await import('./+page.server');
	const supabase = makeSupabase(fx);
	const url = new URL(`https://x.test/crm/entreprises${qs}`);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (await (load as any)({ locals: { supabase }, url })) as any;
}

describe('load /crm/entreprises (refonte serveur)', () => {
	it('tabCounts exacts, archivée F exclue', async () => {
		const d = await runLoad();
		expect(d.tabCounts).toEqual({ toutes: 5, qualifiees: 2, 'a-qualifier': 2, 'sans-contact': 3 });
	});

	it('KPI exacts (anti-join sans-contact + affaires + avecContact dérivé)', async () => {
		const d = await runLoad();
		expect(d.kpi).toEqual({
			total: 5,
			qualifiees: 2,
			avecContact: 2, // total(5) - sansContact(3)
			sansCanton: 2, // B(null) + D('')
			affairesEnCours: 2, // B + E (xxx de C ignoré)
			sansContact: 3, // B, D, E (pas dans {A,C})
		});
		expect(d.kpi.avecContact).toBe(d.kpi.total - d.kpi.sansContact);
	});

	it('vue par défaut : page complète (5) + count total, archivée exclue', async () => {
		const d = await runLoad();
		expect(d.totalEntreprises).toBe(5);
		expect(d.entreprises.map((e: Row) => e.id).sort()).toEqual([A, B, C, D, E]);
		expect(d.entreprises.map((e: Row) => e.id)).not.toContain(F);
		expect(d.page).toBe(0);
		expect(d.pageSize).toBe(50);
		expect(d.tab).toBe('toutes');
	});

	it('onglet sans-contact : la VUE n’a que les entreprises sans contact', async () => {
		const d = await runLoad('?tab=sans-contact');
		expect(d.tab).toBe('sans-contact');
		expect(d.entreprises.map((e: Row) => e.id).sort()).toEqual([B, D, E]);
		expect(d.totalEntreprises).toBe(3);
		// les counts d'onglet restent GLOBAUX (indépendants de l'onglet actif)
		expect(d.tabCounts.toutes).toBe(5);
	});

	it('onglet qualifiees : vue filtrée, archivée F (qualifie mais archivée) exclue', async () => {
		const d = await runLoad('?tab=qualifiees');
		expect(d.entreprises.map((e: Row) => e.id).sort()).toEqual([A, B]);
		expect(d.totalEntreprises).toBe(2);
	});

	it('pagination : perPage=25 + page écho', async () => {
		const d = await runLoad('?perPage=25&page=1');
		expect(d.pageSize).toBe(25);
		expect(d.page).toBe(1);
		// page 1 (offset 25) sur 5 résultats → vide, mais count total reste 5
		expect(d.totalEntreprises).toBe(5);
		expect(d.entreprises).toHaveLength(0);
	});

	it('recherche : filtre la vue, counts d’onglet inchangés (globaux)', async () => {
		const d = await runLoad('?q=GE');
		// seule A a canton 'GE'
		expect(d.entreprises.map((e: Row) => e.id)).toEqual([A]);
		expect(d.totalEntreprises).toBe(1);
		expect(d.search).toBe('GE');
		// les badges d'onglet ne suivent PAS la recherche
		expect(d.tabCounts).toEqual({ toutes: 5, qualifiees: 2, 'a-qualifier': 2, 'sans-contact': 3 });
	});

	it('contacts + opportunités chargés ENTIERS (invariant fiche SlideOut)', async () => {
		const d = await runLoad();
		expect(d.contacts).toHaveLength(4);
		expect(d.opportunites).toHaveLength(3);
	});
});

describe('recherche serveur : union exacte + pagination stable (fix régression review)', () => {
	// 60 entreprises matchant 'vitr'. Indices PAIRS matchent sur raison_sociale ET secteur (le
	// terme doit être dédupliqué — sinon le merge 3-requêtes les compterait deux fois) ; impairs
	// matchent sur raison_sociale seul. Union exacte = 60.
	const mk = (n: number): Row => ({
		id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
		raison_sociale: `Vitrerie ${String(n).padStart(2, '0')}`, // matche 'vitr' (tous)
		secteur_activite: n % 2 === 0 ? 'Pose de vitrages' : 'Bâtiment', // 'vitr' aussi pour les pairs
		statut_qualification: 'nouveau',
		canton: 'GE',
		statut_archive: false,
		date_derniere_modification: `2026-06-${String((n % 28) + 1).padStart(2, '0')}T00:00:${String(n % 60).padStart(2, '0')}Z`,
	});
	const FX = { entreprises: Array.from({ length: 60 }, (_, i) => mk(i + 1)), contacts: [], opportunites: [] };

	it('count EXACT = union dédupliquée (pas le max approximatif)', async () => {
		const d = await runLoad('?q=vitr', FX);
		expect(d.totalEntreprises).toBe(60);
	});

	it('pages disjointes et couvrantes (aucune ligne sautée ni dupliquée entre pages)', async () => {
		const pages = await Promise.all([
			runLoad('?q=vitr&perPage=25&page=0', FX),
			runLoad('?q=vitr&perPage=25&page=1', FX),
			runLoad('?q=vitr&perPage=25&page=2', FX),
		]);
		expect(pages.map((p) => p.entreprises.length)).toEqual([25, 25, 10]); // 60 = 25+25+10
		const allIds = pages.flatMap((p) => p.entreprises.map((e: Row) => e.id));
		expect(new Set(allIds).size).toBe(60); // 60 ids DISTINCTS → 0 doublon, 0 saut
		expect(pages.every((p) => p.totalEntreprises === 60)).toBe(true);
	});
});

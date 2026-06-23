import { describe, it, expect, vi } from 'vitest';
import { GET } from './+server';

/**
 * Tests du handler `GET /api/prospection/all-ids` (sélection globale).
 * Prouvent le FIX de fusion (Vague 3.2) : la sélection partage désormais le filtre du
 * `load` via `prospection-query`, donc elle (1) mappe l'onglet -> sources, (2) exclut les
 * transférés par défaut, (3) cherche sur 3 champs. Avant : aucune de ces 3, d'où une
 * sélection qui pouvait cocher des prospects hors de la vue affichée.
 */

type Row = { id: string };
type Call = [string, ...unknown[]];

function createMock(rows: Row[], opts: { dbError?: { message: string }; count?: number } = {}) {
	const calls: Call[] = [];
	const builder: Record<string, unknown> = {
		select(...a: unknown[]) { calls.push(['select', ...a]); return builder; },
		in(c: string, v: unknown) { calls.push(['in', c, v]); return builder; },
		neq(c: string, v: unknown) { calls.push(['neq', c, v]); return builder; },
		or(e: unknown) { calls.push(['or', e]); return builder; },
		ilike(c: string, v: unknown) { calls.push(['ilike', c, v]); return builder; },
		order(c: string, o: unknown) { calls.push(['order', c, o]); return builder; },
		limit(n: number) {
			calls.push(['limit', n]);
			return Promise.resolve({ data: opts.dbError ? null : rows, error: opts.dbError ?? null, count: opts.count ?? null });
		},
	};
	return {
		supabase: { from(t: string) { calls.push(['from', t]); return builder; } },
		calls: () => calls,
	};
}

async function callGet(search: string, mock: ReturnType<typeof createMock>) {
	return GET({
		locals: { supabase: mock.supabase },
		url: new URL('http://localhost/api/prospection/all-ids' + search),
	} as unknown as Parameters<typeof GET>[0]);
}

function hasCall(mock: ReturnType<typeof createMock>, method: string, col?: string): boolean {
	return mock.calls().some((c) => c[0] === method && (col === undefined || c[1] === col));
}

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

describe('GET /api/prospection/all-ids (fusion filtres)', () => {
	it('onglet entreprises → mappe les sources de l’onglet ET exclut les transférés (FIX)', async () => {
		const mock = createMock([{ id: '1' }, { id: '2' }], { count: 2 });
		const res = await callGet('?tab=entreprises', mock);
		const payload = await res.json();
		expect(payload.ids).toEqual(['1', '2']);
		// FIX 1 : sources de l'onglet (avant : aucune borne source).
		const inSource = mock.calls().find((c) => c[0] === 'in' && c[1] === 'source');
		expect(inSource?.[2]).toEqual(['zefix', 'search_ch', 'google_places']);
		// FIX 2 : transférés exclus par défaut (avant : inclus).
		expect(hasCall(mock, 'neq', 'statut')).toBe(true);
		// Sélection d'ids seulement.
		expect(mock.calls().find((c) => c[0] === 'select')?.[1]).toBe('id');
	});

	it('recherche → 3 .ilike (raison_sociale, localite, canton) (FIX : était 2 champs)', async () => {
		const mock = createMock([{ id: 'dup' }]);
		await callGet('?tab=entreprises&q=acme', mock);
		const ilikeFields = mock.calls().filter((c) => c[0] === 'ilike').map((c) => c[1]);
		expect(ilikeFields).toEqual(['raison_sociale', 'localite', 'canton']);
	});

	it('statut explicite (transfere) → in(statut) sans neq', async () => {
		const mock = createMock([{ id: '1' }], { count: 1 });
		await callGet('?tab=entreprises&statut=transfere', mock);
		expect(mock.calls().find((c) => c[0] === 'in' && c[1] === 'statut')?.[2]).toEqual(['transfere']);
		expect(hasCall(mock, 'neq', 'statut')).toBe(false);
	});

	it('source incompatible avec l’onglet → ids vide, aucune requête DB', async () => {
		const mock = createMock([{ id: '1' }], { count: 1 });
		const res = await callGet('?tab=entreprises&source=lead_express', mock);
		const payload = await res.json();
		expect(payload.ids).toEqual([]);
		expect(hasCall(mock, 'from')).toBe(false);
	});

	it('total filtré > cap → capped true', async () => {
		const mock = createMock([{ id: '1' }], { count: 9000 });
		const res = await callGet('?tab=entreprises', mock);
		const payload = await res.json();
		expect(payload.capped).toBe(true);
	});

	it('échappe les wildcards SQL dans la recherche', async () => {
		const mock = createMock([]);
		await callGet('?tab=entreprises&q=' + encodeURIComponent('a%_\\b'), mock);
		const ilike = mock.calls().find((c) => c[0] === 'ilike');
		expect(ilike?.[2]).toBe('%a\\%\\_\\\\b%');
	});

	it('erreur Supabase → 500', async () => {
		const mock = createMock([], { dbError: { message: 'connection lost' } });
		const res = await callGet('?tab=entreprises', mock);
		expect(res.status).toBe(500);
	});
});

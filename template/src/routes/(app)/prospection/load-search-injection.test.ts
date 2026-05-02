import { describe, it, expect, vi } from 'vitest';

/**
 * V1.2 audit S160 : tests anti-injection PostgREST sur la search /prospection.
 *
 * Avant fix : `query.or('raison_sociale.ilike.%${search}%,localite.ilike.%${search}%,canton.ilike.%${search}%')`
 *   → mini-DSL PostgREST avec `,` `(` `)` `:` `.` comme séparateurs hostiles.
 *
 * Après fix (pattern S120) :
 *   - 3 .ilike() en parallèle + Set dédup
 *   - search escape : `[%_\\]` → `\\X`
 *   - aucun appel .or() avec la search dans les arguments.
 *
 * Tests :
 *   1. caractères hostiles `,` `(` `)` `:` `.` n'atteignent pas .or()
 *   2. wildcards `%` `_` `\` sont escapés avant .ilike()
 *   3. saisie utilisateur normale fonctionne en parallèle sur 3 champs
 */

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

type IlikeCall = { field: string; pattern: string };
type OrCall = { filter: string };

function createSpyingSupabase() {
	const ilikeCalls: IlikeCall[] = [];
	const orCalls: OrCall[] = [];
	const insertCalls: unknown[] = [];

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function makeBuilder(table: string): any {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const builder: any = {};
		builder.select = () => builder;
		builder.in = () => builder;
		builder.eq = () => builder;
		builder.neq = () => builder;
		builder.gte = () => builder;
		builder.order = () => builder;
		builder.limit = () => builder;
		builder.range = () => builder;
		builder.maybeSingle = () => Promise.resolve({ data: null, error: null });
		builder.single = () => Promise.resolve({ data: null, error: null });
		builder.insert = (payload: unknown) => {
			insertCalls.push({ table, payload });
			return Promise.resolve({ error: null });
		};
		builder.update = () => builder;
		builder.delete = () => builder;
		builder.ilike = (field: string, pattern: string) => {
			ilikeCalls.push({ field, pattern });
			return builder;
		};
		builder.or = (filter: string) => {
			orCalls.push({ filter });
			return builder;
		};
		// Make builder thenable so `await q` resolves to a result with empty data
		builder.then = (resolve: (v: unknown) => void) => {
			resolve({ data: [], count: 0, error: null });
		};
		return builder;
	}

	const sb = {
		from: (table: string) => makeBuilder(table),
		_ilikeCalls: ilikeCalls,
		_orCalls: orCalls,
		_insertCalls: insertCalls,
	};
	return sb;
}

async function runLoad(searchValue: string) {
	const sb = createSpyingSupabase();
	const mod = await import('./+page.server');
	const url = new URL(`http://localhost/prospection?q=${encodeURIComponent(searchValue)}`);
	await mod.load({
		locals: { supabase: sb },
		url,
	} as unknown as Parameters<typeof mod.load>[0]);
	return sb;
}

describe('V1.2 search injection PostgREST', () => {
	it('caractères hostiles `,` `(` `)` `:` `.` n\'atteignent jamais .or() avec la search', async () => {
		const malicious = ')|raison_sociale.eq.Test,id.eq.evil(';
		const sb = await runLoad(malicious);

		// Aucun appel .or() ne doit contenir la chaîne hostile
		for (const call of sb._orCalls) {
			expect(call.filter).not.toContain('Test');
			expect(call.filter).not.toContain('evil');
			expect(call.filter).not.toContain(malicious);
		}
	});

	it('wildcards `%` `_` `\\` sont escapés avant .ilike()', async () => {
		const sb = await runLoad('100%_OFF\\promo');

		expect(sb._ilikeCalls.length).toBeGreaterThan(0);
		for (const call of sb._ilikeCalls) {
			// Pattern doit contenir l'escape `\%` `\_` `\\`
			expect(call.pattern).toContain('\\%');
			expect(call.pattern).toContain('\\_');
			expect(call.pattern).toContain('\\\\');
		}
	});

	it('search déclenche 3 ilike() en parallèle (raison_sociale, localite, canton) - pattern S120', async () => {
		const sb = await runLoad('vitrerie');

		const fieldsHit = new Set(sb._ilikeCalls.map((c) => c.field));
		// La query principale + chacun des 4 tabCounts → potentiellement 5 × 3 fields
		expect(fieldsHit.has('raison_sociale')).toBe(true);
		expect(fieldsHit.has('localite')).toBe(true);
		expect(fieldsHit.has('canton')).toBe(true);
	});

	it('saisie vide ne déclenche pas .or() multi-champ avec search', async () => {
		const sb = await runLoad('');
		// Aucun .or() avec ilike dedans (les ranges score restent OK car pas de search dedans)
		for (const call of sb._orCalls) {
			expect(call.filter).not.toMatch(/raison_sociale\.ilike|localite\.ilike|canton\.ilike/);
		}
	});
});

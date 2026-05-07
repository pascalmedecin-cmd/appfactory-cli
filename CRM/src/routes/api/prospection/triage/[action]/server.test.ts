import { describe, it, expect } from 'vitest';
import { POST } from './+server';

/**
 * Mock Supabase chainable builder (offline, zéro réseau).
 *
 * Pattern : chaque appel à .from(table) instancie un nouveau builder local
 * qui trace le mode (select / update). Le builder est :
 *   - thenable : await sur la fin de chaîne update résout {data, error}
 *   - .maybeSingle() : retour explicite pour la fin de chaîne select
 *
 * Sémantique PostgREST respectée :
 *   .from(t).select(cols).eq(col, v).maybeSingle()  → {data, error}
 *   .from(t).update(payload).eq(col, v)             → awaitable {data, error}
 *
 * Limite assumée : ne valide pas la RLS (runtime Postgres uniquement).
 * Pour test RLS réel, tester en intégration avec session non-admin (cf. règle quality.md).
 */
type MockBehavior = {
	leadFound?: boolean;
	readError?: boolean;
	updateError?: boolean;
	leadStatut?: string; // statut du lead retourné par le SELECT (défaut 'nouveau')
	leadSnoozedUntil?: string | null; // pour test cumul snooze
	capturedUpdate?: { current: Record<string, unknown> | null };
};

type MockResult = { data: unknown; error: { message: string } | null };

function createMockSupabase(behavior: MockBehavior) {
	return {
		from(_table: string) {
			const state: {
				mode: 'select' | 'update' | null;
				payload: Record<string, unknown> | null;
			} = { mode: null, payload: null };

			const builder = {
				select(_cols?: string) {
					state.mode = 'select';
					return builder;
				},
				update(payload: Record<string, unknown>) {
					state.mode = 'update';
					state.payload = payload;
					return builder;
				},
				eq(_col: string, _val: unknown) {
					return builder;
				},
				async maybeSingle(): Promise<MockResult> {
					if (behavior.readError) return { data: null, error: { message: 'read fail' } };
					if (behavior.leadFound) {
						return {
							data: {
								id: '00000000-0000-0000-0000-000000000001',
								statut: behavior.leadStatut ?? 'nouveau',
								triage_snoozed_until: behavior.leadSnoozedUntil ?? null,
							},
							error: null,
						};
					}
					return { data: null, error: null };
				},
				// Thenable : await sur la fin d'un update awaitable
				then(resolve: (v: MockResult) => void) {
					if (state.mode === 'update') {
						if (behavior.capturedUpdate) behavior.capturedUpdate.current = state.payload;
						resolve({
							data: null,
							error: behavior.updateError ? { message: 'upd fail' } : null,
						});
					} else {
						// Fallback : awaitable sur select sans .maybeSingle() → liste vide
						resolve({ data: [], error: null });
					}
				},
			};
			return builder;
		},
	};
}

function makeEvent(
	action: string,
	body: unknown,
	opts: MockBehavior = { leadFound: true }
) {
	const captured = { current: null as Record<string, unknown> | null };
	const supabase = createMockSupabase({ ...opts, capturedUpdate: captured });
	return {
		event: {
			request: new Request('http://test/api/prospection/triage/' + action, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: typeof body === 'string' ? body : JSON.stringify(body),
			}),
			params: { action },
			locals: {
				supabase,
				// Type permissif pour permettre override null dans test "rejette si non authentifié"
				safeGetSession: (async () => ({
					session: { user: { id: 'u1' } },
					user: { id: 'u1' },
				})) as () => Promise<{ session: unknown; user: unknown }>,
			},
		},
		captured,
	};
}

describe('POST /api/prospection/triage/[action]', () => {
	// UUID v4 strict (13e char = '4', 17e char in {8,9,a,b}) - Zod uuid() exige cette conformité.
	const VALID_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

	it('rejette si non authentifié', async () => {
		const { event } = makeEvent('oui', { leadId: VALID_ID });
		event.locals.safeGetSession = async () => ({ session: null, user: null });
		const res = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(res.status).toBe(401);
	});

	it('rejette action inconnue', async () => {
		const { event } = makeEvent('lol', { leadId: VALID_ID });
		const res = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toContain('Action invalide');
	});

	it('rejette body JSON invalide', async () => {
		const { event } = makeEvent('oui', '{not_json');
		const res = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(res.status).toBe(400);
	});

	it('rejette leadId non UUID', async () => {
		const { event } = makeEvent('oui', { leadId: 'pasunuuid' });
		const res = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(res.status).toBe(400);
	});

	it('404 si lead introuvable', async () => {
		const { event } = makeEvent('oui', { leadId: VALID_ID }, { leadFound: false });
		const res = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(res.status).toBe(404);
	});

	it('500 si lecture lead échoue', async () => {
		const { event } = makeEvent('oui', { leadId: VALID_ID }, { readError: true });
		const res = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(res.status).toBe(500);
	});

	it('action oui → set statut interesse + date_modification', async () => {
		const { event, captured } = makeEvent('oui', { leadId: VALID_ID });
		const res = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(res.status).toBe(200);
		expect(captured.current?.statut).toBe('interesse');
		expect(captured.current?.date_modification).toBeTruthy();
	});

	it('action non → set statut ecarte', async () => {
		const { event, captured } = makeEvent('non', { leadId: VALID_ID });
		const res = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(res.status).toBe(200);
		expect(captured.current?.statut).toBe('ecarte');
	});

	it('action plus-tard → snooze ~7 jours dans le futur', async () => {
		const { event, captured } = makeEvent('plus-tard', { leadId: VALID_ID });
		const res = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(res.status).toBe(200);
		const snoozeIso = captured.current?.triage_snoozed_until as string | undefined;
		expect(snoozeIso).toBeTruthy();
		const snooze = new Date(snoozeIso!).getTime();
		const expected = Date.now() + 7 * 86_400_000;
		// Tolérance 5 secondes (test exécution + clock skew)
		expect(Math.abs(snooze - expected)).toBeLessThan(5_000);
	});

	it('500 si UPDATE échoue (préserve atomicité)', async () => {
		const { event } = makeEvent(
			'oui',
			{ leadId: VALID_ID },
			{ leadFound: true, updateError: true }
		);
		const res = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(res.status).toBe(500);
	});

	it('réponse JSON 200 contient ok/action/leadId', async () => {
		const { event } = makeEvent('oui', { leadId: VALID_ID });
		const res = await POST(event as unknown as Parameters<typeof POST>[0]);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(body.action).toBe('oui');
		expect(body.leadId).toBe(VALID_ID);
	});

	// Concurrency : queue partagée 3 fondateurs, anti-écrase silencieux (Bug-hunter H2)
	it('409 si lead déjà traité par un autre fondateur (statut=interesse)', async () => {
		const { event } = makeEvent(
			'non',
			{ leadId: VALID_ID },
			{ leadFound: true, leadStatut: 'interesse' }
		);
		const res = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.currentStatus).toBe('interesse');
	});

	it('409 si lead déjà transféré (statut=transfere)', async () => {
		const { event } = makeEvent(
			'oui',
			{ leadId: VALID_ID },
			{ leadFound: true, leadStatut: 'transfere' }
		);
		const res = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(res.status).toBe(409);
	});

	// Anti-cumul snooze (Bug-hunter M3) : un fondateur ne peut pas repousser indéfiniment
	it('plus-tard sur lead déjà snoozé futur → 200 alreadySnoozed sans écraser', async () => {
		const futureSnooze = new Date(Date.now() + 3 * 86_400_000).toISOString();
		const { event, captured } = makeEvent(
			'plus-tard',
			{ leadId: VALID_ID },
			{ leadFound: true, leadStatut: 'nouveau', leadSnoozedUntil: futureSnooze }
		);
		const res = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.alreadySnoozed).toBe(true);
		expect(body.until).toBe(futureSnooze);
		// Critique : aucun UPDATE ne doit avoir eu lieu
		expect(captured.current).toBeNull();
	});

	it('plus-tard sur lead avec snooze expiré → réapplique le snooze', async () => {
		const pastSnooze = new Date(Date.now() - 86_400_000).toISOString();
		const { event, captured } = makeEvent(
			'plus-tard',
			{ leadId: VALID_ID },
			{ leadFound: true, leadStatut: 'nouveau', leadSnoozedUntil: pastSnooze }
		);
		const res = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(res.status).toBe(200);
		expect(captured.current?.triage_snoozed_until).toBeTruthy();
	});
});

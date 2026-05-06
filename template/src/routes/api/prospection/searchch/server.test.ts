import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock $env/dynamic/private avant l'import du handler.
vi.mock('$env/dynamic/private', () => ({
	env: { SEARCH_CH_API_KEY: 'test-key' },
}));

// Mock signal-lookup et link-import-signal : pas testés ici, retour neutre.
vi.mock('$lib/server/intelligence/signal-lookup', () => ({
	fetchIntelligenceSignalLookup: vi.fn(async () => null),
}));
vi.mock('$lib/server/intelligence/link-import-signal', () => ({
	linkImportSignals: vi.fn(async () => undefined),
}));

import { POST } from './+server';

/**
 * Mock Supabase chainable via Proxy : gère les chains arbitraires
 *   .from(t).select(c).eq(c, v).in(c, [...])
 *   .from(t).insert([...])
 * Toutes les fins de chaîne thenable retournent le résultat pré-configuré pour la table.
 *
 * Pattern issu de feedback_supabase_mock_proxy_pattern.md (S120).
 * Limite : ne valide pas la RLS (runtime Postgres uniquement).
 */
type Behavior = {
	existing?: Array<{ source_id: string }>;
	dismissed?: Array<{ source_id: string; statut: string }>;
	insertError?: string | null;
	capturedInsert?: { current: unknown };
};

function createMockSupabase(behavior: Behavior) {
	return {
		from(_table: string) {
			const state: {
				mode: 'select' | 'insert' | null;
				selectedField: 'source_id' | 'statut' | null;
			} = { mode: null, selectedField: null };

			const builder: Record<string, unknown> = {};
			const proxy: unknown = new Proxy(builder, {
				get(_t, prop: string) {
					if (prop === 'select') {
						return (cols: string) => {
							state.mode = 'select';
							state.selectedField = cols.includes('statut') ? 'statut' : 'source_id';
							return proxy;
						};
					}
					if (prop === 'insert') {
						return (rows: unknown) => {
							state.mode = 'insert';
							if (behavior.capturedInsert) behavior.capturedInsert.current = rows;
							return proxy;
						};
					}
					if (prop === 'eq' || prop === 'in') {
						return () => proxy;
					}
					if (prop === 'then') {
						return (resolve: (v: unknown) => void) => {
							if (state.mode === 'insert') {
								resolve({
									data: null,
									error: behavior.insertError ? { message: behavior.insertError } : null,
								});
								return;
							}
							// select : retourne existing ou dismissed selon le champ sélectionné
							if (state.selectedField === 'statut') {
								resolve({ data: behavior.dismissed ?? [], error: null });
							} else {
								resolve({ data: behavior.existing ?? [], error: null });
							}
						};
					}
					return undefined;
				},
			});
			return proxy;
		},
	};
}

function makeEvent(body: unknown, sessionPresent = true, behavior: Behavior = {}) {
	const captured = { current: null as unknown };
	const supabase = createMockSupabase({ ...behavior, capturedInsert: captured });
	return {
		event: {
			request: new Request('http://test/api/prospection/searchch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: typeof body === 'string' ? body : JSON.stringify(body),
			}),
			locals: {
				safeGetSession: async () => ({
					session: sessionPresent
						? { user: { id: 'u1', email: 'u@filmpro.ch' } }
						: null,
				}),
				supabase,
			},
		},
		captured,
	};
}

// Format réel API search.ch (capturé live 2026-05-06).
const FEED_2_RESULTS = `<?xml version="1.0" encoding="utf-8" ?>
<feed xml:lang="fr" xmlns="http://www.w3.org/2005/Atom" xmlns:tel="http://tel.search.ch/api/spec/result/1.0/">
	<entry>
		<title type="text">Vitrerie Dupont SA</title>
		<link href="https://search.ch/tel/x.html" rel="alternate" type="text/html" />
		<tel:id>aaaaaaaaaaaaaaa1</tel:id>
		<tel:name>Vitrerie Dupont SA</tel:name>
		<tel:phone>+41221234567</tel:phone>
		<tel:street>Rue du Lac</tel:street>
		<tel:streetno>12</tel:streetno>
		<tel:zip>1200</tel:zip>
		<tel:city>Genève</tel:city>
		<tel:canton>GE</tel:canton>
		<tel:category>Vitrerie</tel:category>
		<tel:category>Miroiterie</tel:category>
		<tel:extra type="email">contact@vitreriedupont.ch</tel:extra>
		<tel:extra type="website">https://www.vitreriedupont.ch</tel:extra>
	</entry>
	<entry>
		<title type="text">Façades Martin Sàrl</title>
		<tel:id>bbbbbbbbbbbbbbb2</tel:id>
		<tel:name>Façades Martin Sàrl</tel:name>
		<tel:phone>+41227000000</tel:phone>
		<tel:zip>1227</tel:zip>
		<tel:city>Carouge</tel:city>
		<tel:canton>GE</tel:canton>
		<tel:category>Construction de façades</tel:category>
	</entry>
</feed>`;

describe('POST /api/prospection/searchch', () => {
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockFetch = vi.fn();
		// @ts-expect-error : override global pour le test.
		global.fetch = mockFetch;
	});

	it('refuse si non authentifié (401)', async () => {
		const { event } = makeEvent({ term: 'vitrerie', canton: 'GE' }, false);
		const resp = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(resp.status).toBe(401);
	});

	it('refuse payload invalide : term < 3 chars (400)', async () => {
		const { event } = makeEvent({ term: 'ab', canton: 'GE' });
		const resp = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(resp.status).toBe(400);
		const body = await resp.json();
		expect(body.error).toMatch(/3 caractères/);
	});

	it('refuse term générique : SARL (400)', async () => {
		const { event } = makeEvent({ term: 'SARL', canton: 'GE' });
		const resp = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(resp.status).toBe(400);
		const body = await resp.json();
		expect(body.error).toMatch(/générique/);
	});

	it('refuse canton inconnu (400)', async () => {
		const { event } = makeEvent({ term: 'vitrerie', canton: 'ZH' });
		const resp = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(resp.status).toBe(400);
	});

	it('refuse payload null (400)', async () => {
		const { event } = makeEvent('not-json');
		const resp = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(resp.status).toBe(400);
	});

	it('quota search.ch épuisé (429) → message Quota', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 429,
			text: async () => 'Quota exceeded',
		});
		const { event } = makeEvent({ term: 'vitrerie', canton: 'GE' });
		const resp = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(resp.status).toBe(429);
		const body = await resp.json();
		expect(body.error).toMatch(/Quota/);
	});

	it('clé API invalide/bloquée (403) → 503 + message clé invalide', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 403,
			text: async () => 'Forbidden',
		});
		const { event } = makeEvent({ term: 'vitrerie', canton: 'GE' });
		const resp = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(resp.status).toBe(503);
		const body = await resp.json();
		expect(body.error).toMatch(/Clé API search\.ch invalide ou bloquée/);
	});

	it('erreur serveur search.ch (502)', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 500,
			text: async () => 'Internal',
		});
		const { event } = makeEvent({ term: 'vitrerie', canton: 'GE' });
		const resp = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(resp.status).toBe(502);
	});

	it('erreur réseau search.ch (502)', async () => {
		mockFetch.mockRejectedValueOnce(new Error('network down'));
		const { event } = makeEvent({ term: 'vitrerie', canton: 'GE' });
		const resp = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(resp.status).toBe(502);
		const body = await resp.json();
		expect(body.error).toBe('Erreur réseau search.ch.'); // message générique, pas de leak err
	});

	it('erreur réseau avec URL contenant clé API → message générique côté client', async () => {
		const errWithKey = new Error(
			'TypeError: fetch failed, request to https://search.ch/tel/api/?key=LEAK_THIS_KEY failed',
		);
		mockFetch.mockRejectedValueOnce(errWithKey);
		const { event } = makeEvent({ term: 'vitrerie', canton: 'GE' });
		const resp = await POST(event as unknown as Parameters<typeof POST>[0]);
		const body = await resp.json();
		// Pas de fuite de la clé dans la réponse client.
		expect(body.error).not.toContain('LEAK_THIS_KEY');
		expect(body.error).not.toContain('key=');
	});

	it('timeout (AbortError) → message timeout', async () => {
		const abortErr = new Error('aborted');
		abortErr.name = 'AbortError';
		mockFetch.mockRejectedValueOnce(abortErr);
		const { event } = makeEvent({ term: 'vitrerie', canton: 'GE' });
		const resp = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(resp.status).toBe(502);
		const body = await resp.json();
		expect(body.error).toBe('Timeout search.ch.');
	});

	it('Content-Length > cap (2 Mo) → 502 oversize', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			headers: new Headers({ 'content-length': String(3 * 1024 * 1024) }),
			text: async () => '<feed></feed>',
		});
		const { event } = makeEvent({ term: 'vitrerie', canton: 'GE' });
		const resp = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(resp.status).toBe(502);
		const body = await resp.json();
		expect(body.error).toMatch(/volumineuse/);
	});

	it('aucun résultat search.ch → 200 imported=0', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () => '<feed></feed>',
		});
		const { event } = makeEvent({ term: 'inexistant', canton: 'GE', ville: 'Test' });
		const resp = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(resp.status).toBe(200);
		const body = await resp.json();
		expect(body.imported).toBe(0);
		expect(body.skipped).toBe(0);
		expect(body.total_results).toBe(0);
	});

	it('import nominal : 2 entrées créées', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () => FEED_2_RESULTS,
		});
		const { event, captured } = makeEvent({ term: 'vitrerie', canton: 'GE' });
		const resp = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(resp.status).toBe(200);
		const body = await resp.json();
		expect(body.imported).toBe(2);
		expect(body.skipped).toBe(0);
		expect(body.total_results).toBe(2);

		const inserted = captured.current as Array<Record<string, unknown>>;
		expect(inserted).toHaveLength(2);
		expect(inserted[0].source).toBe('searchch');
		expect(inserted[0].raison_sociale).toBe('Vitrerie Dupont SA');
		expect(inserted[0].telephone).toBe('+41221234567');
		expect(inserted[0].adresse).toBe('Rue du Lac 12');
		expect(inserted[0].npa).toBe('1200');
		expect(inserted[0].canton).toBe('GE');
		expect(inserted[0].statut).toBe('nouveau');
		expect(inserted[0].score_pertinence).toBeTypeOf('number');
		// source_id = tel:id stable préfixé id: (UID search.ch fait foi sur dédup intra-source).
		expect(inserted[0].source_id).toBe('id:aaaaaaaaaaaaaaa1');
		expect(inserted[1].source_id).toBe('id:bbbbbbbbbbbbbbb2');
		// Nouvelles données enrichies extraites du flux.
		expect(inserted[0].email).toBe('contact@vitreriedupont.ch');
		expect(inserted[0].site_web).toBe('https://www.vitreriedupont.ch');
		expect(inserted[0].source_url).toBe('https://search.ch/tel/x.html');
		expect(inserted[0].secteur_detecte).toBe('menuiserie'); // détecté via tel:category
	});

	it('dédup : 2 résultats dont 1 déjà présent → 1 importé, 1 skipped', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () => FEED_2_RESULTS,
		});
		const { event } = makeEvent(
			{ term: 'vitrerie', canton: 'GE' },
			true,
			{ existing: [{ source_id: 'id:aaaaaaaaaaaaaaa1' }] },
		);
		const resp = await POST(event as unknown as Parameters<typeof POST>[0]);
		const body = await resp.json();
		expect(body.imported).toBe(1);
		expect(body.skipped).toBe(1);
	});

	it('dédup : lead déjà écarté → skipped', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () => FEED_2_RESULTS,
		});
		const { event } = makeEvent(
			{ term: 'vitrerie', canton: 'GE' },
			true,
			{ dismissed: [{ source_id: 'id:bbbbbbbbbbbbbbb2', statut: 'ecarte' }] },
		);
		const resp = await POST(event as unknown as Parameters<typeof POST>[0]);
		const body = await resp.json();
		expect(body.imported).toBe(1);
		expect(body.skipped).toBe(1);
	});

	it('insertion DB échoue → 500 message générique (pas de leak schéma)', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () => FEED_2_RESULTS,
		});
		const { event } = makeEvent(
			{ term: 'vitrerie', canton: 'GE' },
			true,
			{ insertError: 'unique constraint "prospect_leads_pkey" violation' },
		);
		const resp = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(resp.status).toBe(500);
		const body = await resp.json();
		// Pas de leak des détails Postgres côté client.
		expect(body.error).not.toContain('constraint');
		expect(body.error).not.toContain('prospect_leads_pkey');
		expect(body.error).toBe('Erreur lors de l\'enregistrement des leads. Réessayez.');
	});

	it('paramètres search.ch corrects : was, wo, firma, maxnum, lang, key', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () => '<feed></feed>',
		});
		const { event } = makeEvent({ term: 'vitrerie', canton: 'VD', ville: 'Lausanne' });
		await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(mockFetch).toHaveBeenCalledOnce();
		const url = new URL(mockFetch.mock.calls[0][0] as string);
		expect(url.origin + url.pathname).toBe('https://search.ch/tel/api/');
		expect(url.searchParams.get('was')).toBe('vitrerie');
		expect(url.searchParams.get('wo')).toBe('Lausanne');
		expect(url.searchParams.get('firma')).toBe('1');
		expect(url.searchParams.get('privat')).toBe('0');
		expect(url.searchParams.get('maxnum')).toBe('20');
		expect(url.searchParams.get('lang')).toBe('fr');
		expect(url.searchParams.get('key')).toBe('test-key');
	});

	it('sans ville → wo = nom canton FR', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () => '<feed></feed>',
		});
		const { event } = makeEvent({ term: 'vitrerie', canton: 'JU' });
		await POST(event as unknown as Parameters<typeof POST>[0]);
		const url = new URL(mockFetch.mock.calls[0][0] as string);
		expect(url.searchParams.get('wo')).toBe('Jura');
	});
});

import { describe, it, expect } from 'vitest';
import {
	isCouleurSlug,
	DEFAULT_COULEUR,
	createCampagne,
	renameCampagne,
	updateCampagne,
	deleteCampagne,
	listCampagnes,
	assignCampagnesToLead,
	assignCampagnesToLeads,
	removeCampagneFromLead,
	fetchCampagnesByLead,
	leadIdsForCampagnes,
	fetchProspectsForCampagne,
	MAX_CAMPAGNE_IDS,
	CAMPAGNE_STATUTS,
	DEFAULT_CAMPAGNE_STATUT,
	isCampagneStatut,
	campagneStatutLabel,
	type Campagne
} from './campagnes';

/**
 * Mock Supabase chainable thenable (Proxy) : chaque méthode enregistre l'appel et renvoie la
 * même chaîne ; `await chaine` (ou `.single()`) résout le résultat configuré. On teste la
 * LOGIQUE du module (validation, traduction d'erreur Postgres, extraction du compte embarqué,
 * dédup/bornage, groupement) — jamais le comportement de supabase-js lui-même.
 */
type SbResult = { data?: unknown; error?: unknown; count?: number | null };
function createSupabaseMock(result: SbResult = {}) {
	const calls: Array<[string, ...unknown[]]> = [];
	const res = { data: result.data ?? null, error: result.error ?? null, count: result.count ?? null };
	const chain: unknown = new Proxy(
		{},
		{
			get(_t, prop: string) {
				if (prop === 'then') {
					return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
						Promise.resolve(res).then(resolve, reject);
				}
				return (...args: unknown[]) => {
					calls.push([prop, ...args]);
					return chain;
				};
			}
		}
	);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const supabase: any = {
		from(t: string) {
			calls.push(['from', t]);
			return chain;
		}
	};
	return { supabase, calls };
}

function arg(calls: Array<[string, ...unknown[]]>, method: string): unknown[] | undefined {
	return calls.find((c) => c[0] === method)?.slice(1);
}

const baseCampagne: Campagne = {
	id: 'cmp-1',
	nom: 'Régies',
	couleur: 'c1',
	description: null,
	archived: false,
	date_creation: '2026-06-23T00:00:00Z',
	created_by: null,
	statut: 'en_cours'
};

describe('isCouleurSlug', () => {
	it('accepte c1..c8, rejette le reste', () => {
		for (const c of ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']) expect(isCouleurSlug(c)).toBe(true);
		for (const c of ['c0', 'c9', 'C1', 'rouge', '', null, undefined, 1]) expect(isCouleurSlug(c)).toBe(false);
	});
});

describe('createCampagne - validation', () => {
	it('rejette un nom vide (invalid, aucune requête)', async () => {
		const m = createSupabaseMock();
		const { data, error } = await createCampagne(m.supabase, { nom: '   ', userId: null });
		expect(data).toBe(null);
		expect(error?.code).toBe('invalid');
		expect(m.calls.find((c) => c[0] === 'from')).toBeUndefined();
	});

	it('rejette un nom trop long (>80)', async () => {
		const m = createSupabaseMock();
		const { error } = await createCampagne(m.supabase, { nom: 'x'.repeat(81), userId: null });
		expect(error?.code).toBe('invalid');
	});

	it('trim le nom + couleur invalide retombe sur le défaut c1', async () => {
		const m = createSupabaseMock({ data: { ...baseCampagne } });
		await createCampagne(m.supabase, { nom: '  Régies  ', couleur: 'rouge', description: '  ', userId: 'u1' });
		expect(arg(m.calls, 'insert')?.[0]).toEqual({
			nom: 'Régies',
			couleur: DEFAULT_COULEUR,
			description: null,
			created_by: 'u1'
		});
	});

	it('couleur valide conservée + description bornée', async () => {
		const m = createSupabaseMock({ data: { ...baseCampagne } });
		await createCampagne(m.supabase, {
			nom: 'Architectes',
			couleur: 'c4',
			description: 'd'.repeat(400),
			userId: null
		});
		const insert = arg(m.calls, 'insert')?.[0] as { couleur: string; description: string };
		expect(insert.couleur).toBe('c4');
		expect(insert.description.length).toBe(280);
	});

	it('conflit de nom (23505) -> erreur duplicate typée', async () => {
		const m = createSupabaseMock({ error: { code: '23505', message: 'dup key' } });
		const { data, error } = await createCampagne(m.supabase, { nom: 'Régies', userId: null });
		expect(data).toBe(null);
		expect(error?.code).toBe('duplicate');
		expect(error?.message).toContain('Régies');
	});
});

describe('renameCampagne', () => {
	it('conflit de nom -> duplicate', async () => {
		const m = createSupabaseMock({ error: { code: '23505', message: 'dup' } });
		const { error } = await renameCampagne(m.supabase, 'cmp-1', 'Régies');
		expect(error?.code).toBe('duplicate');
	});
	it('nom vide -> invalid sans requête', async () => {
		const m = createSupabaseMock();
		const { error } = await renameCampagne(m.supabase, 'cmp-1', '  ');
		expect(error?.code).toBe('invalid');
		expect(m.calls.length).toBe(0);
	});
});

describe('updateCampagne', () => {
	it('couleur invalide -> invalid', async () => {
		const m = createSupabaseMock();
		const { error } = await updateCampagne(m.supabase, 'cmp-1', { couleur: 'mauve' });
		expect(error?.code).toBe('invalid');
		expect(m.calls.length).toBe(0);
	});
	it('patch vide -> invalid', async () => {
		const m = createSupabaseMock();
		const { error } = await updateCampagne(m.supabase, 'cmp-1', {});
		expect(error?.code).toBe('invalid');
	});
	it('archive + description appliquées', async () => {
		const m = createSupabaseMock({ data: { ...baseCampagne, archived: true } });
		await updateCampagne(m.supabase, 'cmp-1', { archived: true, description: '  notes  ' });
		expect(arg(m.calls, 'update')?.[0]).toEqual({ archived: true, description: 'notes' });
	});
	it('statut valide (active) transmis à l’update', async () => {
		const m = createSupabaseMock({ data: { ...baseCampagne, statut: 'active' } });
		const { error } = await updateCampagne(m.supabase, 'cmp-1', { statut: 'active' });
		expect(error).toBe(null);
		expect(arg(m.calls, 'update')?.[0]).toEqual({ statut: 'active' });
	});
	it('statut hors périmètre -> invalid, aucune requête (pas de retombée silencieuse)', async () => {
		const m = createSupabaseMock();
		const { error } = await updateCampagne(m.supabase, 'cmp-1', { statut: 'lance' });
		expect(error?.code).toBe('invalid');
		expect(m.calls.length).toBe(0);
	});
});

describe('statut de campagne (cycle de vie Lot 3)', () => {
	it('CAMPAGNE_STATUTS = en_cours (défaut) + active', () => {
		expect(CAMPAGNE_STATUTS).toEqual(['en_cours', 'active']);
		expect(DEFAULT_CAMPAGNE_STATUT).toBe('en_cours');
	});
	it('isCampagneStatut accepte les 2 valeurs, rejette le reste', () => {
		for (const s of ['en_cours', 'active']) expect(isCampagneStatut(s)).toBe(true);
		for (const s of ['EN_COURS', 'lance', 'archived', '', null, undefined, 1]) expect(isCampagneStatut(s)).toBe(false);
	});
	it('campagneStatutLabel : libellés FR + retombée défaut sur valeur inconnue', () => {
		expect(campagneStatutLabel('en_cours')).toBe('En cours');
		expect(campagneStatutLabel('active')).toBe('Active');
		expect(campagneStatutLabel('garbage')).toBe('En cours');
		expect(campagneStatutLabel(null)).toBe('En cours');
	});
});

describe('deleteCampagne', () => {
	it('appelle delete().eq(id)', async () => {
		const m = createSupabaseMock({});
		const { error } = await deleteCampagne(m.supabase, 'cmp-1');
		expect(error).toBe(null);
		expect(arg(m.calls, 'eq')).toEqual(['id', 'cmp-1']);
	});
});

describe('listCampagnes - extraction du compte embarqué', () => {
	it('mappe prospect_lead_campagnes:[{count}] -> lead_count et retire l’embed', async () => {
		const m = createSupabaseMock({
			data: [
				{ ...baseCampagne, id: 'a', prospect_lead_campagnes: [{ count: 7 }] },
				{ ...baseCampagne, id: 'b', prospect_lead_campagnes: [] }
			]
		});
		const { data } = await listCampagnes(m.supabase);
		expect(data[0]).toMatchObject({ id: 'a', lead_count: 7 });
		expect(data[1]).toMatchObject({ id: 'b', lead_count: 0 });
		expect('prospect_lead_campagnes' in data[0]).toBe(false);
	});

	it('includeArchived:false ajoute eq(archived,false)', async () => {
		const m = createSupabaseMock({ data: [] });
		await listCampagnes(m.supabase, { includeArchived: false });
		expect(arg(m.calls, 'eq')).toEqual(['archived', false]);
	});

	it('includeArchived par défaut -> pas de filtre archived', async () => {
		const m = createSupabaseMock({ data: [] });
		await listCampagnes(m.supabase);
		expect(m.calls.some((c) => c[0] === 'eq')).toBe(false);
	});
});

describe('assignCampagnesToLead', () => {
	it('ids vides -> aucune requête, pas d’erreur', async () => {
		const m = createSupabaseMock();
		const { error } = await assignCampagnesToLead(m.supabase, 'lead-1', []);
		expect(error).toBe(null);
		expect(m.calls.length).toBe(0);
	});

	it('dédoublonne les ids avant upsert', async () => {
		const m = createSupabaseMock({});
		await assignCampagnesToLead(m.supabase, 'lead-1', ['x', 'x', 'y']);
		const rows = arg(m.calls, 'upsert')?.[0] as Array<{ lead_id: string; campagne_id: string }>;
		expect(rows).toEqual([
			{ lead_id: 'lead-1', campagne_id: 'x' },
			{ lead_id: 'lead-1', campagne_id: 'y' }
		]);
	});

	it('campagne inexistante (FK 23503) -> erreur invalid', async () => {
		const m = createSupabaseMock({ error: { code: '23503', message: 'fk' } });
		const { error } = await assignCampagnesToLead(m.supabase, 'lead-1', ['ghost']);
		expect(error?.code).toBe('invalid');
	});
});

describe('removeCampagneFromLead', () => {
	it('delete avec les deux eq (lead + campagne)', async () => {
		const m = createSupabaseMock({});
		await removeCampagneFromLead(m.supabase, 'lead-1', 'cmp-1');
		const eqs = m.calls.filter((c) => c[0] === 'eq').map((c) => c.slice(1));
		expect(eqs).toEqual([
			['lead_id', 'lead-1'],
			['campagne_id', 'cmp-1']
		]);
	});
});

describe('fetchCampagnesByLead', () => {
	it('leadIds vides -> Map vide, aucune requête', async () => {
		const m = createSupabaseMock();
		const map = await fetchCampagnesByLead(m.supabase, []);
		expect(map.size).toBe(0);
		expect(m.calls.length).toBe(0);
	});

	it('groupe par lead + trie les campagnes par nom', async () => {
		const m = createSupabaseMock({
			data: [
				{ lead_id: 'l1', campagnes: { ...baseCampagne, id: 'z', nom: 'Zèbre' } },
				{ lead_id: 'l1', campagnes: { ...baseCampagne, id: 'a', nom: 'Alpha' } },
				{ lead_id: 'l2', campagnes: { ...baseCampagne, id: 'm', nom: 'Milieu' } },
				{ lead_id: 'l1', campagnes: null }
			]
		});
		const map = await fetchCampagnesByLead(m.supabase, ['l1', 'l2']);
		expect(map.get('l1')?.map((c) => c.nom)).toEqual(['Alpha', 'Zèbre']);
		expect(map.get('l2')?.map((c) => c.id)).toEqual(['m']);
	});
});

describe('leadIdsForCampagnes', () => {
	it('ids vides -> [] sans requête', async () => {
		const m = createSupabaseMock();
		expect(await leadIdsForCampagnes(m.supabase, [])).toEqual([]);
		expect(m.calls.length).toBe(0);
	});

	it('dédoublonne les lead_ids du résultat', async () => {
		const m = createSupabaseMock({
			data: [{ lead_id: 'l1' }, { lead_id: 'l2' }, { lead_id: 'l1' }]
		});
		expect(await leadIdsForCampagnes(m.supabase, ['c1'])).toEqual(['l1', 'l2']);
	});

	it('borne le nombre de campagnes du filtre à MAX_CAMPAGNE_IDS', async () => {
		const m = createSupabaseMock({ data: [] });
		const many = Array.from({ length: MAX_CAMPAGNE_IDS + 20 }, (_, i) => `c${i}`);
		await leadIdsForCampagnes(m.supabase, many);
		const inArg = arg(m.calls, 'in') as [string, string[]];
		expect(inArg[0]).toBe('campagne_id');
		expect(inArg[1].length).toBe(MAX_CAMPAGNE_IDS);
	});
});

describe('assignCampagnesToLeads (étiquetage d’un lot importé)', () => {
	it('no-op si aucun lead OU aucune campagne (aucune requête)', async () => {
		const m = createSupabaseMock();
		expect((await assignCampagnesToLeads(m.supabase, [], ['c1'])).error).toBe(null);
		expect((await assignCampagnesToLeads(m.supabase, ['l1'], [])).error).toBe(null);
		expect(m.calls.find((c) => c[0] === 'from')).toBeUndefined();
	});

	it('produit le cross-product leads × campagnes (dédupé) en un seul upsert idempotent', async () => {
		const m = createSupabaseMock();
		await assignCampagnesToLeads(m.supabase, ['l1', 'l1', 'l2'], ['c1', 'c2', 'c1']);
		const upsertArgs = arg(m.calls, 'upsert');
		const rows = upsertArgs?.[0] as Array<{ lead_id: string; campagne_id: string }>;
		expect(rows).toHaveLength(4); // 2 leads distincts × 2 campagnes distinctes
		expect(rows).toContainEqual({ lead_id: 'l1', campagne_id: 'c1' });
		expect(rows).toContainEqual({ lead_id: 'l2', campagne_id: 'c2' });
		expect(upsertArgs?.[1]).toMatchObject({ onConflict: 'lead_id,campagne_id', ignoreDuplicates: true });
	});

	it('FK 23503 -> erreur typée invalid (campagne inexistante), jamais une 500 opaque', async () => {
		const m = createSupabaseMock({ error: { code: '23503', message: 'fk' } });
		const { error } = await assignCampagnesToLeads(m.supabase, ['l1'], ['ghost']);
		expect(error?.code).toBe('invalid');
	});
});

/** Mock PAR TABLE : fetchProspectsForCampagne enchaîne 2 requêtes (lien N-N puis prospect_leads). */
function multiTableMock(byTable: Record<string, SbResult>) {
	const seen: string[] = [];
	const chainFor = (table: string): unknown => {
		const r = byTable[table] ?? {};
		const res = { data: r.data ?? null, error: r.error ?? null, count: r.count ?? null };
		return new Proxy(
			{},
			{
				get(_t, prop: string) {
					if (prop === 'then')
						return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
							Promise.resolve(res).then(resolve, reject);
					return () => chainFor(table);
				}
			}
		);
	};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const supabase: any = { from: (t: string) => { seen.push(t); return chainFor(t); } };
	return { supabase, seen };
}

describe('fetchProspectsForCampagne (panneau étiquettes)', () => {
	it('renvoie [] sans interroger prospect_leads quand la campagne n’a aucun lead', async () => {
		const m = multiTableMock({ prospect_lead_campagnes: { data: [] } });
		const { data, error } = await fetchProspectsForCampagne(m.supabase, 'cmp-1');
		expect(error).toBe(null);
		expect(data).toEqual([]);
		expect(m.seen).not.toContain('prospect_leads'); // court-circuit, pas de 2e requête
	});

	it('résout les lead_ids puis lit prospect_leads, trié par raison sociale', async () => {
		const prospects = [
			{ id: 'L2', raison_sociale: 'Régie du Lac', adresse: 'Quai 1', npa: '1006', localite: 'Lausanne' },
			{ id: 'L1', raison_sociale: 'Boutique Léman', adresse: 'Rue Basse 7', npa: '1201', localite: 'Genève' }
		];
		const m = multiTableMock({
			prospect_lead_campagnes: { data: [{ lead_id: 'L1' }, { lead_id: 'L2' }] },
			prospect_leads: { data: prospects }
		});
		const { data, error } = await fetchProspectsForCampagne(m.supabase, 'cmp-1');
		expect(error).toBe(null);
		expect(data.map((p) => p.raison_sociale)).toEqual(['Boutique Léman', 'Régie du Lac']); // tri FR
		expect(m.seen).toContain('prospect_leads');
	});

	it('erreur DB sur la lecture du LIEN (1re requête) -> error propagée (jamais « campagne vide » silencieuse)', async () => {
		const m = multiTableMock({ prospect_lead_campagnes: { error: { message: 'lien-boom' } } });
		const { data, error } = await fetchProspectsForCampagne(m.supabase, 'cmp-1');
		expect(data).toEqual([]);
		expect(error?.message).toBe('lien-boom'); // ne PAS masquer en {data:[], error:null}
		expect(m.seen).not.toContain('prospect_leads'); // on n'enchaîne pas sur une erreur de lien
	});

	it('erreur DB sur prospect_leads -> data [] + error remontée', async () => {
		const m = multiTableMock({
			prospect_lead_campagnes: { data: [{ lead_id: 'L1' }] },
			prospect_leads: { error: { message: 'boom' } }
		});
		const { data, error } = await fetchProspectsForCampagne(m.supabase, 'cmp-1');
		expect(data).toEqual([]);
		expect(error?.message).toBe('boom');
	});
});

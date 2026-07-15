/**
 * Atelier 209 Run 2 - PREUVE DE CLOISONNEMENT sur base RÉELLE (pas de mocks).
 *
 * Les tests unitaires mockent supabase-js -> ils prouvent que le code APPELLE le filtre marque,
 * jamais que l'étanchéité TIENT en base. Ce fichier exerce les VRAIS hubs contre la base jetable
 * Colima (seed 2 marques) : une marque active ne voit AUCUNE ligne de l'autre. C'est la Definition
 * of Done « fuite » (rules/quality.md + methodology.md § Tests en conditions réelles).
 *
 * Gardé par RUN_INTEGRATION=1 (+ URL/clé service en env) : le `vitest run` par défaut (CI, sans base)
 * le SKIP. Exécution locale :
 *   RUN_INTEGRATION=1 SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx vitest run src/lib/server/marque-leak.test.ts
 * (Prérequis : `supabase db reset` a rejoué la migration marque + le seed 2 marques.)
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	listCampagnes,
	getCampagne,
	fetchProspectsForCampagne,
	fetchCampagnesByLead,
	leadIdsForCampagnes
} from './campagnes';
import type { Database } from '$lib/database.types';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RUN = process.env.RUN_INTEGRATION === '1' && !!URL && !!KEY;

// Fixtures du seed (supabase/seed.sql).
const FP_CAMP = '22222222-0000-0000-0000-0000000000f1'; // « Regies Geneve T4 » (filmpro)
const LED_CAMP = '22222222-0000-0000-0000-0000000000e1'; // « Enseignes Geneve 2026 » (led)
const FP_LEAD = '11111111-0000-0000-0000-0000000000f1'; // Regie du Molard (filmpro)
const LED_LEAD = '11111111-0000-0000-0000-0000000000e1'; // Palexpo Concept (led)
const LED_LEAD_VIDE = '11111111-0000-0000-0000-0000000000e3'; // Neon Craft (led, statut vide)

describe.skipIf(!RUN)('Atelier 209 Run 2 - cloisonnement bi-marque (base jetable réelle)', () => {
	let sb: SupabaseClient<Database>;
	beforeAll(() => {
		// Service role : RLS OFF -> le SEUL filtre en jeu est le `.eq('marque')` applicatif des hubs.
		// C'est exactement ce qu'on veut prouver (le cloisonnement vit dans le code, pas dans la RLS).
		sb = createClient<Database>(URL as string, KEY as string, { auth: { persistSession: false } });
	});

	it('listCampagnes ne renvoie que la marque active (aucun chevauchement)', async () => {
		const fp = await listCampagnes(sb, 'filmpro');
		expect(fp.error).toBeNull();
		expect(fp.data.length).toBe(2);
		expect(fp.data.every((c) => (c as { marque: string }).marque === 'filmpro')).toBe(true);

		const led = await listCampagnes(sb, 'led');
		expect(led.data.length).toBe(2);
		expect(led.data.every((c) => (c as { marque: string }).marque === 'led')).toBe(true);

		const fpIds = new Set(fp.data.map((c) => c.id));
		expect(led.data.some((c) => fpIds.has(c.id))).toBe(false);
	});

	it('getCampagne : une campagne LED est invisible (null) côté filmpro', async () => {
		const cross = await getCampagne(sb, 'filmpro', LED_CAMP);
		expect(cross.error).toBeNull();
		expect(cross.data).toBeNull(); // gate : jamais les données de l'autre marque, même sur id deviné
		const ok = await getCampagne(sb, 'led', LED_CAMP);
		expect(ok.data?.id).toBe(LED_CAMP);
	});

	it('fetchProspectsForCampagne cloisonne les prospects', async () => {
		const fp = await fetchProspectsForCampagne(sb, 'filmpro', FP_CAMP);
		expect(fp.error).toBeNull();
		expect(fp.data.length).toBeGreaterThan(0);
		// Charger une campagne LED avec la marque filmpro -> 0 (liens scopés filmpro).
		const crossed = await fetchProspectsForCampagne(sb, 'filmpro', LED_CAMP);
		expect(crossed.data.length).toBe(0);
	});

	it('fetchCampagnesByLead : un lead LED n\'expose aucune campagne côté filmpro', async () => {
		const fpView = await fetchCampagnesByLead(sb, 'filmpro', [LED_LEAD]);
		expect(fpView.get(LED_LEAD)).toBeUndefined();
		const ledView = await fetchCampagnesByLead(sb, 'led', [LED_LEAD]);
		expect((ledView.get(LED_LEAD) ?? []).length).toBeGreaterThan(0);
	});

	it('leadIdsForCampagnes cloisonne (campagne LED via marque filmpro -> vide)', async () => {
		const led = await leadIdsForCampagnes(sb, 'led', [LED_CAMP]);
		expect(led.length).toBeGreaterThan(0);
		const crossed = await leadIdsForCampagnes(sb, 'filmpro', [LED_CAMP]);
		expect(crossed.length).toBe(0);
	});

	it('comptes cloisonnés (dashboard/reporting-like) : 8 entreprises par marque, 0 fuite', async () => {
		for (const [m, n] of [['filmpro', 8], ['led', 8]] as const) {
			const { count } = await sb.from('entreprises').select('*', { count: 'exact', head: true }).eq('marque', m);
			expect(count).toBe(n);
		}
		// signaux : FilmPro-only ce run (Q2) -> 2 filmpro, 0 led.
		const { count: sigFp } = await sb.from('signaux_affaires').select('*', { count: 'exact', head: true }).eq('marque', 'filmpro');
		const { count: sigLed } = await sb.from('signaux_affaires').select('*', { count: 'exact', head: true }).eq('marque', 'led');
		expect(sigFp).toBe(2);
		expect(sigLed).toBe(0);
	});

	it('Q1 : un même source_id peut coexister dans les 2 marques', async () => {
		const { data } = await sb
			.from('prospect_leads')
			.select('marque')
			.eq('source', 'zefix')
			.eq('source_id', 'ide-commun-999');
		expect(data?.length).toBe(2);
		expect(new Set((data ?? []).map((r) => r.marque))).toEqual(new Set(['filmpro', 'led']));
	});

	it('FK composite : rattacher un lead filmpro à une campagne LED est rejeté en base (23503)', async () => {
		const { error } = await sb
			.from('prospect_lead_campagnes')
			.insert({ lead_id: FP_LEAD, campagne_id: LED_CAMP, marque: 'filmpro' });
		expect(error).not.toBeNull();
		expect(error?.code).toBe('23503'); // (campagne_id, marque) -> campagnes(id, marque) : pas de campagne (LED_CAMP, 'filmpro')
	});

	it('RPC transfer_lead_to_crm propage la marque (jamais de fusion cross-marque)', async () => {
		const { data, error } = await sb.rpc('transfer_lead_to_crm', { p_lead_id: LED_LEAD_VIDE });
		expect(error).toBeNull();
		const entId = (data as { entreprise_id: string }).entreprise_id;
		const { data: ent } = await sb.from('entreprises').select('marque').eq('id', entId).single();
		expect((ent as { marque: string } | null)?.marque).toBe('led');
	});
});

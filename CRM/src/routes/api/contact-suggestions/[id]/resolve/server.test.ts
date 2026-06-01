import { describe, it, expect, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

import { POST } from './+server';

const SID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const ENT = '25087e61-0d78-4e2c-b990-1c9e014dc413';

type MockOpts = {
	suggestion?: Record<string, unknown> | null; // undefined → défaut en_attente
	contact?: { id: string; entreprise_id?: string } | null; // pour le merge : contact cible
	updateRace?: boolean; // l'update conditionnel ne matche aucune ligne (race perdue)
	insertError?: { message: string } | null;
};

function createMock(opts: MockOpts) {
	const calls = { contactInsert: null as unknown, suggestionUpdate: null as unknown, contactDeleted: false };
	const supa = {
		_calls: calls,
		from(table: string) {
			const st = { isUpdate: false };
			const proxy: unknown = new Proxy(
				{},
				{
					get(_t, prop: string) {
						if (prop === 'select') return () => proxy;
						if (prop === 'insert') return (row: unknown) => { if (table === 'contacts') calls.contactInsert = row; return proxy; };
						if (prop === 'update') return (row: unknown) => { st.isUpdate = true; if (table === 'contact_suggestions') calls.suggestionUpdate = row; return proxy; };
						if (prop === 'delete') return () => { if (table === 'contacts') calls.contactDeleted = true; return proxy; };
						if (prop === 'eq') return () => proxy;
						if (prop === 'maybeSingle') return () => {
							if (table === 'contact_suggestions' && !st.isUpdate) {
								const def = { id: SID, statut: 'en_attente', entreprise_id: ENT, prenom: 'Jean', nom: 'Dupont', role_fonction: 'Gérant', telephone: '022 111 11 11', email: 'jean@dupont.ch' };
								return Promise.resolve({ data: opts.suggestion === undefined ? def : opts.suggestion, error: null });
							}
							if (table === 'contact_suggestions' && st.isUpdate) {
								return Promise.resolve({ data: opts.updateRace ? null : { id: SID }, error: null });
							}
							if (table === 'contacts') return Promise.resolve({ data: opts.contact === undefined ? null : opts.contact, error: null });
							return Promise.resolve({ data: null, error: null });
						};
						if (prop === 'then') return (resolve: (v: unknown) => void) => resolve({ data: null, error: opts.insertError ?? null });
						return undefined;
					},
				}
			);
			return proxy;
		},
	};
	return supa;
}

function makeEvent(id: string, body: unknown, opts: MockOpts & { session?: boolean } = {}) {
	const supabase = createMock(opts);
	const event = {
		params: { id },
		request: { json: async () => body },
		locals: {
			supabase,
			safeGetSession: async () => (opts.session === false ? { session: null, user: null } : { session: {}, user: { id: 'u1' } }),
		},
	} as never;
	return { event, supabase };
}

describe('POST /api/contact-suggestions/[id]/resolve', () => {
	it('401 sans session (AC-014)', async () => {
		const { event } = makeEvent(SID, { action: 'valide' }, { session: false });
		expect((await POST(event)).status).toBe(401);
	});

	it('400 id non-UUID', async () => {
		const { event } = makeEvent('pas-un-uuid', { action: 'valide' });
		expect((await POST(event)).status).toBe(400);
	});

	it('400 action inconnue', async () => {
		const { event } = makeEvent(SID, { action: 'fusionner' });
		expect((await POST(event)).status).toBe(400);
	});

	it('404 suggestion introuvable', async () => {
		const { event } = makeEvent(SID, { action: 'valide' }, { suggestion: null });
		expect((await POST(event)).status).toBe(404);
	});

	it('409 si déjà résolue (AC-020 idempotence)', async () => {
		const { event, supabase } = makeEvent(SID, { action: 'valide' }, { suggestion: { id: SID, statut: 'valide', entreprise_id: ENT, nom: 'Dupont' } });
		const res = await POST(event);
		expect(res.status).toBe(409);
		expect(supabase._calls.contactInsert).toBeNull(); // pas de 2e ligne contacts
	});

	it('rejete : statut rejete, aucun contact créé, merged=false', async () => {
		const { event, supabase } = makeEvent(SID, { action: 'rejete' });
		const res = await POST(event);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.statut).toBe('rejete');
		expect(body.merged).toBe(false);
		expect(supabase._calls.contactInsert).toBeNull();
		expect((supabase._calls.suggestionUpdate as Record<string, unknown>).statut).toBe('rejete');
	});

	it('valide sans merge : crée une ligne contacts, merged=false (AC-010)', async () => {
		const { event, supabase } = makeEvent(SID, { action: 'valide' });
		const res = await POST(event);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.statut).toBe('valide');
		expect(body.merged).toBe(false);
		expect(body.contact_id).toBeTruthy();
		const c = supabase._calls.contactInsert as Record<string, unknown>;
		expect(c).toBeTruthy();
		expect(c.nom).toBe('Dupont');
		expect(c.entreprise_id).toBe(ENT);
		expect(c.email_professionnel).toBe('jean@dupont.ch'); // mappe email → email_professionnel
		// merged_contact_id de la suggestion = la ligne contacts créée.
		expect((supabase._calls.suggestionUpdate as Record<string, unknown>).merged_contact_id).toBe(c.id);
	});

	it('valide avec merged_contact_id (même entreprise) : aucune ligne créée, merged=true (fusion)', async () => {
		const { event, supabase } = makeEvent(SID, { action: 'valide', merged_contact_id: 'c-existant' }, { contact: { id: 'c-existant', entreprise_id: ENT } });
		const res = await POST(event);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.merged).toBe(true);
		expect(body.contact_id).toBe('c-existant');
		expect(supabase._calls.contactInsert).toBeNull();
	});

	it('valide avec merged_contact_id introuvable → 404', async () => {
		const { event } = makeEvent(SID, { action: 'valide', merged_contact_id: 'c-fantome' }, { contact: null });
		expect((await POST(event)).status).toBe(404);
	});

	it('valide avec merged_contact_id d\'une AUTRE entreprise → 409 (audit V3 Low, intégrité référentiel)', async () => {
		const { event, supabase } = makeEvent(SID, { action: 'valide', merged_contact_id: 'c-autre' }, { contact: { id: 'c-autre', entreprise_id: 'une-autre-entreprise' } });
		const res = await POST(event);
		expect(res.status).toBe(409);
		expect(supabase._calls.contactInsert).toBeNull();
	});

	it('race perdue (update conditionnel 0 ligne) → 409 + nettoyage orphelin', async () => {
		const { event, supabase } = makeEvent(SID, { action: 'valide' }, { updateRace: true });
		const res = await POST(event);
		expect(res.status).toBe(409);
		expect(supabase._calls.contactDeleted).toBe(true); // contact créé puis nettoyé
	});
});

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('$lib/prospection-flags', () => ({ isProspectionSourceEnabled: vi.fn(() => true) }));

import { POST } from './+server';
import { isProspectionSourceEnabled } from '$lib/prospection-flags';

type ExistingLead = {
	raison_sociale: string | null;
	localite: string | null;
	npa: string | null;
	telephone: string | null;
	email: string | null;
	site_web: string | null;
};

function createMockSupabase(b: {
	existing?: ExistingLead[];
	insertError?: string | null;
	insertedRows?: unknown[] | null; // ce que .select() renvoie après upsert (défaut = lignes capturées)
	captured?: { current: unknown };
}) {
	return {
		from(_table: string) {
			const state: { mode: 'select' | 'insert' } = { mode: 'select' };
			const proxy: unknown = new Proxy(
				{},
				{
					get(_t, prop: string) {
						if (prop === 'select') return () => proxy; // ne change pas le mode
						if (prop === 'upsert')
							return (rows: unknown) => {
								state.mode = 'insert';
								if (b.captured) b.captured.current = rows;
								return proxy;
							};
						if (prop === 'eq' || prop === 'order' || prop === 'range') return () => proxy;
						if (prop === 'then')
							return (resolve: (v: unknown) => void) => {
								if (state.mode === 'insert') {
									if (b.insertError) return resolve({ data: null, error: { message: b.insertError } });
									const captured = (b.captured?.current as unknown[]) ?? [];
									return resolve({ data: b.insertedRows ?? captured, error: null });
								}
								return resolve({ data: b.existing ?? [], error: null });
							};
						return undefined;
					},
				},
			);
			return proxy;
		},
	};
}

function makeEvent(
	body: unknown,
	opts: { session?: boolean; marque?: 'filmpro' | 'led'; existing?: ExistingLead[]; insertError?: string | null; insertedRows?: unknown[] | null } = {},
) {
	const captured = { current: null as unknown };
	const supabase = createMockSupabase({ existing: opts.existing, insertError: opts.insertError, insertedRows: opts.insertedRows, captured });
	const user = { email: 'a@filmpro.ch', app_metadata: {} };
	const event = {
		request: { json: async () => body },
		locals: {
			supabase,
			marque: opts.marque ?? 'filmpro',
			safeGetSession: async () => ({ session: opts.session === false ? null : { user }, user }),
		},
	} as never;
	return { event, captured };
}

const COLS = ['NOM', 'NPA', 'VILLE', 'TELEPHONE', 'EMAIL'];
const MAP = ['raison_sociale', 'npa', 'localite', 'telephone', 'email'];
const EXISTING: ExistingLead[] = [
	{ raison_sociale: 'Regie Existante', localite: 'Genève', npa: '1204', telephone: null, email: null, site_web: null },
];
const ROWS = [
	['Regie Existante', '1204', 'Genève', '', ''], // doublon (nom+localité)
	['Nouvelle Vitrerie SA', '1201', 'Genève', '022 700 00 00', 'contact@nv.ch'], // nouveau
	['', '1206', 'Genève', '', ''], // invalide (raison sociale vide)
];

describe('POST /api/prospection/import-liste', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(isProspectionSourceEnabled).mockReturnValue(true);
	});

	it('401 sans session', async () => {
		const res = await POST(makeEvent({ columns: COLS, mapping: MAP, rows: ROWS }, { session: false }).event);
		expect(res.status).toBe(401);
	});

	it('403 si la source manuel est désactivée', async () => {
		vi.mocked(isProspectionSourceEnabled).mockReturnValue(false);
		const res = await POST(makeEvent({ columns: COLS, mapping: MAP, rows: ROWS }).event);
		expect(res.status).toBe(403);
	});

	it('400 si mapping ≠ colonnes', async () => {
		const res = await POST(makeEvent({ columns: COLS, mapping: ['raison_sociale'], rows: ROWS }).event);
		expect(res.status).toBe(400);
	});

	it('400 si raison_sociale non mappée', async () => {
		const res = await POST(makeEvent({ columns: COLS, mapping: [null, 'npa', 'localite', 'telephone', 'email'], rows: ROWS }).event);
		expect(res.status).toBe(400);
	});

	it('preview : stats correctes (1 nouveau / 1 doublon / 1 invalide) ET aucune écriture', async () => {
		const ev = makeEvent({ preview: true, columns: COLS, mapping: MAP, rows: ROWS }, { existing: EXISTING });
		const res = await POST(ev.event);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.stats).toEqual({ total: 3, toImport: 1, duplicates: 1, invalid: 1 });
		expect(data.sample).toHaveLength(3);
		const states = data.sample.map((s: { state: string }) => s.state);
		expect(states).toContain('new');
		expect(states).toContain('duplicate');
		expect(states).toContain('invalid');
		// L'aperçu n'écrit JAMAIS (aucun upsert capturé) — sinon un import accidentel passerait.
		expect(ev.captured.current).toBeNull();
	});

	it('bornes anti-DoS : rejette >5000 lignes, >60 colonnes, cellule >500 chars', async () => {
		const many = Array.from({ length: 5001 }, () => ['X', '1201', 'Genève', '', '']);
		expect((await POST(makeEvent({ columns: COLS, mapping: MAP, rows: many }).event)).status).toBe(400);

		const cols61 = Array.from({ length: 61 }, (_, i) => `c${i}`);
		const map61 = cols61.map((_, i) => (i === 0 ? 'raison_sociale' : null));
		expect((await POST(makeEvent({ columns: cols61, mapping: map61, rows: [['A']] }).event)).status).toBe(400);

		const bigCell = [['x'.repeat(501), '1201', 'Genève', '', '']];
		expect((await POST(makeEvent({ columns: COLS, mapping: MAP, rows: bigCell }).event)).status).toBe(400);
	});

	it('course TOCTOU : imported = lignes réellement insérées ; le delta compte en doublons', async () => {
		// 2 nouveaux prévus, mais l'upsert n'en insère qu'1 (l'autre a été inséré entre-temps).
		const rows = [['Alpha SA', '1201', 'Genève', '', ''], ['Beta SA', '1204', 'Genève', '', '']];
		const res = await POST(makeEvent({ preview: false, columns: COLS, mapping: MAP, rows }, { insertedRows: [{ id: 'only-one' }] }).event);
		const data = await res.json();
		expect(data.imported).toBe(1);
		expect(data.duplicates).toBe(1); // 0 doublon détecté + 1 « raced »
		expect(data.message).toMatch(/doublon/);
	});

	it('import : insère seulement les nouveaux, marqués marque + source manuel + source_id synthétique', async () => {
		const ev = makeEvent({ preview: false, columns: COLS, mapping: MAP, rows: ROWS }, { existing: EXISTING });
		const res = await POST(ev.event);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.imported).toBe(1);
		expect(data.duplicates).toBe(1);
		expect(data.invalid).toBe(1);
		const inserted = ev.captured.current as Array<Record<string, unknown>>;
		expect(inserted).toHaveLength(1);
		expect(inserted[0].marque).toBe('filmpro');
		expect(inserted[0].source).toBe('manuel');
		expect(String(inserted[0].source_id)).toMatch(/^manuel_/);
		expect(inserted[0].raison_sociale).toBe('Nouvelle Vitrerie SA');
		expect(inserted[0].statut).toBe('vide');
		// canton déduit du NPA 1201 → GE
		expect(inserted[0].canton).toBe('GE');
	});

	it('étanchéité : import LED → lignes marquées marque=led', async () => {
		const ev = makeEvent({ preview: false, columns: COLS, mapping: MAP, rows: [['Neon Concept', '1227', 'Carouge', '', '']] }, { marque: 'led' });
		await POST(ev.event);
		const inserted = ev.captured.current as Array<Record<string, unknown>>;
		expect(inserted).toHaveLength(1);
		expect(inserted[0].marque).toBe('led');
	});

	it('idempotence : ré-import du même fichier → 0 nouveau si tout existe déjà', async () => {
		const existingAll: ExistingLead[] = [
			{ raison_sociale: 'Regie Existante', localite: 'Genève', npa: '1204', telephone: null, email: null, site_web: null },
			{ raison_sociale: 'Nouvelle Vitrerie SA', localite: 'Genève', npa: '1201', telephone: '022 700 00 00', email: 'contact@nv.ch', site_web: null },
		];
		const res = await POST(makeEvent({ preview: false, columns: COLS, mapping: MAP, rows: ROWS }, { existing: existingAll }).event);
		const data = await res.json();
		expect(data.imported).toBe(0);
	});

	it('erreur DB → 500', async () => {
		const res = await POST(makeEvent({ preview: false, columns: COLS, mapping: MAP, rows: [['Nouvelle X', '1201', 'Genève', '', '']] }, { insertError: 'boom' }).event);
		expect(res.status).toBe(500);
	});

	it('assainit les caractères de contrôle (octet NUL) avant insert (pas de 500 Postgres)', async () => {
		const ev = makeEvent({
			preview: false,
			columns: ['NOM', 'NPA', 'VILLE'],
			mapping: ['raison_sociale', 'npa', 'localite'],
			rows: [['Regie\u0000 Naef', '1204', 'Genève']],
		});
		const res = await POST(ev.event);
		expect(res.status).toBe(200);
		const inserted = ev.captured.current as Array<Record<string, unknown>>;
		expect(inserted).toHaveLength(1);
		expect(String(inserted[0].raison_sociale)).not.toContain('\u0000');
		expect(inserted[0].raison_sociale).toBe('Regie Naef');
	});

	it('aperçu et import calculent le MÊME secteur (Vitrier → menuiserie, pas d’aperçu trompeur)', async () => {
		const cols = ['NOM', 'CATEGORIE', 'NPA', 'VILLE'];
		const map = ['raison_sociale', 'secteur_detecte', 'npa', 'localite'];
		const rows = [['Dupont SA', 'Vitrier', '1204', 'Genève']];
		const prev = await POST(makeEvent({ preview: true, columns: cols, mapping: map, rows }).event);
		expect((await prev.json()).sample[0].secteur).toBe('menuiserie');
		const ev = makeEvent({ preview: false, columns: cols, mapping: map, rows });
		await POST(ev.event);
		const inserted = ev.captured.current as Array<Record<string, unknown>>;
		expect(inserted[0].secteur_detecte).toBe('menuiserie');
	});

	it('message d’erreur en français, sans amplification (un seul message)', async () => {
		const bigCell = [['x'.repeat(501), '1201', 'Genève', '', '']];
		const res = await POST(makeEvent({ columns: COLS, mapping: MAP, rows: bigCell }).event);
		expect(res.status).toBe(400);
		const data = await res.json();
		expect(data.error).toContain('Fichier non conforme');
		expect(data.error).toContain('500 caractères');
	});
});

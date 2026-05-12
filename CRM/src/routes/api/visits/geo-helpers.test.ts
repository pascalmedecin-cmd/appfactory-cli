import { describe, it, expect } from 'vitest';
import {
	UUID_RE,
	parseOwner,
	parseOwnerFromBody,
	haversineMeters,
	parseSwissAddress,
	geocodeAddress,
	type GeoResult,
} from './geo-helpers';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';

describe('UUID_RE', () => {
	it('accepte un UUID v4 valide, rejette les non-UUID', () => {
		expect(UUID_RE.test(UUID_A)).toBe(true);
		expect(UUID_RE.test('not-a-uuid')).toBe(false);
		expect(UUID_RE.test('')).toBe(false);
	});
});

describe('parseOwner / parseOwnerFromBody', () => {
	function urlWith(params: Record<string, string>): URL {
		const u = new URL('https://x.test/api/visits');
		for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
		return u;
	}

	it('lead_id seul valide → owner lead', () => {
		expect(parseOwner(urlWith({ lead_id: UUID_A }))).toEqual({ kind: 'lead', id: UUID_A });
	});
	it('entreprise_id seul valide → owner entreprise', () => {
		expect(parseOwner(urlWith({ entreprise_id: UUID_B }))).toEqual({ kind: 'entreprise', id: UUID_B });
	});
	it('les deux fournis → null (ambigu)', () => {
		expect(parseOwner(urlWith({ lead_id: UUID_A, entreprise_id: UUID_B }))).toBeNull();
	});
	it('id présent mais pas un UUID → null', () => {
		expect(parseOwner(urlWith({ lead_id: '42' }))).toBeNull();
	});
	it('aucun id → null', () => {
		expect(parseOwner(urlWith({}))).toBeNull();
	});
	it('parseOwnerFromBody : applique les mêmes règles', () => {
		expect(parseOwnerFromBody({ lead_id: UUID_A })).toEqual({ kind: 'lead', id: UUID_A });
		expect(parseOwnerFromBody({ lead_id: UUID_A, entreprise_id: UUID_B })).toBeNull();
		expect(parseOwnerFromBody({ lead_id: 123 as unknown as string })).toBeNull();
		expect(parseOwnerFromBody({})).toBeNull();
	});
});

describe('haversineMeters', () => {
	it('distance nulle pour deux points identiques', () => {
		expect(haversineMeters(46.5, 6.6, 46.5, 6.6)).toBe(0);
	});
	it('Lausanne ↔ Genève ≈ 50-55 km', () => {
		// Lausanne (46.5197, 6.6323) ↔ Genève (46.2044, 6.1432)
		const d = haversineMeters(46.5197, 6.6323, 46.2044, 6.1432);
		expect(d).toBeGreaterThan(48_000);
		expect(d).toBeLessThan(56_000);
	});
	it('~1° de latitude ≈ 111 km', () => {
		const d = haversineMeters(46, 6, 47, 6);
		expect(d).toBeGreaterThan(110_000);
		expect(d).toBeLessThan(112_000);
	});
	it('symétrique', () => {
		const a = haversineMeters(46.5, 6.6, 47.3, 8.5);
		const b = haversineMeters(47.3, 8.5, 46.5, 6.6);
		expect(Math.abs(a - b)).toBeLessThan(1e-6);
	});
});

describe('parseSwissAddress', () => {
	it('null → tout null', () => {
		expect(parseSwissAddress(null)).toEqual({ adresse: null, npa: null, localite: null });
	});
	it('"Rue du Lac 42, 1000 Lausanne" → décompose rue / NPA / localité', () => {
		expect(parseSwissAddress('Rue du Lac 42, 1000 Lausanne')).toEqual({
			adresse: 'Rue du Lac 42',
			npa: '1000',
			localite: 'Lausanne',
		});
	});
	it('"Avenue de la Gare 1 1003 Lausanne" (sans virgule) → décompose aussi', () => {
		expect(parseSwissAddress('Avenue de la Gare 1 1003 Lausanne')).toEqual({
			adresse: 'Avenue de la Gare 1',
			npa: '1003',
			localite: 'Lausanne',
		});
	});
	it('chaîne sans NPA détectable → tout en adresse', () => {
		expect(parseSwissAddress('Quelque part en Valais')).toEqual({
			adresse: 'Quelque part en Valais',
			npa: null,
			localite: null,
		});
	});
	it('normalise les espaces multiples', () => {
		expect(parseSwissAddress('  Rue   X   3 ,  2000   Neuchâtel ')).toEqual({
			adresse: 'Rue X 3',
			npa: '2000',
			localite: 'Neuchâtel',
		});
	});
});

describe('geocodeAddress (cascade, queryFn injectée)', () => {
	const HIT: GeoResult = { lat: 46.5, lng: 6.6, resolved: 'Lausanne' };

	it('tentative 1 réussie (adresse complète) → ne fait qu’un appel', async () => {
		const calls: string[] = [];
		const qf = async (q: string) => { calls.push(q); return HIT; };
		const r = await geocodeAddress({ adresse: 'Rue X 1', npa: '1000', localite: 'Lausanne', canton: 'VD' }, qf);
		expect(r).toEqual(HIT);
		expect(calls).toHaveLength(1);
		expect(calls[0]).toContain('Rue X 1');
		expect(calls[0]).toContain('1000 Lausanne');
		expect(calls[0]).toContain('VD');
	});

	it('tentative 1 échoue, tentative 2 (NPA+localité) réussit', async () => {
		const calls: string[] = [];
		const qf = async (q: string) => { calls.push(q); return calls.length === 1 ? null : HIT; };
		const r = await geocodeAddress({ adresse: 'Rue inconnue 99', npa: '1003', localite: 'Lausanne', canton: 'VD' }, qf);
		expect(r).toEqual(HIT);
		expect(calls).toHaveLength(2);
		expect(calls[1]).toBe('1003 Lausanne VD');
	});

	it('pas d’adresse ni NPA, juste localité → query niveau ville', async () => {
		const calls: string[] = [];
		const qf = async (q: string) => { calls.push(q); return HIT; };
		const r = await geocodeAddress({ localite: 'Sion', canton: 'VS' }, qf);
		expect(r).toEqual(HIT);
		expect(calls).toEqual(['Sion VS']);
	});

	it('toutes les tentatives échouent → null', async () => {
		const qf = async () => null;
		const r = await geocodeAddress({ adresse: 'X', npa: '1000', localite: 'Y', canton: 'VD' }, qf);
		expect(r).toBeNull();
	});

	it('aucune donnée d’adresse → null sans appel', async () => {
		const calls: string[] = [];
		const qf = async (q: string) => { calls.push(q); return HIT; };
		const r = await geocodeAddress({ adresse: '  ', npa: null, localite: '', canton: 'VD' }, qf);
		expect(r).toBeNull();
		expect(calls).toHaveLength(0);
	});
});

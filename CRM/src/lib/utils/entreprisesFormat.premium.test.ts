/**
 * Stress tests Vague 2 (ligne premium) - helpers PURS de entreprisesFormat.
 * Objectif : zéro bug, 100% propre. On teste les cas nominaux PUIS on fuzze les
 * invariants durs (jamais throw, structure de sortie toujours valide, bornes des
 * compteurs) sur des milliers de cas aléatoires reproductibles (PRNG seedé).
 */
import { describe, it, expect } from 'vitest';
import {
	buildActiveStageByEntreprise,
	sourceMetaFor,
	relativeTimeFr,
	type OppForStage,
	type StageVariant,
	type SourceVariant,
} from './entreprisesFormat';

/* ---- PRNG seedé (mulberry32) : fuzz reproductible, sans Math.random ---- */
function rng(seed: number) {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
const pick = <T>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length)];

const STAGE_VARIANTS: StageVariant[] = ['import', 'enrich', 'qualify', 'convert'];
const SOURCE_VARIANTS: SourceVariant[] = ['zefix', 'google', 'terrain', 'veille', 'neutral'];

const opp = (entreprise_id: string | null, etape_pipeline: string | null): OppForStage => ({
	entreprise_id,
	etape_pipeline,
});

describe('buildActiveStageByEntreprise', () => {
	it('mappe une étape active connue avec la bonne variante', () => {
		const m = buildActiveStageByEntreprise([opp('e1', 'identification')]);
		expect(m.get('e1')).toEqual({ key: 'identification', label: 'Identification', variant: 'import' });
	});

	it('retient l’étape la PLUS AVANCÉE quand une entreprise a plusieurs affaires', () => {
		const m = buildActiveStageByEntreprise([
			opp('e1', 'qualification'),
			opp('e1', 'negociation'),
			opp('e1', 'identification'),
		]);
		expect(m.get('e1')).toEqual({ key: 'negociation', label: 'Négociation', variant: 'convert' });
	});

	it('mappe les 4 étapes actives sur la palette workflow dans l’ordre', () => {
		const m = buildActiveStageByEntreprise([
			opp('a', 'identification'),
			opp('b', 'qualification'),
			opp('c', 'proposition'),
			opp('d', 'negociation'),
		]);
		expect(m.get('a')!.variant).toBe('import');
		expect(m.get('b')!.variant).toBe('enrich');
		expect(m.get('c')!.variant).toBe('qualify');
		expect(m.get('d')!.variant).toBe('convert');
	});

	it('ignore les étapes closes (gagne/perdu), inconnues, et les lignes incomplètes', () => {
		const m = buildActiveStageByEntreprise([
			opp('w', 'gagne'),
			opp('l', 'perdu'),
			opp('x', 'etape_bidon'),
			opp(null, 'negociation'),
			opp('y', null),
			opp('z', ''),
		]);
		expect(m.size).toBe(0);
	});

	it('entrée vide → map vide', () => {
		expect(buildActiveStageByEntreprise([]).size).toBe(0);
	});
});

describe('sourceMetaFor', () => {
	it('mappe les sources connues (insensible casse + trim)', () => {
		expect(sourceMetaFor('zefix')).toEqual({ label: 'Zefix', variant: 'zefix' });
		expect(sourceMetaFor('  ZEFIX  ')).toEqual({ label: 'Zefix', variant: 'zefix' });
		expect(sourceMetaFor('google')).toEqual({ label: 'Google', variant: 'google' });
		expect(sourceMetaFor('google_places')).toEqual({ label: 'Google', variant: 'google' });
		expect(sourceMetaFor('lead_express')).toEqual({ label: 'Terrain', variant: 'terrain' });
		expect(sourceMetaFor('terrain')).toEqual({ label: 'Terrain', variant: 'terrain' });
		expect(sourceMetaFor('veille')).toEqual({ label: 'Veille', variant: 'veille' });
		expect(sourceMetaFor('search_ch')).toEqual({ label: 'search.ch', variant: 'neutral' });
		expect(sourceMetaFor('simap')).toEqual({ label: 'SIMAP', variant: 'neutral' });
		expect(sourceMetaFor('manuel')).toEqual({ label: 'Import manuel', variant: 'neutral' });
	});

	it('null / vide / espaces / non-string → null (pas de pill)', () => {
		expect(sourceMetaFor(null)).toBeNull();
		expect(sourceMetaFor(undefined)).toBeNull();
		expect(sourceMetaFor('')).toBeNull();
		expect(sourceMetaFor('   ')).toBeNull();
		// @ts-expect-error robustesse runtime sur entrée non-string
		expect(sourceMetaFor(123)).toBeNull();
		// @ts-expect-error robustesse runtime sur objet
		expect(sourceMetaFor({})).toBeNull();
	});

	it('source inconnue → affichée telle quelle en neutre, tronquée au-delà de 18', () => {
		expect(sourceMetaFor('PartenaireX')).toEqual({ label: 'PartenaireX', variant: 'neutral' });
		const long = sourceMetaFor('A'.repeat(50))!;
		expect(long.variant).toBe('neutral');
		expect(long.label.endsWith('…')).toBe(true);
		expect(long.label.length).toBeLessThanOrEqual(18);
	});
});

describe('relativeTimeFr', () => {
	const now = new Date('2026-06-19T12:00:00.000Z');
	const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
	const D = 86_400_000;

	it('formate les paliers FR', () => {
		expect(relativeTimeFr(now.toISOString(), now)).toBe("à l'instant");
		expect(relativeTimeFr(ago(30 * 60_000), now)).toBe("aujourd'hui");
		expect(relativeTimeFr(ago(1 * D), now)).toBe('hier');
		expect(relativeTimeFr(ago(3 * D), now)).toBe('il y a 3 j');
		expect(relativeTimeFr(ago(10 * D), now)).toBe('il y a 1 sem');
		expect(relativeTimeFr(ago(40 * D), now)).toBe('il y a 1 mois');
		expect(relativeTimeFr(ago(400 * D), now)).toBe('il y a 1 an');
		expect(relativeTimeFr(ago(800 * D), now)).toBe('il y a 2 ans');
	});

	it('futur → "a l\'instant" (jamais de négatif)', () => {
		expect(relativeTimeFr(new Date(now.getTime() + 5 * D).toISOString(), now)).toBe("à l'instant");
	});

	it('entrée invalide / absente → chaîne vide', () => {
		expect(relativeTimeFr(null, now)).toBe('');
		expect(relativeTimeFr(undefined, now)).toBe('');
		expect(relativeTimeFr('pas-une-date', now)).toBe('');
		expect(relativeTimeFr('', now)).toBe('');
	});
});

/* ============================ FUZZ / STRESS ============================== */

describe('STRESS : invariants durs sur 5000 cas aléatoires (PRNG seedé)', () => {
	const ETAPES = ['identification', 'qualification', 'proposition', 'negociation', 'gagne', 'perdu', 'xxx', null, ''];
	const SOURCES = ['zefix', 'google', 'google_places', 'terrain', 'lead_express', 'veille', 'search_ch', 'simap', 'manuel', 'Truc', '', '   ', 'X'.repeat(60), null, undefined];
	const WEIRD_STRINGS = ['', ' ', '<script>alert(1)</script>', '😀', 'a'.repeat(300), '\n\t', '0', 'null', '../../etc'];

	it('buildActiveStageByEntreprise : sortie toujours bien formée, jamais throw', () => {
		const r = rng(67890);
		for (let run = 0; run < 5000; run++) {
			const opps: OppForStage[] = Array.from({ length: Math.floor(r() * 50) }, () =>
				opp(r() < 0.2 ? null : `e${Math.floor(r() * 20)}`, pick(r, ETAPES))
			);
			let m!: Map<string, { key: string; label: string; variant: StageVariant }>;
			expect(() => (m = buildActiveStageByEntreprise(opps))).not.toThrow();
			for (const [k, v] of m) {
				expect(typeof k).toBe('string');
				expect(k.length).toBeGreaterThan(0);
				expect(STAGE_VARIANTS).toContain(v.variant);
				expect(typeof v.label).toBe('string');
				expect(v.label.length).toBeGreaterThan(0);
				// seules les 4 étapes actives sont mappables
				expect(['identification', 'qualification', 'proposition', 'negociation']).toContain(v.key);
			}
		}
	});

	it('sourceMetaFor : null ou {label non-vide, variant connue}, jamais throw', () => {
		const r = rng(2468);
		const pool = [...SOURCES, ...WEIRD_STRINGS];
		for (let i = 0; i < 5000; i++) {
			const s = pick(r, pool);
			let res: ReturnType<typeof sourceMetaFor>;
			expect(() => (res = sourceMetaFor(s as string | null | undefined))).not.toThrow();
			res = sourceMetaFor(s as string | null | undefined);
			if (res !== null) {
				expect(typeof res.label).toBe('string');
				expect(res.label.length).toBeGreaterThan(0);
				expect(res.label.length).toBeLessThanOrEqual(18);
				expect(SOURCE_VARIANTS).toContain(res.variant);
			}
		}
	});

	it('relativeTimeFr : toujours une string, jamais throw, jamais de signe négatif', () => {
		const r = rng(13579);
		const now = new Date('2026-06-19T12:00:00.000Z');
		const inputs: (string | null | undefined)[] = [
			null,
			undefined,
			'',
			'pas-une-date',
			'2020-01-01',
			'2030-12-31T23:59:59Z',
			new Date().toISOString(),
			...WEIRD_STRINGS,
		];
		for (let i = 0; i < 5000; i++) {
			// mélange : entrées listées + ISO aléatoires sur +/- ~5 ans
			const useIso = r() < 0.5;
			const iso = useIso
				? new Date(now.getTime() + (r() - 0.5) * 3650 * 86_400_000).toISOString()
				: pick(r, inputs);
			let out!: string;
			expect(() => (out = relativeTimeFr(iso, now))).not.toThrow();
			expect(typeof out).toBe('string');
			expect(out).not.toContain('-');
			expect(out).not.toContain('NaN');
			expect(out).not.toContain('undefined');
		}
	});
	// timeout 60s : 4 fuzz-tests de 5000 cas chacun (CPU-bound). Sous la charge de la
	// suite complète (contention CPU multi-fichiers), un run peut atteindre ~28s ; le
	// plafond de 20s était trop serré et rendait ce bloc flaky (faux rouge en CI).
}, 60000);

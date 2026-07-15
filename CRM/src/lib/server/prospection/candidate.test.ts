import { describe, it, expect } from 'vitest';
import {
	type CandidateCore,
	statusFor,
	isImportable,
	scoreCandidate,
	candidateToInsertRow,
	toPublicCandidate,
	sanitizeGoogleTypes,
	type DedupSets,
} from './candidate';

const baseCore = (over: Partial<CandidateCore> = {}): CandidateCore => ({
	source: 'search_ch',
	source_id: 's1',
	source_url: null,
	raison_sociale: 'Régie Test SA',
	adresse: null,
	npa: null,
	localite: 'Genève',
	canton: 'GE',
	telephone: '022 111 11 11',
	site_web: null,
	email: null,
	secteur_detecte: null,
	description: null,
	date_publication: null,
	google_types: null,
	...over,
});

describe('sanitizeGoogleTypes (allowlist par filtrage, jamais all-or-nothing)', () => {
	it('filtre les tokens non conformes au lieu de rejeter le lot ; borne à 20', () => {
		expect(sanitizeGoogleTypes(['real_estate_agency', 'Bad Token', 'a'.repeat(200), 'store'], 'google_places')).toEqual([
			'real_estate_agency',
			'store'
		]);
		expect(sanitizeGoogleTypes(Array.from({ length: 30 }, () => 'store'), 'google_places')).toHaveLength(20);
	});
	it('null si source non-Google, liste vide, ou aucun token conforme', () => {
		expect(sanitizeGoogleTypes(['real_estate_agency'], 'zefix')).toBe(null);
		expect(sanitizeGoogleTypes([], 'google_places')).toBe(null);
		expect(sanitizeGoogleTypes(['NOPE'], 'google_places')).toBe(null);
		expect(sanitizeGoogleTypes(null, 'google_places')).toBe(null);
	});
});

const sets = (existing: string[] = [], dismissed: string[] = []): DedupSets => ({
	existing: new Set(existing),
	dismissed: new Set(dismissed),
});

describe('candidate — statusFor / isImportable', () => {
	it('new par défaut', () => {
		expect(statusFor('s1', sets())).toBe('new');
		expect(isImportable('new')).toBe(true);
	});
	it('exists si déjà présent (prioritaire sur known_zefix)', () => {
		expect(statusFor('s1', sets(['s1']), true)).toBe('exists');
		expect(isImportable('exists')).toBe(false);
	});
	it('dismissed si écarté/transféré', () => {
		expect(statusFor('s1', sets([], ['s1']))).toBe('dismissed');
		expect(isImportable('dismissed')).toBe(false);
	});
	it('known_zefix si connu mais non présent → importable', () => {
		expect(statusFor('s1', sets(), true)).toBe('known_zefix');
		expect(isImportable('known_zefix')).toBe(true);
	});
});

describe('candidate — scoreCandidate', () => {
	it('retourne un nombre (canton prioritaire + tel comptés)', () => {
		const score = scoreCandidate(baseCore());
		expect(score).toBeTypeOf('number');
		expect(score).toBeGreaterThan(0);
	});
	it('un canton null ne reçoit pas de bonus canton (score moindre)', () => {
		const withCanton = scoreCandidate(baseCore({ canton: 'GE' }));
		const without = scoreCandidate(baseCore({ canton: null }));
		expect(without).toBeLessThan(withCanton);
	});
});

describe('candidate — candidateToInsertRow', () => {
	it('construit une ligne serveur (id/dates/statut serveur, score injecté)', () => {
		const row = candidateToInsertRow(baseCore(), 7, { now: '2026-06-18T00:00:00.000Z', fromIntelligence: null, fromTerm: null, marque: 'filmpro' });
		expect(row.statut).toBe('vide');
		expect(row.score_pertinence).toBe(7);
		expect(row.marque).toBe('filmpro');
		expect(row.source).toBe('search_ch');
		expect(row.date_import).toBe('2026-06-18T00:00:00.000Z');
		expect(typeof row.id).toBe('string');
		expect((row.id as string).length).toBeGreaterThan(10); // UUID serveur
		expect(row.raison_sociale).toBe('Régie Test SA');
	});
	it('propage la traçabilité Veille quand fournie', () => {
		const row = candidateToInsertRow(baseCore(), 3, { now: 'x', fromIntelligence: 'rep-1', fromTerm: 'régie', marque: 'filmpro' });
		expect(row.source_intelligence_id).toBe('rep-1');
		expect(row.source_intelligence_term).toBe('régie');
	});
});

describe('candidate — toPublicCandidate', () => {
	it('projette tempId = source_id + statut + importable', () => {
		const pub = toPublicCandidate(baseCore(), 5, 'new');
		expect(pub.tempId).toBe('s1');
		expect(pub.score_pertinence).toBe(5);
		expect(pub.status_hint).toBe('new');
		expect(pub.importable).toBe(true);
		expect(pub.raison_sociale).toBe('Régie Test SA');
	});
	it('un statut exists → non importable', () => {
		expect(toPublicCandidate(baseCore(), 5, 'exists').importable).toBe(false);
	});
});

import { describe, it, expect, beforeEach, vi } from 'vitest';

// `$app/environment` n'existe pas hors du runtime SvelteKit. Mock minimal pour
// `error-capture.ts` (qui lit `browser` pour décider d'installer ses listeners).
vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

import {
	FeedbackCreateSchema,
	FeedbackUpdateStatusSchema,
	FeedbackUpdateNotesSchema,
	validate,
} from './schemas';
import { buildPageOptions, pagesForUrl, FALLBACK_PAGE } from '$lib/feedback/pages';
import { toExportPayload, toExportJson, exportFilename } from '$lib/feedback/export';
import { errorCapture, ERROR_CAPTURE_MAX, ERROR_CAPTURE_WINDOW_MS } from '$lib/feedback/error-capture';
import {
	FEEDBACK_TYPES,
	FEEDBACK_SEVERITIES,
	FEEDBACK_STATUSES,
	STATUS_BADGE_CLASSES,
	TYPE_BADGE_CLASSES,
} from '$lib/feedback/options';
import type { FeedbackEntry } from '$lib/feedback/types';

// -- Helpers communs ---------------------------------------------------------

function makeEntry(overrides: Partial<FeedbackEntry> = {}): FeedbackEntry {
	return {
		id: '00000000-0000-4000-8000-000000000001',
		created_at: '2026-05-13T10:00:00.000Z',
		created_by: '00000000-0000-4000-8000-000000000abc',
		created_by_email: 'antoine@filmpro.ch',
		type: 'bug',
		severity: 'genant',
		page: '/pipeline',
		description: 'Quand je glisse une carte, elle revient à sa place.',
		context: {
			url: 'https://filmpro-crm.vercel.app/pipeline',
			viewport: { w: 1920, h: 1080 },
			userAgent: 'Mozilla/5.0',
			recentErrors: [],
		},
		status: 'nouveau',
		admin_notes: null,
		updated_at: '2026-05-13T10:00:00.000Z',
		...overrides,
	};
}

// -- Schemas -----------------------------------------------------------------

describe('FeedbackCreateSchema (spec § 8.1)', () => {
	const baseBug = {
		type: 'bug' as const,
		severity: 'genant' as const,
		page: '/pipeline',
		description: 'Description suffisamment longue pour passer le min.',
		context: '',
	};

	it('accepte un bug bien formé avec sévérité', () => {
		const r = validate(FeedbackCreateSchema, baseBug);
		expect(r.success).toBe(true);
	});

	it('rejette un bug sans sévérité', () => {
		const r = validate(FeedbackCreateSchema, { ...baseBug, severity: '' });
		expect(r.success).toBe(false);
		if (!r.success) expect(r.error).toMatch(/Sévérité requise/);
	});

	it('rejette une suggestion AVEC sévérité', () => {
		const r = validate(FeedbackCreateSchema, {
			...baseBug,
			type: 'suggestion',
			severity: 'mineur',
		});
		expect(r.success).toBe(false);
	});

	it('rejette une description < 10 caractères', () => {
		const r = validate(FeedbackCreateSchema, { ...baseBug, description: 'trop court' });
		// "trop court" = 10 chars exactement, on force vraiment < 10
		const r2 = validate(FeedbackCreateSchema, { ...baseBug, description: 'court' });
		expect(r2.success).toBe(false);
		// "trop court" = 10 → ok (min inclusif)
		expect(r.success).toBe(true);
	});

	it('rejette une description > 1000 caractères', () => {
		const r = validate(FeedbackCreateSchema, { ...baseBug, description: 'a'.repeat(1001) });
		expect(r.success).toBe(false);
	});

	it('rejette un type inconnu', () => {
		const r = validate(FeedbackCreateSchema, { ...baseBug, type: 'compliment' });
		expect(r.success).toBe(false);
	});

	it('accepte un context JSON valide (parse + transform)', () => {
		const ctx = JSON.stringify({
			url: 'https://x.test/y',
			viewport: { w: 1920, h: 1080 },
			userAgent: 'UA',
			recentErrors: [],
		});
		const r = validate(FeedbackCreateSchema, { ...baseBug, context: ctx });
		expect(r.success).toBe(true);
		if (r.success) {
			expect(r.data.context).not.toBeNull();
			expect(r.data.context!.url).toBe('https://x.test/y');
		}
	});

	it('transforme un context vide en null', () => {
		const r = validate(FeedbackCreateSchema, { ...baseBug, context: '' });
		expect(r.success).toBe(true);
		if (r.success) expect(r.data.context).toBeNull();
	});

	it('transforme un context JSON invalide en null (silencieux)', () => {
		const r = validate(FeedbackCreateSchema, { ...baseBug, context: '{not-json' });
		expect(r.success).toBe(true);
		if (r.success) expect(r.data.context).toBeNull();
	});

	it('accepte une suggestion sans sévérité', () => {
		const r = validate(FeedbackCreateSchema, {
			...baseBug,
			type: 'suggestion',
			severity: '',
		});
		expect(r.success).toBe(true);
	});
});

describe('FeedbackUpdateStatusSchema (spec § 8.2)', () => {
	const okId = '11111111-1111-4111-8111-111111111111';

	it('accepte les 4 statuts valides', () => {
		for (const status of FEEDBACK_STATUSES) {
			const r = validate(FeedbackUpdateStatusSchema, { id: okId, status });
			expect(r.success).toBe(true);
		}
	});

	it('rejette un statut inconnu', () => {
		const r = validate(FeedbackUpdateStatusSchema, { id: okId, status: 'wontfix' });
		expect(r.success).toBe(false);
	});

	it('rejette un id non-UUID', () => {
		const r = validate(FeedbackUpdateStatusSchema, { id: 'pas-un-uuid', status: 'nouveau' });
		expect(r.success).toBe(false);
	});
});

describe('FeedbackUpdateNotesSchema', () => {
	const okId = '11111111-1111-4111-8111-111111111111';

	it('accepte une note vide', () => {
		const r = validate(FeedbackUpdateNotesSchema, { id: okId, admin_notes: '' });
		expect(r.success).toBe(true);
	});

	it('accepte une note de 2000 caractères', () => {
		const r = validate(FeedbackUpdateNotesSchema, { id: okId, admin_notes: 'x'.repeat(2000) });
		expect(r.success).toBe(true);
	});

	it('rejette une note > 2000 caractères', () => {
		const r = validate(FeedbackUpdateNotesSchema, { id: okId, admin_notes: 'x'.repeat(2001) });
		expect(r.success).toBe(false);
	});
});

// -- rôles (déplacé) ---------------------------------------------------------

// Les rôles (admin / superuser / user) sont testés dans src/lib/server/roles.test.ts
// depuis la refonte Atelier 209 (Run 1). L'ancien helper isAdminEmail / la constante
// ADMIN_EMAIL de $lib/feedback/admin ont été remplacés par $lib/server/roles.

// -- pages -------------------------------------------------------------------

describe('buildPageOptions / pagesForUrl (spec § 8.5)', () => {
	it('buildPageOptions inclut les pages primaires + secondaires + fallback', () => {
		const opts = buildPageOptions();
		// Au moins les pages connues du CRM doivent être présentes.
		expect(opts.some((o) => o.href === '/crm/contacts')).toBe(true);
		expect(opts.some((o) => o.href === '/crm/pipeline')).toBe(true);
		expect(opts.some((o) => o.href === '/crm/aide')).toBe(true);
		// Le fallback est en dernière position.
		expect(opts[opts.length - 1]).toEqual(FALLBACK_PAGE);
	});

	it('buildPageOptions exclut /log (qui est l\'écran de saisie lui-même)', () => {
		const opts = buildPageOptions();
		expect(opts.some((o) => o.href === '/crm/log')).toBe(false);
	});

	it('pagesForUrl(/contacts) → option Contacts', () => {
		const p = pagesForUrl('/crm/contacts');
		expect(p.href).toBe('/crm/contacts');
		expect(p.label).toBe('Contacts');
	});

	it('pagesForUrl(/contacts/abc/123) matche /contacts par préfixe', () => {
		const p = pagesForUrl('/crm/contacts/abc/123');
		expect(p.href).toBe('/crm/contacts');
	});

	it('pagesForUrl(/crm) → option Dashboard, sans matcher tout par accident', () => {
		const p = pagesForUrl('/crm');
		expect(p.href).toBe('/crm');
		// vérif anti-régression : /crm (dashboard) ne match pas /crm/pipeline
		const p2 = pagesForUrl('/crm/pipeline');
		expect(p2.href).toBe('/crm/pipeline');
	});

	it('pagesForUrl(/) → fallback (la home portail n\'est pas une page CRM)', () => {
		expect(pagesForUrl('/')).toEqual(FALLBACK_PAGE);
	});

	it('pagesForUrl(/inconnu) → fallback Autre / hors CRM', () => {
		const p = pagesForUrl('/inconnu');
		expect(p).toEqual(FALLBACK_PAGE);
		expect(p.label).toBe('Autre / hors CRM');
	});

	it('pagesForUrl ignore les query params et hash', () => {
		expect(pagesForUrl('/crm/pipeline?view=mois').href).toBe('/crm/pipeline');
		expect(pagesForUrl('/crm/pipeline#section').href).toBe('/crm/pipeline');
	});
});

// -- export ------------------------------------------------------------------

describe('toExportPayload / toExportJson / exportFilename (spec § 8.4)', () => {
	const e1 = makeEntry({ id: 'aaa', created_at: '2026-05-13T08:00:00.000Z' });
	const e2 = makeEntry({ id: 'bbb', created_at: '2026-05-13T12:00:00.000Z' });
	const e3 = makeEntry({ id: 'ccc', created_at: '2026-05-12T20:00:00.000Z' });

	it('toExportPayload trie par created_at desc (le plus récent en premier)', () => {
		const out = toExportPayload([e1, e2, e3]);
		expect(out.map((e) => e.id)).toEqual(['bbb', 'aaa', 'ccc']);
	});

	it('toExportPayload ne mute pas le tableau source', () => {
		const src = [e1, e2, e3];
		const copy = src.slice();
		toExportPayload(src);
		expect(src).toEqual(copy);
	});

	it('toExportPayload expose exactement les 10 champs de la spec § 6.5', () => {
		const out = toExportPayload([e1]);
		const expected = [
			'id',
			'created_at',
			'created_by_email',
			'type',
			'severity',
			'page',
			'description',
			'context',
			'status',
			'admin_notes',
		].sort();
		expect(Object.keys(out[0]).sort()).toEqual(expected);
		// Et notamment pas de created_by (uuid auth) ni updated_at.
		expect('created_by' in out[0]).toBe(false);
		expect('updated_at' in out[0]).toBe(false);
	});

	it('toExportJson retourne un Blob application/json UTF-8 parseable', async () => {
		const blob = toExportJson([e1, e2]);
		expect(blob).toBeInstanceOf(Blob);
		expect(blob.type).toBe('application/json;charset=utf-8');
		const text = await blob.text();
		const parsed = JSON.parse(text);
		expect(Array.isArray(parsed)).toBe(true);
		expect(parsed).toHaveLength(2);
		// Ordre desc préservé.
		expect(parsed[0].id).toBe('bbb');
	});

	it('toExportJson encode correctement les accents (UTF-8)', async () => {
		const e = makeEntry({ description: 'Carte « Gênant » – à corriger d\'urgence.' });
		const text = await toExportJson([e]).text();
		expect(text).toContain('Gênant');
		expect(text).toContain('à corriger');
	});

	it('exportFilename retourne feedback-YYYY-MM-DD.json', () => {
		const f = exportFilename(new Date('2026-05-13T15:30:00.000Z'));
		// Le format dépend du fuseau local : on accepte mai 12 ou 13 selon TZ.
		expect(f).toMatch(/^feedback-2026-05-1[23]\.json$/);
	});

	it('exportFilename pad le mois et le jour à 2 chiffres', () => {
		const f = exportFilename(new Date(2026, 0, 5)); // 5 janv 2026 local
		expect(f).toBe('feedback-2026-01-05.json');
	});
});

// -- error-capture -----------------------------------------------------------

describe('errorCapture.add / read / reset (spec § 8.6)', () => {
	beforeEach(() => {
		errorCapture.reset();
	});

	it('add puis read renvoie l\'erreur', () => {
		errorCapture.add({
			message: 'boom',
			at: new Date().toISOString(),
		});
		const out = errorCapture.read();
		expect(out).toHaveLength(1);
		expect(out[0].message).toBe('boom');
	});

	it('cap à 3 entrées (les plus anciennes sont écartées)', () => {
		const now = Date.now();
		for (let i = 1; i <= 5; i++) {
			errorCapture.add({
				message: `err-${i}`,
				at: new Date(now + i).toISOString(),
			});
		}
		const out = errorCapture.read();
		expect(out).toHaveLength(ERROR_CAPTURE_MAX);
		// On garde les 3 dernières (err-3, err-4, err-5).
		expect(out.map((e) => e.message)).toEqual(['err-3', 'err-4', 'err-5']);
	});

	it('purge les entrées vieilles de plus de 60 s', () => {
		// Erreur datée d'il y a 70 s : doit être purgée à la prochaine écriture/lecture.
		errorCapture.add({
			message: 'vieille',
			at: new Date(Date.now() - 70_000).toISOString(),
		});
		// Avant lecture, la purge sera déclenchée par add() lui-même.
		errorCapture.add({
			message: 'fraiche',
			at: new Date().toISOString(),
		});
		const out = errorCapture.read();
		expect(out).toHaveLength(1);
		expect(out[0].message).toBe('fraiche');
	});

	it('purge aussi sur read sans ajout préalable', () => {
		errorCapture.add({
			message: 'vieille',
			at: new Date(Date.now() - 70_000).toISOString(),
		});
		// Lecture seule : la purge doit s'appliquer.
		const out = errorCapture.read();
		expect(out).toHaveLength(0);
	});

	it('reset vide complètement le buffer', () => {
		errorCapture.add({ message: 'x', at: new Date().toISOString() });
		errorCapture.reset();
		expect(errorCapture.read()).toEqual([]);
	});

	it('expose des constantes cohérentes (3 / 60 s)', () => {
		expect(ERROR_CAPTURE_MAX).toBe(3);
		expect(ERROR_CAPTURE_WINDOW_MS).toBe(60_000);
	});
});

// -- options (mappings badge / type-narrowing) -------------------------------

describe('options badges + énumérations (spec § 8.7 et § 8.8)', () => {
	it('STATUS_BADGE_CLASSES couvre les 4 statuts', () => {
		for (const s of FEEDBACK_STATUSES) {
			expect(STATUS_BADGE_CLASSES[s]).toBeTruthy();
			// Classe Tailwind = doit contenir bg- + text- (cohérence design system).
			expect(STATUS_BADGE_CLASSES[s]).toMatch(/\bbg-/);
			expect(STATUS_BADGE_CLASSES[s]).toMatch(/\btext-/);
		}
	});

	it('TYPE_BADGE_CLASSES couvre les 3 types', () => {
		for (const t of FEEDBACK_TYPES) {
			expect(TYPE_BADGE_CLASSES[t]).toBeTruthy();
			expect(TYPE_BADGE_CLASSES[t]).toMatch(/\bbg-/);
		}
	});

	it('FEEDBACK_SEVERITIES contient exactement bloquant / genant / mineur', () => {
		expect([...FEEDBACK_SEVERITIES]).toEqual(['bloquant', 'genant', 'mineur']);
	});
});

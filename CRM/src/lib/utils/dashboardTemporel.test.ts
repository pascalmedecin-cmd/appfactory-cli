import { describe, it, expect } from 'vitest';
import {
	bucketTaches,
	dueLabel,
	endOfWeekIso,
	nextDayIso,
	tacheTitre,
	type TacheDue,
} from './dashboardTemporel';

const t = (
	id: string,
	date: string | null,
	overrides: Partial<TacheDue> = {}
): TacheDue => ({
	id,
	titre: 'titre' in overrides ? (overrides.titre ?? null) : `Tâche ${id}`,
	etape_pipeline: 'etape_pipeline' in overrides ? (overrides.etape_pipeline ?? null) : 'qualification',
	date_relance_prevue: date,
	entreprise: 'entreprise' in overrides ? (overrides.entreprise ?? null) : { raison_sociale: `Entreprise ${id}` },
});

describe('bucketTaches', () => {
	const today = '2026-06-19';

	it('répartit en retard / aujourd\'hui / cette semaine', () => {
		const taches = [
			t('a', '2026-06-15'), // late
			t('b', '2026-06-18'), // late
			t('c', '2026-06-19'), // today
			t('d', '2026-06-20'), // week
			t('e', '2026-06-22'), // week
		];
		const b = bucketTaches(taches, today);
		expect(b.late.map((x) => x.id)).toEqual(['a', 'b']);
		expect(b.today.map((x) => x.id)).toEqual(['c']);
		expect(b.week.map((x) => x.id)).toEqual(['d', 'e']);
	});

	it('ignore les tâches sans date', () => {
		const b = bucketTaches([t('a', null), t('b', '2026-06-19')], today);
		expect(b.late).toHaveLength(0);
		expect(b.today.map((x) => x.id)).toEqual(['b']);
		expect(b.week).toHaveLength(0);
	});

	it('préserve l\'ordre d\'entrée dans chaque panier', () => {
		const b = bucketTaches([t('a', '2026-06-10'), t('b', '2026-06-12')], today);
		expect(b.late.map((x) => x.id)).toEqual(['a', 'b']);
	});

	it('renvoie 3 paniers vides pour une liste vide', () => {
		expect(bucketTaches([], today)).toEqual({ late: [], today: [], week: [] });
	});

	// Régression : date_relance_prevue est un timestamptz -> PostgREST renvoie
	// "2026-06-25T00:00:00+00:00". L'échéance du jour doit tomber dans "today", pas "week".
	it('gère un timestamp avec heure (timestamptz PostgREST), pas seulement une date nue', () => {
		const taches = [
			t('a', '2026-06-15T00:00:00+00:00'), // late
			t('b', '2026-06-19T00:00:00+00:00'), // today (et non week !)
			t('c', '2026-06-19T14:30:00+00:00'), // today aussi (heure dans la journée)
			t('d', '2026-06-20T00:00:00+00:00'), // week
		];
		const b = bucketTaches(taches, today);
		expect(b.late.map((x) => x.id)).toEqual(['a']);
		expect(b.today.map((x) => x.id)).toEqual(['b', 'c']);
		expect(b.week.map((x) => x.id)).toEqual(['d']);
	});
});

describe('dueLabel', () => {
	const today = '2026-06-19';
	const now = new Date(2026, 5, 19, 9, 0, 0); // jeudi 19 juin 2026 09h00 local

	it('marque le retard en jours', () => {
		expect(dueLabel('2026-06-15', today, now)).toEqual({ text: 'il y a 4 j', kind: 'late' });
		expect(dueLabel('2026-06-17', today, now)).toEqual({ text: 'il y a 2 j', kind: 'late' });
	});

	it('hier pour un retard d\'un jour', () => {
		expect(dueLabel('2026-06-18', today, now)).toEqual({ text: 'hier', kind: 'late' });
	});

	it('Aujourd\'hui pour la date du jour', () => {
		expect(dueLabel('2026-06-19', today, now)).toEqual({ text: "Aujourd'hui", kind: 'today' });
	});

	it('Aujourd\'hui même avec un suffixe timestamp (timestamptz)', () => {
		expect(dueLabel('2026-06-19T14:30:00+00:00', today, now)).toEqual({
			text: "Aujourd'hui",
			kind: 'today',
		});
	});

	it('demain pour J+1', () => {
		expect(dueLabel('2026-06-20', today, now)).toEqual({ text: 'demain', kind: 'week' });
	});

	it('jour court + numéro pour le reste de la semaine', () => {
		// 2026-06-22 = lundi
		expect(dueLabel('2026-06-22', today, now)).toEqual({ text: 'lun. 22', kind: 'week' });
	});

	it('renvoie un libellé vide pour une date nulle', () => {
		expect(dueLabel(null, today, now)).toEqual({ text: '', kind: 'week' });
	});
});

describe('endOfWeekIso', () => {
	it('renvoie le dimanche de la semaine courante', () => {
		expect(endOfWeekIso('2026-06-19')).toBe('2026-06-21'); // jeudi -> dimanche 21
		expect(endOfWeekIso('2026-06-15')).toBe('2026-06-21'); // lundi -> dimanche 21
		expect(endOfWeekIso('2026-06-20')).toBe('2026-06-21'); // samedi -> dimanche 21
	});

	it('renvoie le jour même si c\'est déjà dimanche', () => {
		expect(endOfWeekIso('2026-06-21')).toBe('2026-06-21');
	});
});

describe('nextDayIso', () => {
	it('renvoie le lendemain', () => {
		expect(nextDayIso('2026-06-21')).toBe('2026-06-22');
	});
	it('gère le passage de mois', () => {
		expect(nextDayIso('2026-06-30')).toBe('2026-07-01');
	});
	it('gère le passage d\'année', () => {
		expect(nextDayIso('2026-12-31')).toBe('2027-01-01');
	});
});

describe('tacheTitre', () => {
	it('prend le titre de l\'opportunité', () => {
		expect(tacheTitre(t('a', '2026-06-19', { titre: 'Devis vitrage' }))).toBe('Devis vitrage');
	});

	it('replie sur le nom d\'entreprise si pas de titre', () => {
		expect(
			tacheTitre(t('a', '2026-06-19', { titre: null, entreprise: { raison_sociale: 'Régie SA' } }))
		).toBe('Relancer Régie SA');
	});

	it('repli neutre ultime sans titre ni entreprise', () => {
		expect(tacheTitre(t('a', '2026-06-19', { titre: '   ', entreprise: null }))).toBe('Relance à faire');
	});
});

import { describe, it, expect } from 'vitest';
import {
	signauxIndicators,
	filterSignauxByTab,
	signauxCountsByTab,
	emptyMessageForTab,
	formatTypeLabel,
	typeIcon,
	formatDate,
	formatRelative,
	scoreLabel,
	scoreStyle,
	statutLabel,
	statutVariant,
	signalAriaLabel,
	clampDisplayScore,
	type SignalLite,
} from './signauxFormat';

const NOW = new Date('2026-05-09T10:00:00');

const sample: SignalLite[] = [
	{ id: '1', type_signal: 'appel_offres', canton: 'VD', statut_traitement: 'nouveau', score_pertinence: 11, date_detection: '2026-05-09', date_publication: '2026-05-08' },
	{ id: '2', type_signal: 'permis_construire', canton: 'GE', statut_traitement: 'en_analyse', score_pertinence: 8, date_detection: '2026-05-08', date_publication: '2026-05-07' },
	{ id: '3', type_signal: 'creation_entreprise', canton: 'VD', statut_traitement: 'interesse', score_pertinence: 5, date_detection: '2026-05-05', date_publication: '2026-05-04' },
	{ id: '4', type_signal: 'expansion', canton: 'FR', statut_traitement: 'converti', score_pertinence: 12, date_detection: '2026-05-02', date_publication: '2026-05-01' },
	{ id: '5', type_signal: 'autre', canton: null, statut_traitement: 'ecarte', score_pertinence: 2, date_detection: '2026-04-25', date_publication: '2026-04-24' },
	{ id: '6', type_signal: null, canton: 'NE', statut_traitement: null, score_pertinence: null, date_detection: '2026-05-09', date_publication: null },
];

describe('signauxIndicators', () => {
	it('compte total = tous statuts', () => {
		expect(signauxIndicators(sample).total).toBe(6);
	});
	it('compte nouveaux = statut nouveau OU null (fallback)', () => {
		// id 1 nouveau + id 6 null → fallback nouveau
		expect(signauxIndicators(sample).nouveaux).toBe(2);
	});
	it('compte aConvertir = statut interesse', () => {
		expect(signauxIndicators(sample).aConvertir).toBe(1);
	});
	it('compte convertis = statut converti', () => {
		expect(signauxIndicators(sample).convertis).toBe(1);
	});
	it('liste vide → tous zéros', () => {
		expect(signauxIndicators([])).toEqual({ total: 0, nouveaux: 0, aConvertir: 0, convertis: 0 });
	});
});

describe('filterSignauxByTab', () => {
	it('tab=tous → retourne tout (y compris écartés)', () => {
		expect(filterSignauxByTab(sample, 'tous')).toHaveLength(6);
	});
	it('tab=nouveau → statut nouveau OU null fallback', () => {
		const out = filterSignauxByTab(sample, 'nouveau');
		expect(out.map((s) => s.id).sort()).toEqual(['1', '6']);
	});
	it('tab=en_analyse → statut en_analyse uniquement', () => {
		expect(filterSignauxByTab(sample, 'en_analyse').map((s) => s.id)).toEqual(['2']);
	});
	it('tab=interesse → statut interesse uniquement', () => {
		expect(filterSignauxByTab(sample, 'interesse').map((s) => s.id)).toEqual(['3']);
	});
	it('tab=converti → statut converti uniquement', () => {
		expect(filterSignauxByTab(sample, 'converti').map((s) => s.id)).toEqual(['4']);
	});
	it('tab=ecarte → statut ecarte uniquement', () => {
		expect(filterSignauxByTab(sample, 'ecarte').map((s) => s.id)).toEqual(['5']);
	});
});

describe('signauxCountsByTab', () => {
	it('counts cohérents avec filterSignauxByTab', () => {
		expect(signauxCountsByTab(sample)).toEqual({
			tous: 6,
			nouveau: 2, // id 1 + id 6 fallback
			en_analyse: 1,
			interesse: 1,
			converti: 1,
			ecarte: 1,
		});
	});
	it('liste vide → counts tous à 0 sauf tous=0', () => {
		expect(signauxCountsByTab([])).toEqual({
			tous: 0,
			nouveau: 0,
			en_analyse: 0,
			interesse: 0,
			converti: 0,
			ecarte: 0,
		});
	});
});

describe('emptyMessageForTab', () => {
	it('tous → message générique', () => {
		expect(emptyMessageForTab('tous')).toBe('Aucun signal ne correspond aux filtres.');
	});
	it('nouveau → message ciblé triage', () => {
		expect(emptyMessageForTab('nouveau')).toContain('triager');
	});
	it('converti → message ciblé conversion', () => {
		expect(emptyMessageForTab('converti')).toContain('converti');
	});
});

describe('formatTypeLabel', () => {
	it('null → tiret', () => {
		expect(formatTypeLabel(null)).toBe('–');
	});
	it('type connu → label humain', () => {
		expect(formatTypeLabel('appel_offres')).toBe("Appel d'offres");
		expect(formatTypeLabel('permis_construire')).toBe('Permis de construire');
	});
	it('type inconnu → capitalisation snake_case → space', () => {
		expect(formatTypeLabel('grand_projet')).toBe('Grand projet');
	});
});

describe('typeIcon', () => {
	it('null → fallback info', () => {
		expect(typeIcon(null)).toBe('info');
	});
	it('connu → mapping', () => {
		expect(typeIcon('appel_offres')).toBe('gavel');
		expect(typeIcon('permis_construire')).toBe('construction');
	});
});

describe('formatDate', () => {
	it('null → tiret', () => {
		expect(formatDate(null)).toBe('–');
	});
	it('date invalide → tiret', () => {
		expect(formatDate('pas-une-date')).toBe('–');
	});
	it('date valide → format fr-CH DD.MM.YY', () => {
		expect(formatDate('2026-05-09')).toMatch(/09\.05\.26/);
	});
});

describe('formatRelative', () => {
	it("0 jours → Aujourd'hui", () => {
		expect(formatRelative('2026-05-09T08:00:00', NOW)).toBe("Aujourd'hui");
	});
	it('1 jour → Hier', () => {
		expect(formatRelative('2026-05-08T08:00:00', NOW)).toBe('Hier');
	});
	it('< 7 jours → Il y a N jours', () => {
		expect(formatRelative('2026-05-06T08:00:00', NOW)).toBe('Il y a 3 jours');
	});
	it('< 30 jours → Il y a N sem.', () => {
		expect(formatRelative('2026-04-25T08:00:00', NOW)).toBe('Il y a 2 sem.');
	});
	it('>= 30 jours → fallback formatDate', () => {
		expect(formatRelative('2026-03-01T08:00:00', NOW)).toMatch(/01\.03\.26/);
	});
	it('null → tiret', () => {
		expect(formatRelative(null, NOW)).toBe('–');
	});
});

describe('scoreLabel + scoreStyle', () => {
	it('null → non_qualifie', () => {
		expect(scoreLabel(null)).toBe('non_qualifie');
	});
	// V4 (S189) : seuils alignés sur config.scoring.labels après retrait de la
	// temporalité (maxPoints 12 → 10). Chaud >= 7, tiede >= 4, froid >= 1.
	it('seuils par défaut V4 : chaud=7 / tiede=4 / froid=1', () => {
		expect(scoreLabel(10)).toBe('chaud');
		expect(scoreLabel(8)).toBe('chaud');
		expect(scoreLabel(7)).toBe('chaud');
		expect(scoreLabel(6)).toBe('tiede');
		expect(scoreLabel(5)).toBe('tiede');
		expect(scoreLabel(4)).toBe('tiede');
		expect(scoreLabel(3)).toBe('froid');
		expect(scoreLabel(1)).toBe('froid');
		expect(scoreLabel(0)).toBe('non_qualifie');
		expect(scoreLabel(-1)).toBe('non_qualifie');
	});
	// V4 (S189) : SCORE_STYLES refondu, classes premium `signal-score-pill--*`
	// (gradient saturé + ring inset + shadow). `bgClass` vidé : tout est porté
	// par `colorClass` côté CSS global (cf. src/app.css).
	it('scoreStyle retourne icon + classe premium + label', () => {
		const s = scoreStyle(10);
		expect(s.icon).toBe('local_fire_department');
		expect(s.colorClass).toBe('signal-score-pill--chaud');
		expect(s.bgClass).toBe('');
		expect(s.label).toBe('Chaud');
	});
	it('scoreStyle pour tiède retourne signal-score-pill--tiede', () => {
		expect(scoreStyle(5).colorClass).toBe('signal-score-pill--tiede');
	});
	it('scoreStyle pour froid retourne signal-score-pill--froid', () => {
		expect(scoreStyle(2).colorClass).toBe('signal-score-pill--froid');
	});
	it('scoreStyle pour non qualifié retourne signal-score-pill--unscored', () => {
		expect(scoreStyle(0).colorClass).toBe('signal-score-pill--unscored');
		expect(scoreStyle(null).colorClass).toBe('signal-score-pill--unscored');
	});
});

describe('statutLabel + statutVariant', () => {
	it('null → fallback Nouveau / muted', () => {
		expect(statutLabel(null)).toBe('Nouveau');
		expect(statutVariant(null)).toBe('muted');
	});
	it('mappings statuts', () => {
		expect(statutLabel('nouveau')).toBe('Nouveau');
		expect(statutVariant('nouveau')).toBe('warning');
		expect(statutLabel('en_analyse')).toBe('En analyse');
		expect(statutVariant('en_analyse')).toBe('info');
		expect(statutLabel('interesse')).toBe('Intéressé');
		expect(statutVariant('interesse')).toBe('success');
		expect(statutLabel('converti')).toBe('Converti');
		expect(statutVariant('converti')).toBe('default');
		expect(statutLabel('ecarte')).toBe('Écarté');
		expect(statutVariant('ecarte')).toBe('muted');
	});
});

describe('signalAriaLabel', () => {
	it('contient type, canton, score, statut', () => {
		const label = signalAriaLabel(sample[0]);
		expect(label).toContain("Appel d'offres");
		expect(label).toContain('VD');
		expect(label).toContain('11');
		expect(label).toContain('Nouveau');
	});
	it('fallback canton non renseigné', () => {
		const label = signalAriaLabel(sample[4]);
		expect(label).toContain('non renseigné');
	});
});


describe('clampDisplayScore', () => {
	it('null → 0', () => {
		expect(clampDisplayScore(null, 10)).toBe(0);
	});
	it('undefined → 0', () => {
		expect(clampDisplayScore(undefined, 10)).toBe(0);
	});
	it('valeur négative → 0', () => {
		expect(clampDisplayScore(-3, 10)).toBe(0);
	});
	it('valeur sous le plafond → identité', () => {
		expect(clampDisplayScore(7, 10)).toBe(7);
	});
	it('valeur égale au plafond → identité', () => {
		expect(clampDisplayScore(10, 10)).toBe(10);
	});
	it('valeur au-dessus du plafond → clamp', () => {
		expect(clampDisplayScore(13, 10)).toBe(10);
		expect(clampDisplayScore(19, 10)).toBe(10);
	});
	it('0 → 0', () => {
		expect(clampDisplayScore(0, 10)).toBe(0);
	});
});

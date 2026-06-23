import { describe, it, expect } from 'vitest';
import {
	stripEnumArtifactText,
	stripEnumArtifactsFromItem,
	stripEnumArtifactsFromReport
} from './strip-enum-artifacts';

describe('stripEnumArtifactText - strippe les VRAIES valeurs d enum dumpees en queue', () => {
	it('strippe un enum d actionnabilite dumpe en fin de prose (cas reel W25)', () => {
		const txt =
			'Occasion de capitaliser sur cette audience avec un discours de diagnostic. ' +
			'Cible: residentiel, regies et gerances qui recoivent des demandes de locataires. veille_active.';
		const out = stripEnumArtifactText(txt);
		expect(out).toBe(
			'Occasion de capitaliser sur cette audience avec un discours de diagnostic. ' +
				'Cible: residentiel, regies et gerances qui recoivent des demandes de locataires.'
		);
		expect(out).not.toMatch(/veille_active/);
	});

	it('strippe a_surveiller (cas reel W25 rank 2/3)', () => {
		expect(
			stripEnumArtifactText('Films techniques poses sur vitrages existants. a_surveiller.')
		).toBe('Films techniques poses sur vitrages existants.');
		expect(stripEnumArtifactText('BIPV integre, porte par architectes et facadiers. a_surveiller.')).toBe(
			'BIPV integre, porte par architectes et facadiers.'
		);
	});

	it('strippe un slug de theme connu (ThemeEnum) dumpe en prose', () => {
		expect(stripEnumArtifactText('Sujet porte par le marche romand. discretion_smartfilm.')).toBe(
			'Sujet porte par le marche romand.'
		);
		expect(stripEnumArtifactText('Demande spontanee en hausse. films_solaires.')).toBe(
			'Demande spontanee en hausse.'
		);
	});

	it('strippe une valeur geo (suisse_romande) et impact (go_nogo) connues', () => {
		expect(stripEnumArtifactText('Marche concentre sur la region. suisse_romande.')).toBe(
			'Marche concentre sur la region.'
		);
		expect(stripEnumArtifactText('Decision a prendre rapidement. go_nogo.')).toBe(
			'Decision a prendre rapidement.'
		);
	});

	it('strippe plusieurs valeurs d enum terminales empilees (idempotence par boucle)', () => {
		expect(stripEnumArtifactText('Analyse complete du sujet. veille_active suisse_romande.')).toBe(
			'Analyse complete du sujet.'
		);
	});

	it('est idempotent (re-appliquer ne change rien)', () => {
		const once = stripEnumArtifactText('Texte propre de veille. a_surveiller.');
		expect(stripEnumArtifactText(once)).toBe(once);
		expect(once).toBe('Texte propre de veille.');
	});

	// ====================================================================
	// REGRESSION (revue adversariale 2026-06-23) : la terminologie metier
	// vitrage en snake_case minuscule terminal NE DOIT JAMAIS etre strippee.
	// Ce sont les contre-exemples trouves par les 3 sceptiques.
	// ====================================================================
	const METIER_NON_STRIPPABLE = [
		'Le nouveau film pare-eclats ameliore la reaction au feu, desormais classe b_s1_d0.',
		'Pour le confort thermique, privilegier le verre dit low_e.',
		'Le label de performance vise reste minergie_p.',
		'Le facteur solaire pertinent ici est le g_value.',
		'Solution de reference signee saint_gobain.',
		'Le standard de management applicable reste iso_50001.',
		'FilmPro mise sur la gamme solar_gard.',
		'Concurrent direct a surveiller: la marque sage_glass.',
		'Verifier la conformite selon la norme en_12600.',
		'Cible: le segment hospitality_haut_de_gamme.'
	];
	it('ne strippe AUCUN terme metier vitrage en snake_case (10 contre-exemples sceptiques)', () => {
		for (const txt of METIER_NON_STRIPPABLE) {
			expect(stripEnumArtifactText(txt)).toBe(txt);
		}
	});

	// --- Autres garanties anti-faux-positif ---

	it('ne touche pas une prose sans valeur d enum terminale', () => {
		const txt = 'Le confort d ete pousse la demande residentielle haut de gamme.';
		expect(stripEnumArtifactText(txt)).toBe(txt);
	});

	it('ne strippe pas un enum ecrit normalement (espaces, sans underscore) : « a surveiller »', () => {
		const txt = 'Sujet a surveiller de pres sur le marche tertiaire.';
		expect(stripEnumArtifactText(txt)).toBe(txt);
	});

	it('ne strippe pas un mot simple homonyme d un enum sans underscore (tertiaire, monde, etabli)', () => {
		expect(stripEnumArtifactText('Forte demande sur le segment tertiaire.')).toBe(
			'Forte demande sur le segment tertiaire.'
		);
		expect(stripEnumArtifactText('Une tendance qui gagne le monde.')).toBe(
			'Une tendance qui gagne le monde.'
		);
		expect(stripEnumArtifactText('Un marche desormais bien etabli.')).toBe(
			'Un marche desormais bien etabli.'
		);
	});

	it('ne touche pas un acronyme/norme en MAJUSCULES avec underscore (EN_12600)', () => {
		const txt = 'Verifier la conformite a la norme EN_12600.';
		expect(stripEnumArtifactText(txt)).toBe(txt);
	});

	it('ne touche pas une valeur d enum au MILIEU de la prose (seulement terminale)', () => {
		const txt = 'Le terme veille_active apparait puis la phrase continue normalement.';
		expect(stripEnumArtifactText(txt)).toBe(txt);
	});

	it('garde anti-vidage : ne reduit jamais un champ a du vide', () => {
		// pas de prefixe blanc -> pas de match du tout
		expect(stripEnumArtifactText('veille_active')).toBe('veille_active');
		expect(stripEnumArtifactText('veille_active.')).toBe('veille_active.');
		// prefixe blanc -> le strip viderait, le garde conserve l original
		expect(stripEnumArtifactText(' veille_active.')).toBe(' veille_active.');
	});

	it('gere null / undefined / vide sans throw', () => {
		expect(stripEnumArtifactText(null)).toBe(null);
		expect(stripEnumArtifactText(undefined)).toBe(undefined);
		expect(stripEnumArtifactText('')).toBe('');
	});
});

describe('stripEnumArtifactsFromItem / Report', () => {
	const baseItem = {
		title: 'Confort d ete et demande residentielle',
		summary: 'Resume factuel de la tendance observee cette semaine. veille_active.',
		filmpro_relevance: 'Pertinence FilmPro: cible regies et gerances romandes. veille_active.',
		deep_dive: 'Analyse approfondie du sujet pour FilmPro. a_surveiller.',
		source: { name: 'tages_anzeiger', url: 'https://x.test' }
	};

	it('strippe summary + filmpro_relevance + deep_dive, mais PAS title ni source.name', () => {
		const out = stripEnumArtifactsFromItem(baseItem);
		expect(out.summary).toBe('Resume factuel de la tendance observee cette semaine.');
		expect(out.filmpro_relevance).toBe('Pertinence FilmPro: cible regies et gerances romandes.');
		expect(out.deep_dive).toBe('Analyse approfondie du sujet pour FilmPro.');
		// title et source.name (champs identifiants) ne sont PAS touches
		expect(out.title).toBe(baseItem.title);
		expect(out.source.name).toBe('tages_anzeiger');
	});

	it('ne mute pas l item d entree (copie)', () => {
		const snapshot = JSON.parse(JSON.stringify(baseItem));
		stripEnumArtifactsFromItem(baseItem);
		expect(baseItem).toEqual(snapshot);
	});

	it('deep_dive null reste null', () => {
		const out = stripEnumArtifactsFromItem({ ...baseItem, deep_dive: null });
		expect(out.deep_dive).toBe(null);
	});

	it('strippe executive_summary + items + impacts.note au niveau report', () => {
		const report = {
			meta: { executive_summary: 'Synthese de la semaine pour la direction. veille_active.' },
			items: [baseItem],
			impacts_filmpro: [{ note: 'Note impact a destination du commercial. a_surveiller.' }]
		};
		const out = stripEnumArtifactsFromReport(report);
		expect(out.meta.executive_summary).toBe('Synthese de la semaine pour la direction.');
		expect(out.items[0].filmpro_relevance).toBe(
			'Pertinence FilmPro: cible regies et gerances romandes.'
		);
		expect(out.impacts_filmpro![0].note).toBe('Note impact a destination du commercial.');
	});
});

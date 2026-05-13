import { describe, it, expect } from 'vitest';
import {
	scoreKeywords,
	highlightKeywords,
	KEYWORD_CAPS,
	KEYWORD_SCORE_FLOOR,
	KEYWORD_SCORE_CEIL,
	type KeywordRow,
} from './keywords';

// Helper pour fabriquer un KeywordRow minimal (id factice, terme_norm calculé à la main).
function kw(terme: string, terme_norm: string, categorie: 'coeur' | 'bonus' | 'eviter', poids: number): KeywordRow {
	return { id: terme, terme, terme_norm, categorie, poids };
}

const KW_COEUR_VITRAGE = kw('vitrage', 'vitrage', 'coeur', 5);
const KW_COEUR_FILM = kw('film', 'film', 'coeur', 5);
const KW_COEUR_CONTROLE = kw('contrôle solaire', 'controle solaire', 'coeur', 5);
const KW_BONUS_REGIE = kw('régie', 'regie', 'bonus', 2);
const KW_BONUS_ARCHI = kw('architecte', 'architecte', 'bonus', 2);
const KW_EVITER_ROUTE = kw('route', 'route', 'eviter', -3);
const KW_EVITER_VOIRIE = kw('voirie', 'voirie', 'eviter', -3);

describe('scoreKeywords - bases', () => {
	it('retourne 0 sur texte vide', () => {
		expect(scoreKeywords('', [KW_COEUR_VITRAGE]).total).toBe(0);
		expect(scoreKeywords(null, [KW_COEUR_VITRAGE]).total).toBe(0);
		expect(scoreKeywords(undefined, [KW_COEUR_VITRAGE]).total).toBe(0);
	});

	it('retourne 0 sur liste vide', () => {
		expect(scoreKeywords('vitrage partout', []).total).toBe(0);
	});

	it('1 match Cœur = +5', () => {
		const r = scoreKeywords('rénovation du vitrage de la baie', [KW_COEUR_VITRAGE]);
		expect(r.total).toBe(5);
		expect(r.matches).toHaveLength(1);
		expect(r.matches[0].count).toBe(1);
		expect(r.criteres[0]).toContain('Coeur');
	});

	it('1 match Bonus = +2', () => {
		const r = scoreKeywords('architecte mandataire', [KW_BONUS_ARCHI]);
		expect(r.total).toBe(2);
	});

	it('1 match Éviter = -3 (cumul fixe par terme)', () => {
		const r = scoreKeywords('réfection de la route cantonale', [KW_EVITER_ROUTE]);
		expect(r.total).toBe(-3);
		expect(r.criteres[0]).toContain('Éviter');
	});
});

describe('scoreKeywords - match plein-mot', () => {
	it('route ne matche pas routine', () => {
		const r = scoreKeywords('changement de routine sur le projet', [KW_EVITER_ROUTE]);
		expect(r.total).toBe(0);
		expect(r.matches).toHaveLength(0);
	});

	it('route ne matche pas autoroute (au milieu)', () => {
		const r = scoreKeywords('autoroute A1 - tronçon Genève', [KW_EVITER_ROUTE]);
		expect(r.total).toBe(0);
	});

	it('film matche bien isolé', () => {
		const r = scoreKeywords('pose de film solaire', [KW_COEUR_FILM]);
		expect(r.total).toBe(5);
	});

	it('film ne matche pas filmer ou filmographie', () => {
		const r = scoreKeywords('filmographie complète', [KW_COEUR_FILM]);
		expect(r.total).toBe(0);
	});
});

describe('scoreKeywords - accents insensibles', () => {
	it('régie matche Regie / REGIE / régie / Régie', () => {
		expect(scoreKeywords('Regie immobilière', [KW_BONUS_REGIE]).total).toBe(2);
		expect(scoreKeywords('REGIE DUPONT', [KW_BONUS_REGIE]).total).toBe(2);
		expect(scoreKeywords('régie active', [KW_BONUS_REGIE]).total).toBe(2);
		expect(scoreKeywords('Régie Dupont SA', [KW_BONUS_REGIE]).total).toBe(2);
	});

	it('contrôle solaire matche controle solaire (sans accent)', () => {
		const r = scoreKeywords('pose de controle solaire avancé', [KW_COEUR_CONTROLE]);
		expect(r.total).toBe(5);
	});
});

describe('scoreKeywords - multi-mots', () => {
	it('contrôle solaire matche la séquence exacte', () => {
		const r = scoreKeywords('film de contrôle solaire premium', [KW_COEUR_CONTROLE]);
		expect(r.total).toBe(5);
	});

	it('contrôler le solaire ne matche pas contrôle solaire', () => {
		const r = scoreKeywords('contrôler le solaire en été', [KW_COEUR_CONTROLE]);
		expect(r.total).toBe(0);
	});
});

describe('scoreKeywords - plafonds par catégorie', () => {
	it('3 matches Cœur (+15 raw) sont plafonnés à KEYWORD_CAPS.coeur (+10)', () => {
		// 3 mots distincts Cœur, chacun 1 match
		const r = scoreKeywords('vitrage et film et contrôle solaire', [
			KW_COEUR_VITRAGE,
			KW_COEUR_FILM,
			KW_COEUR_CONTROLE,
		]);
		expect(r.total).toBe(KEYWORD_CAPS.coeur);
		expect(r.criteres[0]).toContain('plafonné');
		expect(r.criteres[0]).toContain('/15');
	});

	it('3 matches Cœur d\'un même mot (+15) plafonnés à +10', () => {
		const r = scoreKeywords('vitrage vitrage vitrage de qualité', [KW_COEUR_VITRAGE]);
		expect(r.total).toBe(KEYWORD_CAPS.coeur);
		expect(r.matches[0].count).toBe(3);
	});

	it('3 matches Bonus (+6 raw) plafonnés à KEYWORD_CAPS.bonus (+4)', () => {
		const r = scoreKeywords('régie régie architecte', [KW_BONUS_REGIE, KW_BONUS_ARCHI]);
		expect(r.total).toBe(KEYWORD_CAPS.bonus);
		expect(r.criteres[0]).toContain('plafonné');
	});
});

describe('scoreKeywords - éviter (malus cumulatif sur termes distincts)', () => {
	it('2 termes Éviter distincts cumulent les malus', () => {
		const r = scoreKeywords('voirie et route refaites', [KW_EVITER_ROUTE, KW_EVITER_VOIRIE]);
		expect(r.total).toBe(-6); // -3 + -3
	});

	it('plusieurs occurrences du même terme Éviter = malus fixe (pas de cumul intra-terme)', () => {
		const r = scoreKeywords('route route route', [KW_EVITER_ROUTE]);
		expect(r.total).toBe(-3);
		expect(r.matches[0].count).toBe(3); // compte gardé pour info
	});
});

describe('scoreKeywords - clamp global', () => {
	it('clamp au plancher KEYWORD_SCORE_FLOOR', () => {
		// 5 termes éviter distincts = -15 raw, clamp à -10.
		const kws: KeywordRow[] = [
			kw('a', 'a-term', 'eviter', -3), // ne matchera pas (length < 2 OK ici car >= 2 chars terme_norm)
			kw('route', 'route', 'eviter', -3),
			kw('voirie', 'voirie', 'eviter', -3),
			kw('pont', 'pont', 'eviter', -3),
			kw('tunnel', 'tunnel', 'eviter', -3),
			kw('chaussee', 'chaussee', 'eviter', -3),
		];
		const r = scoreKeywords('route voirie pont tunnel chaussee partout', kws);
		expect(r.total).toBe(KEYWORD_SCORE_FLOOR);
	});

	it('clamp au plafond KEYWORD_SCORE_CEIL', () => {
		// Cœur cap +10 + Bonus cap +4 = +14, encore sous +20.
		// On vérifie juste que le clamp ne descend pas un score normal.
		const r = scoreKeywords('vitrage film régie architecte', [
			KW_COEUR_VITRAGE,
			KW_COEUR_FILM,
			KW_BONUS_REGIE,
			KW_BONUS_ARCHI,
		]);
		expect(r.total).toBeLessThanOrEqual(KEYWORD_SCORE_CEIL);
		expect(r.total).toBe(10 + 4); // 2 cœur (+10 raw, déjà au cap) + 2 bonus (+4 raw au cap)
	});
});

describe('scoreKeywords - mix toutes catégories', () => {
	it('vitrage + régie + route = +5 +2 -3 = +4', () => {
		const r = scoreKeywords('vitrage de la régie à coté de la route', [
			KW_COEUR_VITRAGE,
			KW_BONUS_REGIE,
			KW_EVITER_ROUTE,
		]);
		expect(r.total).toBe(4);
		expect(r.criteres).toHaveLength(3);
	});

	it('termes < 2 chars dans la liste sont ignorés sans crash', () => {
		const r = scoreKeywords('vitrage', [kw('a', 'a', 'coeur', 5), KW_COEUR_VITRAGE]);
		expect(r.total).toBe(5);
	});
});

describe('highlightKeywords', () => {
	it('retourne un seul chunk si aucun match', () => {
		const chunks = highlightKeywords('aucun match ici', [KW_COEUR_VITRAGE]);
		expect(chunks).toEqual([{ text: 'aucun match ici', cat: null }]);
	});

	it('retourne un seul chunk si keywords vide', () => {
		const chunks = highlightKeywords('vitrage présent', []);
		expect(chunks).toEqual([{ text: 'vitrage présent', cat: null }]);
	});

	it('découpe correctement autour d\'un match Cœur', () => {
		const chunks = highlightKeywords('rénovation du vitrage existant', [KW_COEUR_VITRAGE]);
		expect(chunks).toHaveLength(3);
		expect(chunks[0]).toEqual({ text: 'rénovation du ', cat: null });
		expect(chunks[1].text).toBe('vitrage');
		expect(chunks[1].cat).toBe('coeur');
		expect(chunks[2]).toEqual({ text: ' existant', cat: null });
	});

	it('match accent-insensible préserve le texte original avec accents', () => {
		const chunks = highlightKeywords('Régie Dupont', [KW_BONUS_REGIE]);
		const matchChunk = chunks.find((c) => c.cat === 'bonus');
		expect(matchChunk?.text).toBe('Régie');
	});

	it('plusieurs matches catégories différentes', () => {
		const chunks = highlightKeywords('vitrage de la régie sur la route', [
			KW_COEUR_VITRAGE,
			KW_BONUS_REGIE,
			KW_EVITER_ROUTE,
		]);
		const cats = chunks.filter((c) => c.cat !== null).map((c) => c.cat);
		expect(cats).toEqual(['coeur', 'bonus', 'eviter']);
	});

	it('zéro caractère perdu : la somme des chunks = texte original', () => {
		const text = 'vitrage et régie et architecte';
		const chunks = highlightKeywords(text, [KW_COEUR_VITRAGE, KW_BONUS_REGIE, KW_BONUS_ARCHI]);
		expect(chunks.map((c) => c.text).join('')).toBe(text);
	});

	it('chevauchement : le 1er match couvre, les suivants sont ignorés', () => {
		// Cas pathologique : 2 keywords se chevauchent. On vérifie qu'il n'y a pas de doublon.
		const kwLong = kw('contrôle solaire', 'controle solaire', 'coeur', 5);
		const kwShort = kw('solaire', 'solaire', 'bonus', 2);
		const chunks = highlightKeywords('pose de contrôle solaire premium', [kwLong, kwShort]);
		const text = chunks.map((c) => c.text).join('');
		expect(text).toBe('pose de contrôle solaire premium');
		const highlighted = chunks.filter((c) => c.cat !== null);
		// Le terme plus long démarre en premier (start identique) ; en cas d'égalité on garde end plus grand.
		expect(highlighted).toHaveLength(1);
		expect(highlighted[0].text).toBe('contrôle solaire');
	});
});

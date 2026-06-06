import { describe, it, expect } from 'vitest';
import { buildHub, type HubChantierRow, type HubProduitRow, type HubVitreRow } from './hub';

// Fabriques concises pour des lignes Supabase imbriquées.
function produit(p: Partial<HubProduitRow> = {}): HubProduitRow {
	return { reference: 'S70', nom: 'Solaire 70', famille: 'solaire', nestable: true, ...p };
}
function vitre(produit_id: string, opts: { sur_mesure?: boolean; prod?: HubProduitRow | null } = {}): HubVitreRow {
	return {
		produit_id,
		sur_mesure_fournisseur: opts.sur_mesure ?? false,
		decoupe_produits: opts.prod === undefined ? produit() : opts.prod
	};
}
function chantier(id: string, nom: string, statut: string, vitres: HubVitreRow[]): HubChantierRow {
	return { id, nom, client: null, statut, updated_at: '2026-06-06T00:00:00Z', decoupe_vitres: vitres };
}

describe('buildHub - projection des chantiers', () => {
	it('compte les vitres et liste les familles distinctes triées', () => {
		const rows = [
			chantier('c1', 'Villa', 'en_saisie', [
				vitre('pA', { prod: produit({ famille: 'securite' }) }),
				vitre('pB', { prod: produit({ reference: 'X', famille: 'solaire' }) }),
				vitre('pB', { prod: produit({ reference: 'X', famille: 'solaire' }) })
			])
		];
		const { chantiers } = buildHub(rows);
		expect(chantiers[0].nb_vitres).toBe(3);
		// solaire (0) avant securite (1) malgré l'ordre d'apparition inverse.
		expect(chantiers[0].familles).toEqual(['solaire', 'securite']);
	});

	it('films internes : nestable + non sur-mesure, dédupliqués par produit', () => {
		const rows = [
			chantier('c1', 'Villa', 'en_saisie', [
				vitre('pA'),
				vitre('pA'), // doublon produit → un seul film
				vitre('pB', { sur_mesure: true }), // sur-mesure → exclu
				vitre('pC', { prod: produit({ reference: 'V1', nestable: false }) }) // non nestable → exclu
			])
		];
		const { chantiers } = buildHub(rows);
		expect(chantiers[0].films.map((f) => f.produit_id)).toEqual(['pA']);
	});

	it('vitre sans produit joint → ignorée sans planter', () => {
		const rows = [chantier('c1', 'Villa', 'en_saisie', [vitre('pA', { prod: null })])];
		const { chantiers } = buildHub(rows);
		expect(chantiers[0].nb_vitres).toBe(1);
		expect(chantiers[0].familles).toEqual([]);
		expect(chantiers[0].films).toEqual([]);
	});

	it('chantier vide (0 vitre) → projeté sans film ni famille', () => {
		const rows = [chantier('c1', 'Vide', 'en_saisie', [])];
		const { chantiers } = buildHub(rows);
		expect(chantiers[0].nb_vitres).toBe(0);
		expect(chantiers[0].films).toEqual([]);
	});
});

describe('buildHub - consolidations suggérées', () => {
	it('film partagé par 2 chantiers en saisie → un groupe', () => {
		const rows = [
			chantier('c1', 'Villa', 'en_saisie', [vitre('pA')]),
			chantier('c2', 'Bureau', 'en_saisie', [vitre('pA')])
		];
		const { groupes } = buildHub(rows);
		expect(groupes).toHaveLength(1);
		expect(groupes[0].produit_id).toBe('pA');
		expect(groupes[0].chantiers.map((c) => c.id).sort()).toEqual(['c1', 'c2']);
	});

	it('film d\'un seul chantier → aucun groupe', () => {
		const rows = [chantier('c1', 'Villa', 'en_saisie', [vitre('pA')])];
		expect(buildHub(rows).groupes).toHaveLength(0);
	});

	it('chantier lancée exclu des groupes (déjà engagé)', () => {
		const rows = [
			chantier('c1', 'Villa', 'en_saisie', [vitre('pA')]),
			chantier('c2', 'Bureau', 'lancee', [vitre('pA')])
		];
		expect(buildHub(rows).groupes).toHaveLength(0);
	});

	it('sur-mesure partagé → pas de consolidation (hors nesting)', () => {
		const rows = [
			chantier('c1', 'Villa', 'en_saisie', [vitre('pA', { sur_mesure: true })]),
			chantier('c2', 'Bureau', 'en_saisie', [vitre('pA', { sur_mesure: true })])
		];
		expect(buildHub(rows).groupes).toHaveLength(0);
	});

	it('groupes triés par nombre de chantiers décroissant', () => {
		const rows = [
			chantier('c1', 'A', 'en_saisie', [vitre('pX', { prod: produit({ reference: 'X' }) }), vitre('pY', { prod: produit({ reference: 'Y' }) })]),
			chantier('c2', 'B', 'en_saisie', [vitre('pX', { prod: produit({ reference: 'X' }) }), vitre('pY', { prod: produit({ reference: 'Y' }) })]),
			chantier('c3', 'C', 'en_saisie', [vitre('pX', { prod: produit({ reference: 'X' }) })])
		];
		const { groupes } = buildHub(rows);
		expect(groupes.map((g) => g.produit_id)).toEqual(['pX', 'pY']); // pX (3) avant pY (2)
		expect(groupes[0].chantiers).toHaveLength(3);
	});

	it('entrée vide → hub vide', () => {
		expect(buildHub([])).toEqual({ chantiers: [], groupes: [] });
	});
});

import { describe, it, expect } from 'vitest';
import {
	DecoupeProduitCreateSchema,
	DecoupeChantierCreateSchema,
	DecoupeVitreCreateSchema,
} from '$lib/schemas';
import {
	buildProduitInsert,
	buildProduitUpdate,
	buildProduitActif,
	buildChantierInsert,
	buildChantierUpdate,
	buildChantierLancementUpdate,
	buildVitreInsert,
	buildVitreUpdate,
} from './builders';

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const UID = '550e8400-e29b-41d4-a716-446655440000';
const CHANTIER_ID = '11111111-2222-4333-8444-555555555555';
const PRODUIT_ID = '66666666-7777-4888-8999-aaaaaaaaaaaa';

// Entrée brute « façon formulaire » (toutes les valeurs en chaînes).
const rawProduit = {
	reference: 'SOL-70',
	nom: 'Solaire 70',
	famille: 'solaire',
	fabricant: '',
	fournisseur: '',
	laizes_mm: '1520, 1830',
	orientation_imposee: 'false',
	jointage_autorise: 'on',
	nestable: 'true',
	marge_pose_mm: '0',
	recouvrement_mm: '',
	notes: '',
};

const rawVitre = {
	chantier_id: CHANTIER_ID,
	produit_id: PRODUIT_ID,
	largeur_mm: '1200',
	hauteur_mm: '800',
	quantite: '3',
	type_vitrage: '',
	sur_mesure_fournisseur: 'on',
};

// ===========================================================================
// Schemas Zod (AC-019 : defense-in-depth sur les entrées CRUD)
// ===========================================================================

describe('DecoupeProduitCreateSchema', () => {
	it('parse une entrée formulaire valide (CSV laizes, booléens, marge vide → 0)', () => {
		const r = DecoupeProduitCreateSchema.safeParse(rawProduit);
		expect(r.success).toBe(true);
		if (!r.success) return;
		expect(r.data.laizes_mm).toEqual([1520, 1830]);
		expect(r.data.orientation_imposee).toBe(false);
		expect(r.data.jointage_autorise).toBe(true); // 'on'
		expect(r.data.nestable).toBe(true); // 'true'
		expect(r.data.marge_pose_mm).toBe(0);
		expect(r.data.recouvrement_mm).toBe(0); // '' coerce → 0
		expect(r.data.famille).toBe('solaire');
	});

	it('accepte un tableau de laizes natif (chemin non-formulaire)', () => {
		const r = DecoupeProduitCreateSchema.safeParse({ ...rawProduit, laizes_mm: [1520, 1830, 1000] });
		expect(r.success).toBe(true);
		if (r.success) expect(r.data.laizes_mm).toEqual([1520, 1830, 1000]);
	});

	it('refuse une référence vide', () => {
		expect(DecoupeProduitCreateSchema.safeParse({ ...rawProduit, reference: '' }).success).toBe(false);
	});

	it('refuse une famille hors enum', () => {
		expect(DecoupeProduitCreateSchema.safeParse({ ...rawProduit, famille: 'autre' }).success).toBe(false);
	});

	it('refuse zéro laize', () => {
		expect(DecoupeProduitCreateSchema.safeParse({ ...rawProduit, laizes_mm: '' }).success).toBe(false);
	});

	it('refuse une laize négative ou non entière', () => {
		expect(DecoupeProduitCreateSchema.safeParse({ ...rawProduit, laizes_mm: '1520, -5' }).success).toBe(false);
		expect(DecoupeProduitCreateSchema.safeParse({ ...rawProduit, laizes_mm: '1520, 12.5' }).success).toBe(false);
		expect(DecoupeProduitCreateSchema.safeParse({ ...rawProduit, laizes_mm: '1520, abc' }).success).toBe(false);
	});

	it('refuse une marge de pose négative', () => {
		expect(DecoupeProduitCreateSchema.safeParse({ ...rawProduit, marge_pose_mm: '-3' }).success).toBe(false);
	});
});

describe('DecoupeChantierCreateSchema', () => {
	it('parse nom + client optionnel vide', () => {
		const r = DecoupeChantierCreateSchema.safeParse({ nom: 'Villa Léman', client: '' });
		expect(r.success).toBe(true);
	});
	it('refuse un nom vide', () => {
		expect(DecoupeChantierCreateSchema.safeParse({ nom: '', client: '' }).success).toBe(false);
	});
});

describe('DecoupeVitreCreateSchema', () => {
	it('parse dimensions/quantité/coche depuis le formulaire', () => {
		const r = DecoupeVitreCreateSchema.safeParse(rawVitre);
		expect(r.success).toBe(true);
		if (!r.success) return;
		expect(r.data.largeur_mm).toBe(1200);
		expect(r.data.hauteur_mm).toBe(800);
		expect(r.data.quantite).toBe(3);
		expect(r.data.sur_mesure_fournisseur).toBe(true);
	});

	it('refuse une dimension nulle ou négative', () => {
		expect(DecoupeVitreCreateSchema.safeParse({ ...rawVitre, largeur_mm: '0' }).success).toBe(false);
		expect(DecoupeVitreCreateSchema.safeParse({ ...rawVitre, hauteur_mm: '-100' }).success).toBe(false);
	});

	it('refuse une quantité < 1', () => {
		expect(DecoupeVitreCreateSchema.safeParse({ ...rawVitre, quantite: '0' }).success).toBe(false);
	});

	it('refuse un chantier_id / produit_id non-UUID', () => {
		expect(DecoupeVitreCreateSchema.safeParse({ ...rawVitre, chantier_id: 'nope' }).success).toBe(false);
		expect(DecoupeVitreCreateSchema.safeParse({ ...rawVitre, produit_id: 'nope' }).success).toBe(false);
	});
});

// ===========================================================================
// Builders (couche d'écriture pure)
// ===========================================================================

function parsedProduit() {
	const r = DecoupeProduitCreateSchema.safeParse(rawProduit);
	if (!r.success) throw new Error('fixture produit invalide');
	return r.data;
}
function parsedVitre() {
	const r = DecoupeVitreCreateSchema.safeParse(rawVitre);
	if (!r.success) throw new Error('fixture vitre invalide');
	return r.data;
}

describe('buildProduitInsert', () => {
	it('mappe les champs, force actif=true, porte created_by, vides → null', () => {
		const row = buildProduitInsert(parsedProduit(), UID);
		expect(row.reference).toBe('SOL-70');
		expect(row.famille).toBe('solaire');
		expect(row.laizes_mm).toEqual([1520, 1830]);
		expect(row.actif).toBe(true);
		expect(row.created_by).toBe(UID);
		expect(row.fabricant).toBeNull(); // '' → null
		expect(row.fournisseur).toBeNull();
		expect(row.notes).toBeNull();
	});

	it('laisse la DB générer id et timestamps (jamais posés ici)', () => {
		const row = buildProduitInsert(parsedProduit(), UID);
		expect('id' in row).toBe(false);
		expect('created_at' in row).toBe(false);
		expect('updated_at' in row).toBe(false);
	});

	it('accepte created_by null (traçabilité optionnelle)', () => {
		expect(buildProduitInsert(parsedProduit(), null).created_by).toBeNull();
	});
});

describe('buildProduitUpdate / buildProduitActif', () => {
	it('rafraîchit updated_at et ne touche ni actif ni created_by ni id', () => {
		const row = buildProduitUpdate({ ...parsedProduit(), id: PRODUIT_ID });
		expect(ISO_RE.test(row.updated_at as string)).toBe(true);
		expect('actif' in row).toBe(false);
		expect('created_by' in row).toBe(false);
		expect('id' in row).toBe(false);
	});

	it('buildProduitActif(false) archive (soft-delete) + updated_at', () => {
		const row = buildProduitActif(false);
		expect(row.actif).toBe(false);
		expect(ISO_RE.test(row.updated_at as string)).toBe(true);
	});

	it('buildProduitActif(true) restaure', () => {
		expect(buildProduitActif(true).actif).toBe(true);
	});
});

describe('buildChantierInsert / Update / Lancement', () => {
	it('insert force statut en_saisie, client vide → null, created_by porté', () => {
		const row = buildChantierInsert({ nom: 'Villa Léman', client: '' }, UID);
		expect(row.statut).toBe('en_saisie');
		expect(row.nom).toBe('Villa Léman');
		expect(row.client).toBeNull();
		expect(row.created_by).toBe(UID);
		expect('id' in row).toBe(false);
	});

	it('update rafraîchit updated_at sans toucher statut', () => {
		const row = buildChantierUpdate({ id: CHANTIER_ID, nom: 'Villa Léman 2', client: 'Régie X' });
		expect(row.nom).toBe('Villa Léman 2');
		expect(row.client).toBe('Régie X');
		expect(ISO_RE.test(row.updated_at as string)).toBe(true);
		expect('statut' in row).toBe(false);
	});

	it('lancement passe le chantier en lancee + updated_at (AC-015)', () => {
		const row = buildChantierLancementUpdate();
		expect(row.statut).toBe('lancee');
		expect(ISO_RE.test(row.updated_at as string)).toBe(true);
	});
});

describe('buildVitreInsert / Update', () => {
	it('insert mappe dimensions/coche, type_vitrage vide → null, sans created_by ni id', () => {
		const row = buildVitreInsert(parsedVitre());
		expect(row.chantier_id).toBe(CHANTIER_ID);
		expect(row.produit_id).toBe(PRODUIT_ID);
		expect(row.largeur_mm).toBe(1200);
		expect(row.quantite).toBe(3);
		expect(row.sur_mesure_fournisseur).toBe(true);
		expect(row.type_vitrage).toBeNull();
		expect('created_by' in row).toBe(false);
		expect('id' in row).toBe(false);
		expect('created_at' in row).toBe(false);
	});

	it('update ne déplace pas la vitre de chantier et ne pose pas de timestamp', () => {
		const row = buildVitreUpdate({
			id: '99999999-8888-4777-8666-555555555555',
			produit_id: PRODUIT_ID,
			largeur_mm: 1300,
			hauteur_mm: 900,
			quantite: 2,
			type_vitrage: 'feuilleté',
			sur_mesure_fournisseur: false,
		});
		expect(row.largeur_mm).toBe(1300);
		expect(row.type_vitrage).toBe('feuilleté');
		expect('chantier_id' in row).toBe(false);
		expect('created_at' in row).toBe(false);
		expect('updated_at' in row).toBe(false);
	});
});

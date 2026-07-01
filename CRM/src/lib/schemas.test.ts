import { describe, it, expect } from 'vitest';
import {
	validate, extractForm, coerceFormBoolean, ETAPES_PIPELINE, ETAPES_PIPELINE_CLOSED,
	ContactCreateSchema, ContactUpdateSchema, ContactDeleteSchema,
	EntrepriseCreateSchema, EntrepriseUpdateSchema, EntrepriseDeleteSchema,
	OpportuniteCreateSchema, OpportuniteUpdateSchema, OpportuniteMoveSchema, OpportuniteArchiveSchema,
	SignalUpdateStatutSchema, SignalBatchDeleteSchema,
	LeadCreateSchema, LeadUpdateSchema, LeadUpdateStatutSchema, LeadBatchStatutSchema,
	LeadMarkForContactSchema, LeadTransfertSchema,
	RechercheCreateSchema, RechercheDeleteSchema,
} from './schemas';

describe('coerceFormBoolean (M-17)', () => {
	it('"true" / "on" / "1" (insensible casse + trim) → true', () => {
		expect(coerceFormBoolean('true')).toBe(true);
		expect(coerceFormBoolean('TRUE')).toBe(true);
		expect(coerceFormBoolean('  on  ')).toBe(true);
		expect(coerceFormBoolean('On')).toBe(true);
		expect(coerceFormBoolean('1')).toBe(true);
	});
	it('tout le reste → false', () => {
		expect(coerceFormBoolean('false')).toBe(false);
		expect(coerceFormBoolean('off')).toBe(false);
		expect(coerceFormBoolean('0')).toBe(false);
		expect(coerceFormBoolean('')).toBe(false);
		expect(coerceFormBoolean('  ')).toBe(false);
		expect(coerceFormBoolean(null)).toBe(false);
		expect(coerceFormBoolean(undefined)).toBe(false);
	});
});

describe('ETAPES_PIPELINE_CLOSED (M-06)', () => {
	it('= [gagne, perdu], sous-ensemble de ETAPES_PIPELINE', () => {
		expect([...ETAPES_PIPELINE_CLOSED]).toEqual(['gagne', 'perdu']);
		for (const e of ETAPES_PIPELINE_CLOSED) {
			expect((ETAPES_PIPELINE as readonly string[]).includes(e)).toBe(true);
		}
	});
});

describe('cap longueur champs date (M-18)', () => {
	it('OpportuniteCreateSchema.date_relance_prevue rejette une chaîne trop longue', () => {
		const tooLong = '2026-04-10'.repeat(50);
		expect(validate(OpportuniteCreateSchema, { titre: 'X projet test', date_relance_prevue: tooLong }).success).toBe(false);
	});
	it('accepte une date valide YYYY-MM-DD', () => {
		expect(validate(OpportuniteCreateSchema, { titre: 'X projet test', date_relance_prevue: '2026-04-10' }).success).toBe(true);
	});
});

describe('validate helper', () => {
	it('retourne success pour des donnees valides', () => {
		const result = validate(ContactCreateSchema, { nom: 'Dupont' });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.nom).toBe('Dupont');
	});

	it('retourne error pour des donnees invalides', () => {
		const result = validate(ContactCreateSchema, { nom: '' });
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBeTruthy();
	});
});

describe('ContactCreateSchema', () => {
	it('accepte un nom seul', () => {
		const r = validate(ContactCreateSchema, { nom: 'Martin' });
		expect(r.success).toBe(true);
	});

	it('rejette un nom vide', () => {
		const r = validate(ContactCreateSchema, { nom: '' });
		expect(r.success).toBe(false);
	});

	it('accepte un email valide', () => {
		const r = validate(ContactCreateSchema, { nom: 'Test', email_professionnel: 'test@example.com' });
		expect(r.success).toBe(true);
	});

	it('rejette un email invalide', () => {
		const r = validate(ContactCreateSchema, { nom: 'Test', email_professionnel: 'pas-un-email' });
		expect(r.success).toBe(false);
	});

	it('accepte un canton valide', () => {
		const r = validate(ContactCreateSchema, { nom: 'Test', canton: 'GE' });
		expect(r.success).toBe(true);
	});

	it('rejette un canton invalide', () => {
		const r = validate(ContactCreateSchema, { nom: 'Test', canton: 'XX' });
		expect(r.success).toBe(false);
	});
});

describe('LeadCreateSchema', () => {
	it('accepte un lead minimal', () => {
		const r = validate(LeadCreateSchema, { source: 'zefix', raison_sociale: 'Test SA', canton: 'GE' });
		expect(r.success).toBe(true);
	});

	it('rejette une source invalide', () => {
		const r = validate(LeadCreateSchema, { source: 'google', raison_sociale: 'Test SA', canton: 'GE' });
		expect(r.success).toBe(false);
	});

	it('rejette sans raison sociale', () => {
		const r = validate(LeadCreateSchema, { source: 'zefix', raison_sociale: '' });
		expect(r.success).toBe(false);
	});

	it('accepte un canton lead valide', () => {
		const r = validate(LeadCreateSchema, { source: 'zefix', raison_sociale: 'Arc SA', canton: 'GE' });
		expect(r.success).toBe(true);
	});

	it('coerce montant en nombre', () => {
		const r = validate(LeadCreateSchema, { source: 'zefix', raison_sociale: 'Test', canton: 'VD', montant: '50000' });
		expect(r.success).toBe(true);
		if (r.success) expect(r.data.montant).toBe(50000);
	});

	// Audit 360 H-07 : date_publication strict YYYY-MM-DD (ferme « not-a-date »).
	it('rejette une date_publication non YYYY-MM-DD (audit 360 H-07)', () => {
		const r = validate(LeadCreateSchema, {
			source: 'zefix', raison_sociale: 'Test', canton: 'VD', date_publication: 'not-a-date'
		});
		expect(r.success).toBe(false);
	});

	it('accepte une date_publication YYYY-MM-DD valide (audit 360 H-07)', () => {
		const r = validate(LeadCreateSchema, {
			source: 'zefix', raison_sociale: 'Test', canton: 'VD', date_publication: '2026-05-10'
		});
		expect(r.success).toBe(true);
	});

	it('accepte une date_publication vide (audit 360 H-07)', () => {
		const r = validate(LeadCreateSchema, {
			source: 'zefix', raison_sociale: 'Test', canton: 'VD', date_publication: ''
		});
		expect(r.success).toBe(true);
	});
});

describe('LeadBatchStatutSchema', () => {
	it('accepte un batch valide (statut manuel ecarte)', () => {
		const r = validate(LeadBatchStatutSchema, {
			ids: ['550e8400-e29b-41d4-a716-446655440000'],
			statut: 'ecarte',
		});
		expect(r.success).toBe(true);
	});

	it('rejette un batch sans ids', () => {
		const r = validate(LeadBatchStatutSchema, { ids: [], statut: 'ecarte' });
		expect(r.success).toBe(false);
	});

	it('rejette un statut invalide', () => {
		const r = validate(LeadBatchStatutSchema, {
			ids: ['550e8400-e29b-41d4-a716-446655440000'],
			statut: 'inconnu',
		});
		expect(r.success).toBe(false);
	});

	// Lot 2 durcissement : le batch n'autorise que les transitions manuelles (vide/ecarte).
	// « a_contacter » passe par la RPC mark_lead_for_contact ; « transfere » par le pipeline.
	it('rejette les statuts non manuels (a_contacter, transfere) - durcissement Lot 2', () => {
		const id = '550e8400-e29b-41d4-a716-446655440000';
		for (const statut of ['a_contacter', 'transfere', 'interesse', 'nouveau']) {
			expect(validate(LeadBatchStatutSchema, { ids: [id], statut }).success).toBe(false);
		}
	});

	it('rejette un lot de plus de 500 ids (cap anti-DoS, parité avec SignalBatchDeleteSchema)', () => {
		const uuid = '550e8400-e29b-41d4-a716-446655440000';
		const tooMany = Array.from({ length: 501 }, () => uuid);
		expect(validate(LeadBatchStatutSchema, { ids: tooMany, statut: 'ecarte' }).success).toBe(false);
		// 500 pile passe (borne inclusive).
		const exactly500 = Array.from({ length: 500 }, () => uuid);
		expect(validate(LeadBatchStatutSchema, { ids: exactly500, statut: 'ecarte' }).success).toBe(true);
	});
});

describe('SignalBatchDeleteSchema (audit 360 V3b L-28)', () => {
	const uuid = (n: number) => `550e8400-e29b-41d4-a716-44665544000${n}`;

	it('accepte une liste CSV de UUID valides et la transforme en array', () => {
		const r = validate(SignalBatchDeleteSchema, { ids: `${uuid(1)},${uuid(2)},${uuid(3)}` });
		expect(r.success).toBe(true);
		if (r.success) expect(r.data.ids).toEqual([uuid(1), uuid(2), uuid(3)]);
	});

	it('rejette une entrée vide ou un id non-UUID', () => {
		expect(validate(SignalBatchDeleteSchema, { ids: '' }).success).toBe(false);
		expect(validate(SignalBatchDeleteSchema, { ids: 'pas-un-uuid' }).success).toBe(false);
		expect(validate(SignalBatchDeleteSchema, { ids: `${uuid(1)},pas-un-uuid` }).success).toBe(false);
	});

	it('rejette un lot de plus de 500 ids (cap anti-DoS)', () => {
		const tooMany = Array.from({ length: 501 }, () => '550e8400-e29b-41d4-a716-446655440000').join(',');
		const r = validate(SignalBatchDeleteSchema, { ids: tooMany });
		expect(r.success).toBe(false);
		// 500 pile passe (borne inclusive).
		const exactly500 = Array.from({ length: 500 }, () => '550e8400-e29b-41d4-a716-446655440000').join(',');
		expect(validate(SignalBatchDeleteSchema, { ids: exactly500 }).success).toBe(true);
	});
});

describe('RechercheCreateSchema', () => {
	it('accepte une recherche minimale', () => {
		const r = validate(RechercheCreateSchema, { nom: 'Ma recherche' });
		expect(r.success).toBe(true);
	});

	it('rejette un nom vide', () => {
		const r = validate(RechercheCreateSchema, { nom: '' });
		expect(r.success).toBe(false);
	});

	it('accepte des filtres complets', () => {
		const r = validate(RechercheCreateSchema, {
			nom: 'Construction GE',
			sources: ['zefix', 'simap'],
			cantons: ['GE', 'VD'],
			score_minimum: 5,
			alerte_active: true,
			frequence_alerte: 'hebdomadaire',
		});
		expect(r.success).toBe(true);
	});

	it('rejette un score hors plage', () => {
		const r = validate(RechercheCreateSchema, { nom: 'Test', score_minimum: 20 });
		expect(r.success).toBe(false);
	});
});

// -- extractForm --

describe('extractForm', () => {
	it('extrait les champs demandes du FormData', () => {
		const fd = new FormData();
		fd.set('nom', 'Dupont');
		fd.set('prenom', 'Jean');
		fd.set('extra', 'ignore');
		const result = extractForm(fd, ['nom', 'prenom']);
		expect(result).toEqual({ nom: 'Dupont', prenom: 'Jean' });
	});

	it('retourne chaine vide pour un champ absent', () => {
		const fd = new FormData();
		fd.set('nom', 'Test');
		const result = extractForm(fd, ['nom', 'email']);
		expect(result).toEqual({ nom: 'Test', email: '' });
	});
});

// -- ContactUpdateSchema --

describe('ContactUpdateSchema', () => {
	const validUUID = '550e8400-e29b-41d4-a716-446655440000';

	it('accepte un update valide avec id', () => {
		const r = validate(ContactUpdateSchema, { id: validUUID, nom: 'Martin' });
		expect(r.success).toBe(true);
	});

	it('rejette sans id', () => {
		const r = validate(ContactUpdateSchema, { nom: 'Martin' });
		expect(r.success).toBe(false);
	});

	it('rejette un id non-UUID', () => {
		const r = validate(ContactUpdateSchema, { id: 'pas-un-uuid', nom: 'Martin' });
		expect(r.success).toBe(false);
	});
});

// -- ContactDeleteSchema --

describe('ContactDeleteSchema', () => {
	it('accepte un UUID valide', () => {
		const r = validate(ContactDeleteSchema, { id: '550e8400-e29b-41d4-a716-446655440000' });
		expect(r.success).toBe(true);
	});

	it('rejette sans id', () => {
		const r = validate(ContactDeleteSchema, {});
		expect(r.success).toBe(false);
	});
});

// -- EntrepriseCreateSchema --

describe('EntrepriseCreateSchema', () => {
	it('accepte une raison sociale seule', () => {
		const r = validate(EntrepriseCreateSchema, { raison_sociale: 'Acme SA' });
		expect(r.success).toBe(true);
	});

	it('rejette une raison sociale vide', () => {
		const r = validate(EntrepriseCreateSchema, { raison_sociale: '' });
		expect(r.success).toBe(false);
	});

	it('accepte un site web valide', () => {
		const r = validate(EntrepriseCreateSchema, { raison_sociale: 'Test', site_web: 'https://example.com' });
		expect(r.success).toBe(true);
	});

	it('rejette un site web invalide', () => {
		const r = validate(EntrepriseCreateSchema, { raison_sociale: 'Test', site_web: 'pas-une-url' });
		expect(r.success).toBe(false);
	});

	it('accepte un canton valide', () => {
		const r = validate(EntrepriseCreateSchema, { raison_sociale: 'Test', canton: 'VD' });
		expect(r.success).toBe(true);
	});

	it('rejette un canton invalide', () => {
		const r = validate(EntrepriseCreateSchema, { raison_sociale: 'Test', canton: 'ZZ' });
		expect(r.success).toBe(false);
	});
});

// -- EntrepriseUpdateSchema --

describe('EntrepriseUpdateSchema', () => {
	const validUUID = '550e8400-e29b-41d4-a716-446655440000';

	it('accepte un update valide avec id', () => {
		const r = validate(EntrepriseUpdateSchema, { id: validUUID, raison_sociale: 'Acme SA' });
		expect(r.success).toBe(true);
	});

	it('rejette sans id', () => {
		const r = validate(EntrepriseUpdateSchema, { raison_sociale: 'Acme SA' });
		expect(r.success).toBe(false);
	});
});

// -- EntrepriseDeleteSchema --

describe('EntrepriseDeleteSchema', () => {
	it('accepte un UUID valide', () => {
		const r = validate(EntrepriseDeleteSchema, { id: '550e8400-e29b-41d4-a716-446655440000' });
		expect(r.success).toBe(true);
	});

	it('rejette un id invalide', () => {
		const r = validate(EntrepriseDeleteSchema, { id: '123' });
		expect(r.success).toBe(false);
	});
});

// -- OpportuniteCreateSchema --

describe('OpportuniteCreateSchema', () => {
	it('accepte un titre seul', () => {
		const r = validate(OpportuniteCreateSchema, { titre: 'Projet renovation' });
		expect(r.success).toBe(true);
	});

	it('rejette un titre vide', () => {
		const r = validate(OpportuniteCreateSchema, { titre: '' });
		expect(r.success).toBe(false);
	});

	it('coerce montant en nombre', () => {
		const r = validate(OpportuniteCreateSchema, { titre: 'Test', montant_estime: '150000' });
		expect(r.success).toBe(true);
		if (r.success) expect(r.data.montant_estime).toBe(150000);
	});

	it('rejette un montant negatif', () => {
		const r = validate(OpportuniteCreateSchema, { titre: 'Test', montant_estime: -1 });
		expect(r.success).toBe(false);
	});

	it('accepte une etape pipeline valide', () => {
		const r = validate(OpportuniteCreateSchema, { titre: 'Test', etape_pipeline: 'qualification' });
		expect(r.success).toBe(true);
	});

	it('rejette une etape pipeline invalide', () => {
		const r = validate(OpportuniteCreateSchema, { titre: 'Test', etape_pipeline: 'inexistant' });
		expect(r.success).toBe(false);
	});

	// Audit 360 H-07 : date_relance_prevue strict YYYY-MM-DD.
	it('rejette une date_relance_prevue non YYYY-MM-DD (audit 360 H-07)', () => {
		const r = validate(OpportuniteCreateSchema, { titre: 'Test', date_relance_prevue: 'avant juin' });
		expect(r.success).toBe(false);
	});

	it('accepte une date_relance_prevue YYYY-MM-DD valide (audit 360 H-07)', () => {
		const r = validate(OpportuniteCreateSchema, { titre: 'Test', date_relance_prevue: '2026-06-15' });
		expect(r.success).toBe(true);
	});
});

// -- OpportuniteUpdateSchema --

describe('OpportuniteUpdateSchema', () => {
	const validUUID = '550e8400-e29b-41d4-a716-446655440000';

	it('accepte un update valide', () => {
		const r = validate(OpportuniteUpdateSchema, { id: validUUID, titre: 'Projet X' });
		expect(r.success).toBe(true);
	});

	it('rejette sans id', () => {
		const r = validate(OpportuniteUpdateSchema, { titre: 'Projet X' });
		expect(r.success).toBe(false);
	});
});

// -- OpportuniteMoveSchema --

describe('OpportuniteMoveSchema', () => {
	const validUUID = '550e8400-e29b-41d4-a716-446655440000';

	it('accepte un move valide', () => {
		const r = validate(OpportuniteMoveSchema, { id: validUUID, etape_pipeline: 'negociation' });
		expect(r.success).toBe(true);
	});

	it('rejette sans etape', () => {
		const r = validate(OpportuniteMoveSchema, { id: validUUID });
		expect(r.success).toBe(false);
	});

	it('rejette une etape invalide', () => {
		const r = validate(OpportuniteMoveSchema, { id: validUUID, etape_pipeline: 'fantaisie' });
		expect(r.success).toBe(false);
	});
});

// -- OpportuniteArchiveSchema --

describe('OpportuniteArchiveSchema', () => {
	const validUUID = '550e8400-e29b-41d4-a716-446655440000';

	it('accepte un archive avec motif', () => {
		const r = validate(OpportuniteArchiveSchema, { id: validUUID, motif_perte: 'Budget insuffisant' });
		expect(r.success).toBe(true);
	});

	it('accepte un archive sans motif', () => {
		const r = validate(OpportuniteArchiveSchema, { id: validUUID });
		expect(r.success).toBe(true);
	});

	it('rejette sans id', () => {
		const r = validate(OpportuniteArchiveSchema, {});
		expect(r.success).toBe(false);
	});
});

// -- SignalUpdateStatutSchema (modèle simplifié 2026-07-01) --

describe('SignalUpdateStatutSchema', () => {
	const validUUID = '550e8400-e29b-41d4-a716-446655440000';

	it('accepte les statuts du modèle simplifié', () => {
		for (const statut of ['nouveau', 'a_suivre', 'archive']) {
			expect(validate(SignalUpdateStatutSchema, { id: validUUID, statut_traitement: statut }).success).toBe(true);
		}
	});

	it('rejette un ancien statut retiré (interesse / converti / ecarte)', () => {
		for (const statut of ['interesse', 'converti', 'ecarte', 'en_analyse']) {
			expect(validate(SignalUpdateStatutSchema, { id: validUUID, statut_traitement: statut }).success).toBe(false);
		}
	});

	it('rejette sans statut', () => {
		const r = validate(SignalUpdateStatutSchema, { id: validUUID });
		expect(r.success).toBe(false);
	});

	it('rejette un statut invalide', () => {
		const r = validate(SignalUpdateStatutSchema, { id: validUUID, statut_traitement: 'supprime' });
		expect(r.success).toBe(false);
	});
});

// -- LeadUpdateSchema --

describe('LeadUpdateSchema', () => {
	const validUUID = '550e8400-e29b-41d4-a716-446655440000';

	it('accepte un update valide', () => {
		const r = validate(LeadUpdateSchema, { id: validUUID, source: 'zefix', raison_sociale: 'Test SA', canton: 'GE' });
		expect(r.success).toBe(true);
	});

	it('rejette sans id', () => {
		const r = validate(LeadUpdateSchema, { source: 'zefix', raison_sociale: 'Test SA', canton: 'GE' });
		expect(r.success).toBe(false);
	});

	it('rejette un id non-UUID', () => {
		const r = validate(LeadUpdateSchema, { id: 'abc', source: 'zefix', raison_sociale: 'Test SA' });
		expect(r.success).toBe(false);
	});
});

// -- LeadUpdateStatutSchema --

describe('LeadUpdateStatutSchema', () => {
	const validUUID = '550e8400-e29b-41d4-a716-446655440000';

	// Lot 2 : seules les transitions manuelles vide/ecarte sont acceptées.
	it('accepte les statuts manuels vide et ecarte', () => {
		for (const statut of ['vide', 'ecarte']) {
			expect(validate(LeadUpdateStatutSchema, { id: validUUID, statut }).success).toBe(true);
		}
	});

	// Durcissement Lot 2 : a_contacter (RPC) et transfere (pipeline) ne sont plus des
	// transitions manuelles directes ; les anciens statuts interesse/nouveau sont retirés.
	it('rejette les statuts non manuels (a_contacter, transfere, interesse, nouveau)', () => {
		for (const statut of ['a_contacter', 'transfere', 'interesse', 'nouveau']) {
			expect(validate(LeadUpdateStatutSchema, { id: validUUID, statut }).success).toBe(false);
		}
	});

	it('rejette un statut invalide', () => {
		const r = validate(LeadUpdateStatutSchema, { id: validUUID, statut: 'supprime' });
		expect(r.success).toBe(false);
	});

	it('rejette sans id', () => {
		const r = validate(LeadUpdateStatutSchema, { statut: 'ecarte' });
		expect(r.success).toBe(false);
	});
});

// -- LeadMarkForContactSchema (Lot 2 : « À contacter » → entre au pipeline via RPC) --

describe('LeadMarkForContactSchema', () => {
	it('accepte un UUID valide', () => {
		const r = validate(LeadMarkForContactSchema, { id: '550e8400-e29b-41d4-a716-446655440000' });
		expect(r.success).toBe(true);
	});

	it('rejette un id non-UUID', () => {
		expect(validate(LeadMarkForContactSchema, { id: 'pas-un-uuid' }).success).toBe(false);
	});

	it('rejette sans id', () => {
		expect(validate(LeadMarkForContactSchema, {}).success).toBe(false);
	});
});

// -- LeadTransfertSchema --

describe('LeadTransfertSchema', () => {
	it('accepte un UUID valide', () => {
		const r = validate(LeadTransfertSchema, { id: '550e8400-e29b-41d4-a716-446655440000' });
		expect(r.success).toBe(true);
	});

	it('rejette sans id', () => {
		const r = validate(LeadTransfertSchema, {});
		expect(r.success).toBe(false);
	});
});

// -- RechercheDeleteSchema --

describe('RechercheDeleteSchema', () => {
	it('accepte un UUID valide', () => {
		const r = validate(RechercheDeleteSchema, { id: '550e8400-e29b-41d4-a716-446655440000' });
		expect(r.success).toBe(true);
	});

	it('rejette un id invalide', () => {
		const r = validate(RechercheDeleteSchema, { id: 'not-uuid' });
		expect(r.success).toBe(false);
	});
});

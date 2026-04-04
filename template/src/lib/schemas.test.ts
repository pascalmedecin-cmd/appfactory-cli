import { describe, it, expect } from 'vitest';
import {
	validate, extractForm,
	ContactCreateSchema, ContactUpdateSchema, ContactDeleteSchema,
	EntrepriseCreateSchema, EntrepriseUpdateSchema, EntrepriseDeleteSchema,
	OpportuniteCreateSchema, OpportuniteUpdateSchema, OpportuniteMoveSchema, OpportuniteArchiveSchema,
	SignalCreateSchema, SignalUpdateSchema, SignalUpdateStatutSchema, SignalCreateOpportuniteSchema,
	LeadCreateSchema, LeadUpdateSchema, LeadUpdateStatutSchema, LeadBatchStatutSchema, LeadTransfertSchema,
	RechercheCreateSchema, RechercheDeleteSchema,
} from './schemas';

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
		const r = validate(LeadCreateSchema, { source: 'manuel', raison_sociale: 'Test SA' });
		expect(r.success).toBe(true);
	});

	it('rejette une source invalide', () => {
		const r = validate(LeadCreateSchema, { source: 'google', raison_sociale: 'Test SA' });
		expect(r.success).toBe(false);
	});

	it('rejette sans raison sociale', () => {
		const r = validate(LeadCreateSchema, { source: 'manuel', raison_sociale: '' });
		expect(r.success).toBe(false);
	});

	it('accepte un canton lead valide', () => {
		const r = validate(LeadCreateSchema, { source: 'lindas', raison_sociale: 'Arc SA', canton: 'Autre' });
		expect(r.success).toBe(true);
	});

	it('coerce montant en nombre', () => {
		const r = validate(LeadCreateSchema, { source: 'manuel', raison_sociale: 'Test', montant: '50000' });
		expect(r.success).toBe(true);
		if (r.success) expect(r.data.montant).toBe(50000);
	});
});

describe('LeadBatchStatutSchema', () => {
	it('accepte un batch valide', () => {
		const r = validate(LeadBatchStatutSchema, {
			ids: ['550e8400-e29b-41d4-a716-446655440000'],
			statut: 'interesse',
		});
		expect(r.success).toBe(true);
	});

	it('rejette un batch sans ids', () => {
		const r = validate(LeadBatchStatutSchema, { ids: [], statut: 'interesse' });
		expect(r.success).toBe(false);
	});

	it('rejette un statut invalide', () => {
		const r = validate(LeadBatchStatutSchema, {
			ids: ['550e8400-e29b-41d4-a716-446655440000'],
			statut: 'inconnu',
		});
		expect(r.success).toBe(false);
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
			sources: ['lindas', 'simap'],
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

// -- SignalCreateSchema --

describe('SignalCreateSchema', () => {
	it('accepte un signal minimal (tous optionnels)', () => {
		const r = validate(SignalCreateSchema, {});
		expect(r.success).toBe(true);
	});

	it('accepte un signal complet', () => {
		const r = validate(SignalCreateSchema, {
			type_signal: 'appel_offres',
			description_projet: 'Construction immeuble',
			maitre_ouvrage: 'Ville de Geneve',
			canton: 'GE',
			commune: 'Geneve',
		});
		expect(r.success).toBe(true);
	});

	it('rejette un type_signal invalide', () => {
		const r = validate(SignalCreateSchema, { type_signal: 'inconnu' });
		expect(r.success).toBe(false);
	});

	it('rejette un canton invalide', () => {
		const r = validate(SignalCreateSchema, { canton: 'XX' });
		expect(r.success).toBe(false);
	});
});

// -- SignalUpdateSchema --

describe('SignalUpdateSchema', () => {
	const validUUID = '550e8400-e29b-41d4-a716-446655440000';

	it('accepte un update avec id', () => {
		const r = validate(SignalUpdateSchema, { id: validUUID, type_signal: 'permis_construire' });
		expect(r.success).toBe(true);
	});

	it('rejette sans id', () => {
		const r = validate(SignalUpdateSchema, { type_signal: 'permis_construire' });
		expect(r.success).toBe(false);
	});

	it('accepte un statut_traitement valide', () => {
		const r = validate(SignalUpdateSchema, { id: validUUID, statut_traitement: 'en_analyse' });
		expect(r.success).toBe(true);
	});

	it('rejette un statut_traitement invalide', () => {
		const r = validate(SignalUpdateSchema, { id: validUUID, statut_traitement: 'fantaisie' });
		expect(r.success).toBe(false);
	});
});

// -- SignalUpdateStatutSchema --

describe('SignalUpdateStatutSchema', () => {
	const validUUID = '550e8400-e29b-41d4-a716-446655440000';

	it('accepte un changement de statut valide', () => {
		const r = validate(SignalUpdateStatutSchema, { id: validUUID, statut_traitement: 'interesse' });
		expect(r.success).toBe(true);
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

// -- SignalCreateOpportuniteSchema --

describe('SignalCreateOpportuniteSchema', () => {
	const validUUID = '550e8400-e29b-41d4-a716-446655440000';

	it('accepte une conversion valide', () => {
		const r = validate(SignalCreateOpportuniteSchema, { signal_id: validUUID, titre: 'Nouvelle opp' });
		expect(r.success).toBe(true);
	});

	it('rejette sans titre', () => {
		const r = validate(SignalCreateOpportuniteSchema, { signal_id: validUUID, titre: '' });
		expect(r.success).toBe(false);
	});

	it('rejette sans signal_id', () => {
		const r = validate(SignalCreateOpportuniteSchema, { titre: 'Test' });
		expect(r.success).toBe(false);
	});

	it('accepte entreprise_id optionnel', () => {
		const r = validate(SignalCreateOpportuniteSchema, {
			signal_id: validUUID,
			titre: 'Opp',
			entreprise_id: validUUID,
		});
		expect(r.success).toBe(true);
	});
});

// -- LeadUpdateSchema --

describe('LeadUpdateSchema', () => {
	const validUUID = '550e8400-e29b-41d4-a716-446655440000';

	it('accepte un update valide', () => {
		const r = validate(LeadUpdateSchema, { id: validUUID, source: 'manuel', raison_sociale: 'Test SA' });
		expect(r.success).toBe(true);
	});

	it('rejette sans id', () => {
		const r = validate(LeadUpdateSchema, { source: 'manuel', raison_sociale: 'Test SA' });
		expect(r.success).toBe(false);
	});

	it('rejette un id non-UUID', () => {
		const r = validate(LeadUpdateSchema, { id: 'abc', source: 'manuel', raison_sociale: 'Test SA' });
		expect(r.success).toBe(false);
	});
});

// -- LeadUpdateStatutSchema --

describe('LeadUpdateStatutSchema', () => {
	const validUUID = '550e8400-e29b-41d4-a716-446655440000';

	it('accepte un changement de statut valide', () => {
		const r = validate(LeadUpdateStatutSchema, { id: validUUID, statut: 'interesse' });
		expect(r.success).toBe(true);
	});

	it('rejette un statut invalide', () => {
		const r = validate(LeadUpdateStatutSchema, { id: validUUID, statut: 'supprime' });
		expect(r.success).toBe(false);
	});

	it('rejette sans id', () => {
		const r = validate(LeadUpdateStatutSchema, { statut: 'interesse' });
		expect(r.success).toBe(false);
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

import { describe, it, expect } from 'vitest';
import { validate, ContactCreateSchema, LeadCreateSchema, LeadBatchStatutSchema, RechercheCreateSchema } from './schemas';

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

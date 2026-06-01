import { describe, it, expect } from 'vitest';
import {
	VisitResultatSchema,
	ContactSuggestionCreateSchema,
	ResolveContactSuggestionSchema,
	validate,
} from './schemas';

describe('VisitResultatSchema (V3 enum fermé, pas d\'« Autre »)', () => {
	it('accepte les 4 valeurs fermées', () => {
		for (const v of ['visite_interesse', 'visite_a_relancer', 'absent', 'non_pertinent']) {
			expect(validate(VisitResultatSchema, v).success).toBe(true);
		}
	});
	it('rejette une valeur hors enum', () => {
		expect(validate(VisitResultatSchema, 'autre').success).toBe(false);
	});
	it('rejette la chaîne vide', () => {
		expect(validate(VisitResultatSchema, '').success).toBe(false);
	});
});

describe('ContactSuggestionCreateSchema', () => {
	it('accepte entreprise_id + nom seul', () => {
		const r = validate(ContactSuggestionCreateSchema, { entreprise_id: 'e1', nom: 'Dupont' });
		expect(r.success).toBe(true);
	});
	it('accepte entreprise_id + email seul', () => {
		const r = validate(ContactSuggestionCreateSchema, { entreprise_id: 'e1', email: 'a@b.ch' });
		expect(r.success).toBe(true);
	});
	it('rejette sans aucun identifiant (entreprise_id + notes seules)', () => {
		const r = validate(ContactSuggestionCreateSchema, { entreprise_id: 'e1', notes: 'rien' });
		expect(r.success).toBe(false);
	});
	it('traite la chaîne vide comme identifiant absent', () => {
		const r = validate(ContactSuggestionCreateSchema, { entreprise_id: 'e1', prenom: '', nom: '', telephone: '', email: '' });
		expect(r.success).toBe(false);
	});
	it('rejette sans entreprise_id', () => {
		const r = validate(ContactSuggestionCreateSchema, { nom: 'Dupont' });
		expect(r.success).toBe(false);
	});
	it('rejette une note > 2000 caractères', () => {
		const r = validate(ContactSuggestionCreateSchema, { entreprise_id: 'e1', nom: 'X', notes: 'a'.repeat(2001) });
		expect(r.success).toBe(false);
	});
	it('rejette un visit_id non-UUID', () => {
		const r = validate(ContactSuggestionCreateSchema, { entreprise_id: 'e1', nom: 'X', visit_id: 'pas-un-uuid' });
		expect(r.success).toBe(false);
	});
	it('accepte un visit_id UUID valide', () => {
		const r = validate(ContactSuggestionCreateSchema, { entreprise_id: 'e1', nom: 'X', visit_id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' });
		expect(r.success).toBe(true);
	});
});

describe('ResolveContactSuggestionSchema', () => {
	it('accepte action=valide', () => {
		expect(validate(ResolveContactSuggestionSchema, { action: 'valide' }).success).toBe(true);
	});
	it('accepte action=rejete', () => {
		expect(validate(ResolveContactSuggestionSchema, { action: 'rejete' }).success).toBe(true);
	});
	it('accepte merged_contact_id optionnel', () => {
		expect(validate(ResolveContactSuggestionSchema, { action: 'valide', merged_contact_id: 'c1' }).success).toBe(true);
	});
	it('rejette une action inconnue', () => {
		expect(validate(ResolveContactSuggestionSchema, { action: 'fusionner' }).success).toBe(false);
	});
	it('rejette action absente', () => {
		expect(validate(ResolveContactSuggestionSchema, {}).success).toBe(false);
	});
});

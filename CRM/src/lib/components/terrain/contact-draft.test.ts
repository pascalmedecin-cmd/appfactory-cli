import { describe, it, expect } from 'vitest';
import { hasIdentifier, buildContactSuggestionPayload } from './contact-draft';

describe('hasIdentifier', () => {
	it('vrai si prénom seul', () => {
		expect(hasIdentifier({ prenom: 'Marc' })).toBe(true);
	});
	it('vrai si téléphone seul', () => {
		expect(hasIdentifier({ telephone: '022 1' })).toBe(true);
	});
	it('vrai si email seul', () => {
		expect(hasIdentifier({ email: 'a@b.ch' })).toBe(true);
	});
	it('faux si seulement rôle ou notes', () => {
		expect(hasIdentifier({ role_fonction: 'Gérant', notes: 'rencontré' })).toBe(false);
	});
	it('faux si tout vide / espaces', () => {
		expect(hasIdentifier({ prenom: '  ', nom: '', email: null })).toBe(false);
		expect(hasIdentifier({})).toBe(false);
	});
});

describe('buildContactSuggestionPayload', () => {
	it('omet les champs vides + trim', () => {
		const p = buildContactSuggestionPayload('ent-1', {
			prenom: '  Marc ',
			nom: '',
			role_fonction: 'Gérant',
			telephone: null,
			email: 'a@b.ch',
		});
		expect(p).toEqual({
			entreprise_id: 'ent-1',
			prenom: 'Marc',
			role_fonction: 'Gérant',
			email: 'a@b.ch',
		});
	});
	it('ajoute visit_id si présent', () => {
		const p = buildContactSuggestionPayload('ent-1', { nom: 'Dupont' }, 'v-9');
		expect(p.visit_id).toBe('v-9');
		expect(p.nom).toBe('Dupont');
	});
	it('omet visit_id vide', () => {
		const p = buildContactSuggestionPayload('ent-1', { nom: 'Dupont' }, '  ');
		expect('visit_id' in p).toBe(false);
	});
});

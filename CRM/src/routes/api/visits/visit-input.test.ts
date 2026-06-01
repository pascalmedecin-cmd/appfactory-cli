import { describe, it, expect } from 'vitest';
import { validateGpsInput } from './geo-helpers';

describe('validateGpsInput (V3 : GPS optionnel, pas de demi-GPS)', () => {
	it('aucun GPS fourni → lat/lng/accuracy null (visite sans géoloc)', () => {
		expect(validateGpsInput({})).toEqual({ lat: null, lng: null, accuracy_m: null });
	});
	it('lat+lng valides → coordonnées numériques', () => {
		expect(validateGpsInput({ lat: 46.5, lng: 6.6 })).toEqual({ lat: 46.5, lng: 6.6, accuracy_m: null });
	});
	it('accepte lat/lng en chaîne (form terrain)', () => {
		expect(validateGpsInput({ lat: '46.5', lng: '6.6' })).toEqual({ lat: 46.5, lng: 6.6, accuracy_m: null });
	});
	it('accuracy_m valide conservée', () => {
		expect(validateGpsInput({ lat: 46.5, lng: 6.6, accuracy_m: 12 })).toEqual({ lat: 46.5, lng: 6.6, accuracy_m: 12 });
	});
	it('accuracy_m négative ignorée (null)', () => {
		expect(validateGpsInput({ lat: 46.5, lng: 6.6, accuracy_m: -5 })).toEqual({ lat: 46.5, lng: 6.6, accuracy_m: null });
	});
	it('lat sans lng → erreur (pas de demi-GPS)', () => {
		const r = validateGpsInput({ lat: 46.5 });
		expect('error' in r).toBe(true);
	});
	it('lng sans lat → erreur', () => {
		const r = validateGpsInput({ lng: 6.6 });
		expect('error' in r).toBe(true);
	});
	it('lat hors range → erreur', () => {
		const r = validateGpsInput({ lat: 200, lng: 6.6 });
		expect('error' in r).toBe(true);
	});
	it('lng hors range → erreur', () => {
		const r = validateGpsInput({ lat: 46.5, lng: 999 });
		expect('error' in r).toBe(true);
	});
	it('chaîne vide traitée comme absente (pas demi-GPS)', () => {
		expect(validateGpsInput({ lat: '', lng: '' })).toEqual({ lat: null, lng: null, accuracy_m: null });
	});
});

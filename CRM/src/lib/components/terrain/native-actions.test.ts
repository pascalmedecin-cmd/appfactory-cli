import { describe, it, expect } from 'vitest';
import {
	buildTelHref,
	buildMailtoHref,
	buildMapsHref,
	buildNativeActions,
} from './native-actions';

describe('buildTelHref', () => {
	it('construit tel: en retirant les espaces', () => {
		expect(buildTelHref('022 123 45 67')).toBe('tel:0221234567');
	});
	it('conserve le + international en tête', () => {
		expect(buildTelHref('+41 22 123 45 67')).toBe('tel:+41221234567');
	});
	it('retire un + parasite hors tête', () => {
		expect(buildTelHref('022+123')).toBe('tel:022123');
	});
	it('renvoie null si vide / null / espaces', () => {
		expect(buildTelHref('')).toBeNull();
		expect(buildTelHref(null)).toBeNull();
		expect(buildTelHref('   ')).toBeNull();
		expect(buildTelHref(undefined)).toBeNull();
	});
	it('renvoie null si aucun chiffre', () => {
		expect(buildTelHref('---')).toBeNull();
	});
});

describe('buildMailtoHref', () => {
	it('construit mailto:', () => {
		expect(buildMailtoHref('a@b.ch')).toBe('mailto:a@b.ch');
	});
	it('trim', () => {
		expect(buildMailtoHref('  a@b.ch ')).toBe('mailto:a@b.ch');
	});
	it('null si absent', () => {
		expect(buildMailtoHref(null)).toBeNull();
		expect(buildMailtoHref('')).toBeNull();
	});
});

describe('buildMapsHref', () => {
	it('encode l adresse', () => {
		expect(buildMapsHref('Rue du Rhône 12, 1204 Genève')).toBe(
			'https://maps.apple.com/?q=Rue%20du%20Rh%C3%B4ne%2012%2C%201204%20Gen%C3%A8ve',
		);
	});
	it('null si absente', () => {
		expect(buildMapsHref(null)).toBeNull();
		expect(buildMapsHref('  ')).toBeNull();
	});
});

describe('buildNativeActions', () => {
	it('ordre Appeler / Itinéraire / Email + disabled selon présence', () => {
		const a = buildNativeActions({ telephone: '022 1', adresse: null, email: 'x@y.ch' });
		expect(a.map((x) => x.kind)).toEqual(['call', 'directions', 'mail']);
		expect(a[0].disabled).toBe(false);
		expect(a[1].disabled).toBe(true); // pas d'adresse
		expect(a[1].href).toBeNull();
		expect(a[2].disabled).toBe(false);
	});
	it('toutes grisées si tout absent', () => {
		const a = buildNativeActions({});
		expect(a.every((x) => x.disabled && x.href === null)).toBe(true);
	});
});

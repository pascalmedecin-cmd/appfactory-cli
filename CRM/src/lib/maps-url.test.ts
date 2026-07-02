import { describe, it, expect } from 'vitest';
import { safeMapsUrl, prospectMapsUrl, GOOGLE_SOURCE } from './maps-url';

/**
 * Lien « Ouvrir sur Google Maps » - source UNIQUE (PDF de liste + page publique de validation).
 * Le libellé promet Google : un source_url arbitraire ne doit JAMAIS devenir un lien étiqueté Google.
 */
describe('safeMapsUrl (allowlist des hôtes Google Maps)', () => {
	it('accepte les hôtes Google Maps admis', () => {
		for (const u of [
			'https://www.google.com/maps/place/x',
			'https://google.com/maps',
			'https://maps.google.com/?cid=1',
			'https://www.google.ch/maps',
			'https://maps.app.goo.gl/abc',
			'https://goo.gl/maps/x',
		]) {
			expect(safeMapsUrl(u)).toBe(u);
		}
	});

	it('rejette un hôte arbitraire (non-Google) même si l’URL est bien formée', () => {
		expect(safeMapsUrl('https://evil.example.com/maps')).toBe(null);
		// Pas de sous-chaîne : l'allowlist est exacte sur le hostname.
		expect(safeMapsUrl('https://googlemaps.evil.com')).toBe(null);
		expect(safeMapsUrl('https://www.google.com.evil.com/maps')).toBe(null);
	});

	it('rejette les schémas non http(s) et les valeurs vides/malformées', () => {
		expect(safeMapsUrl('javascript:alert(1)')).toBe(null);
		expect(safeMapsUrl('data:text/html,x')).toBe(null);
		expect(safeMapsUrl(null)).toBe(null);
		expect(safeMapsUrl('pas une url')).toBe(null);
	});
});

describe('prospectMapsUrl (lien Maps réservé à la source google_places)', () => {
	it('retourne le lien Maps pour un prospect google_places', () => {
		expect(
			prospectMapsUrl({ source: GOOGLE_SOURCE, source_url: 'https://maps.google.com/?cid=1' })
		).toBe('https://maps.google.com/?cid=1');
	});

	it('retourne null pour toute autre source (pas de fiche Google)', () => {
		expect(
			prospectMapsUrl({ source: 'zefix', source_url: 'https://maps.google.com/?cid=1' })
		).toBe(null);
		expect(prospectMapsUrl({ source: 'search_ch', source_url: null })).toBe(null);
	});

	it('retourne null si le source_url d’un google_places n’est pas un hôte Google', () => {
		expect(prospectMapsUrl({ source: GOOGLE_SOURCE, source_url: 'https://evil.com/x' })).toBe(null);
	});
});

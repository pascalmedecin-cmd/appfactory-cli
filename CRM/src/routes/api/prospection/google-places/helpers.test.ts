import { describe, it, expect } from 'vitest';
import {
	isGenericKeyword,
	validateGooglePlacesImportInput,
	buildTextQuery,
	includedTypeFor,
	cantonRectangle,
	parsePlacesResponse,
	addressComponentsToFields,
	buildSourceId,
	placeMapsUrl,
	detectSecteurFromPlace,
} from './helpers';

describe('isGenericKeyword', () => {
	it('refuse les formes juridiques', () => {
		expect(isGenericKeyword('SA')).toBe(true);
		expect(isGenericKeyword('Sàrl')).toBe(true);
		expect(isGenericKeyword('gmbh')).toBe(true);
		expect(isGenericKeyword('entreprise')).toBe(true);
	});
	it('accepte un terme métier', () => {
		expect(isGenericKeyword('ventilation')).toBe(false);
		expect(isGenericKeyword('régie')).toBe(false);
	});
});

describe('validateGooglePlacesImportInput', () => {
	it('rejette un payload non-objet', () => {
		expect(validateGooglePlacesImportInput(null).valid).toBe(false);
		expect(validateGooglePlacesImportInput('x').valid).toBe(false);
	});
	it('rejette un type d’activité inconnu', () => {
		const r = validateGooglePlacesImportInput({ activityType: 'nope', canton: 'GE' });
		expect(r.valid).toBe(false);
	});
	it('rejette un canton hors liste', () => {
		const r = validateGooglePlacesImportInput({ activityType: 'cvc_hvac', canton: 'ZH' });
		expect(r.valid).toBe(false);
	});
	it('rejette un mot-clé trop court ou générique', () => {
		expect(validateGooglePlacesImportInput({ activityType: 'cvc_hvac', canton: 'GE', keyword: 'ab' }).valid).toBe(false);
		expect(validateGooglePlacesImportInput({ activityType: 'cvc_hvac', canton: 'GE', keyword: 'SARL' }).valid).toBe(false);
	});
	it('exige un mot-clé quand le type est « other »', () => {
		expect(validateGooglePlacesImportInput({ activityType: 'other', canton: 'GE' }).valid).toBe(false);
		const ok = validateGooglePlacesImportInput({ activityType: 'other', canton: 'GE', keyword: 'agencement' });
		expect(ok.valid).toBe(true);
	});
	it('accepte un input valide et normalise le canton', () => {
		const r = validateGooglePlacesImportInput({ activityType: 'regies_syndics', canton: 'vd' });
		expect(r.valid).toBe(true);
		if (r.valid) {
			expect(r.input.canton).toBe('VD');
			expect(r.input.activityType).toBe('regies_syndics');
			expect(r.input.keyword).toBeNull();
		}
	});
	it('valide from_intelligence (UUID) et from_term', () => {
		const r = validateGooglePlacesImportInput({
			activityType: 'bureaux_etudes', canton: 'GE',
			from_intelligence: '11111111-2222-3333-4444-555555555555', from_term: 'chauffage',
		});
		expect(r.valid).toBe(true);
		if (r.valid) {
			expect(r.input.from_intelligence).toBe('11111111-2222-3333-4444-555555555555');
			expect(r.input.from_term).toBe('chauffage');
		}
		const bad = validateGooglePlacesImportInput({ activityType: 'bureaux_etudes', canton: 'GE', from_intelligence: 'not-a-uuid' });
		expect(bad.valid && bad.input.from_intelligence).toBeNull();
	});
});

describe('buildTextQuery / includedTypeFor', () => {
	it('compose mot-clé métier + canton + Suisse', () => {
		const q = buildTextQuery({ activityType: 'regies_syndics', keyword: null, canton: 'GE' });
		expect(q).toContain('régie immobilière');
		expect(q).toContain('Genève');
		expect(q).toContain('Suisse');
	});
	it('ajoute le mot-clé complémentaire', () => {
		const q = buildTextQuery({ activityType: 'cvc_hvac', keyword: 'ventilation industrielle', canton: 'VD' });
		expect(q).toContain('ventilation industrielle');
		expect(q).toContain('Vaud');
	});
	it('« other » sans mot-clé métier propre : seuls le mot-clé saisi + canton', () => {
		const q = buildTextQuery({ activityType: 'other', keyword: 'cabinet médical', canton: 'GE' });
		expect(q).toContain('cabinet médical');
		expect(q).toContain('Genève');
	});
	it('aucun includedType natif (tout passe par mot-clé)', () => {
		expect(includedTypeFor('regies_syndics')).toBeNull();
		expect(includedTypeFor('entreprises_generales')).toBeNull();
		expect(includedTypeFor('commerce')).toBeNull();
		expect(includedTypeFor('other')).toBeNull();
	});
	it('parité bi-marque #5 : une catégorie LED valide + résout son keyword (union serveur)', () => {
		expect(validateGooglePlacesImportInput({ activityType: 'agences_evenementielles', canton: 'GE' }).valid).toBe(true);
		const q = buildTextQuery({ activityType: 'monteurs_stands', keyword: null, canton: 'VD' });
		expect(q).toContain('stand d’exposition');
		expect(q).toContain('Vaud');
		expect(includedTypeFor('agences_evenementielles')).toBeNull();
	});
});

describe('cantonRectangle', () => {
	it('retourne une boîte cohérente (low < high) pour chaque canton cible', () => {
		for (const c of ['GE', 'VD', 'VS', 'NE', 'FR', 'JU'] as const) {
			const r = cantonRectangle(c);
			expect(r.low.latitude).toBeLessThan(r.high.latitude);
			expect(r.low.longitude).toBeLessThan(r.high.longitude);
		}
	});
});

describe('addressComponentsToFields', () => {
	it('extrait rue+numéro, NPA, localité, canton', () => {
		const f = addressComponentsToFields([
			{ longText: 'Rue du Rhône', types: ['route'] },
			{ longText: '12', types: ['street_number'] },
			{ longText: '1204', types: ['postal_code'] },
			{ longText: 'Genève', types: ['locality'] },
			{ shortText: 'GE', longText: 'Genève', types: ['administrative_area_level_1'] },
		]);
		expect(f.adresse).toBe('Rue du Rhône 12');
		expect(f.npa).toBe('1204');
		expect(f.localite).toBe('Genève');
		expect(f.canton).toBe('GE');
	});
	it('NPA invalide → null ; champs absents → null', () => {
		expect(addressComponentsToFields([{ longText: 'CH-1000', types: ['postal_code'] }]).npa).toBeNull();
		const empty = addressComponentsToFields(undefined);
		expect(empty).toEqual({ adresse: null, npa: null, localite: null, canton: null });
	});
});

describe('parsePlacesResponse', () => {
	const sample = {
		places: [
			{
				id: 'ChIJabc123', displayName: { text: 'Régie Genève SA' }, formattedAddress: 'Rue du Rhône 12, 1204 Genève',
				businessStatus: 'OPERATIONAL', nationalPhoneNumber: '022 000 00 00', websiteUri: 'https://regie-ge.ch',
				googleMapsUri: 'https://maps.google.com/?cid=1', types: ['real_estate_agency', 'point_of_interest'],
				addressComponents: [
					{ longText: 'Rue du Rhône', types: ['route'] }, { longText: '12', types: ['street_number'] },
					{ longText: '1204', types: ['postal_code'] }, { longText: 'Genève', types: ['locality'] },
					{ shortText: 'GE', types: ['administrative_area_level_1'] },
				],
			},
			{ id: 'ChIJnophone', displayName: { text: 'Atelier Vaud' }, businessStatus: 'OPERATIONAL', types: ['painter'], addressComponents: [{ shortText: 'VD', types: ['administrative_area_level_1'] }] },
			{ id: 'ChIJclosed', displayName: { text: 'Ancienne Boîte' }, businessStatus: 'CLOSED_PERMANENTLY' },
			{ displayName: { text: 'Sans id' } },
		],
	};
	it('parse une entrée complète', () => {
		const r = parsePlacesResponse(sample);
		const ge = r.find((e) => e.placeId === 'ChIJabc123')!;
		expect(ge.name).toBe('Régie Genève SA');
		expect(ge.telephone).toBe('022 000 00 00');
		expect(ge.website).toBe('https://regie-ge.ch');
		expect(ge.canton).toBe('GE');
		expect(ge.cantonInTargets).toBe(true);
	});
	it('garde une entrée sans téléphone ni site', () => {
		const r = parsePlacesResponse(sample);
		const vd = r.find((e) => e.placeId === 'ChIJnophone')!;
		expect(vd.telephone).toBeNull();
		expect(vd.website).toBeNull();
		expect(vd.canton).toBe('VD');
	});
	it('ignore les établissements non OPERATIONAL et sans id', () => {
		const r = parsePlacesResponse(sample);
		expect(r.some((e) => e.name === 'Ancienne Boîte')).toBe(false);
		expect(r.some((e) => e.name === 'Sans id')).toBe(false);
	});
	it('canton hors cibles → canton null + cantonInTargets false', () => {
		const r = parsePlacesResponse({ places: [{ id: 'x', displayName: { text: 'Zurich Bau' }, addressComponents: [{ shortText: 'ZH', types: ['administrative_area_level_1'] }] }] });
		expect(r[0].canton).toBeNull();
		expect(r[0].cantonInTargets).toBe(false);
	});
	it('filtre les URLs non http(s)', () => {
		const r = parsePlacesResponse({ places: [{ id: 'x', displayName: { text: 'YZ Co' }, websiteUri: 'javascript:alert(1)' }] });
		expect(r[0].website).toBeNull();
	});
	it('payload invalide → []', () => {
		expect(parsePlacesResponse(null)).toEqual([]);
		expect(parsePlacesResponse({})).toEqual([]);
		expect(parsePlacesResponse({ places: 'x' })).toEqual([]);
	});
});

describe('buildSourceId / placeMapsUrl', () => {
	it('source_id préfixé pid: et tronqué à 80', () => {
		expect(buildSourceId('ChIJabc')).toBe('pid:ChIJabc');
		expect(buildSourceId('x'.repeat(200)).length).toBeLessThanOrEqual(80);
	});
	it('URL Maps canonique', () => {
		expect(placeMapsUrl('ChIJa b')).toContain('place_id:ChIJa%20b');
	});
});

describe('detectSecteurFromPlace', () => {
	it('détecte depuis le nom', () => {
		expect(detectSecteurFromPlace({ name: 'Vitrerie Lausanne' }, 'filmpro')).toBe('menuiserie');
		expect(detectSecteurFromPlace({ name: 'Régie du Lac' }, 'filmpro')).toBe('regie');
	});
	it('détecte depuis les types Google', () => {
		expect(detectSecteurFromPlace({ name: 'XYZ', types: ['electrician'] }, 'filmpro')).toBe('electricite');
		expect(detectSecteurFromPlace({ name: 'XYZ', types: ['roofing_contractor'] }, 'filmpro')).toBe('menuiserie');
		expect(detectSecteurFromPlace({ name: 'XYZ', types: ['real_estate_agency'] }, 'filmpro')).toBe('regie');
	});
	it('rien → null', () => {
		expect(detectSecteurFromPlace({ name: 'Boulangerie du coin', types: ['bakery'] }, 'filmpro')).toBeNull();
	});
});

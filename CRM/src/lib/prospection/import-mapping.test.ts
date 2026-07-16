import { describe, it, expect } from 'vitest';
import { autoMapColumns, applyMapping, normalizeHeader, CRM_IMPORT_FIELDS, isImportFieldKey } from './import-mapping';

describe('normalizeHeader', () => {
	it('retire accents, casse, ponctuation, compacte les espaces', () => {
		expect(normalizeHeader('ADRESSE_COMPLÈTE')).toBe('adresse complete');
		expect(normalizeHeader('  E-Mail  ')).toBe('e mail');
		expect(normalizeHeader('Téléphone')).toBe('telephone');
	});
});

describe('autoMapColumns - vraies listes Pascal (scrape Google Maps)', () => {
	it('reconnaît les en-têtes du format G7 et ignore le superflu', () => {
		const headers = ['NOM', 'ADRESSE COMPLETE', 'NPA', 'VILLE', 'TELEPHONE', 'CATEGORIE', 'SITE WEB', 'EMAILS', 'NOTE GOOGLE', 'PLACE ID'];
		expect(autoMapColumns(headers)).toEqual([
			'raison_sociale', 'adresse', 'npa', 'localite', 'telephone', 'secteur_detecte', 'site_web', 'email', null, null,
		]);
	});

	it('insensible à la casse et aux accents', () => {
		expect(autoMapColumns(['Raison Sociale', 'Localité', 'Courriel'])).toEqual([
			'raison_sociale', 'localite', 'email',
		]);
	});

	it('ne mappe jamais canton (déduit du NPA)', () => {
		expect(autoMapColumns(['CANTON', 'NOM'])).toEqual([null, 'raison_sociale']);
	});

	it('un même champ n’est attribué qu’à UNE colonne (première gagne)', () => {
		expect(autoMapColumns(['NOM', 'ENTREPRISE'])).toEqual(['raison_sociale', null]);
	});

	it('colonnes inconnues → null (pas de faux positif)', () => {
		expect(autoMapColumns(['XYZ', 'commentaire interne'])).toEqual([null, null]);
	});
});

describe('applyMapping', () => {
	it('reconstruit l’objet-ligne depuis le mapping', () => {
		const row = ['Régie du Rhône SA', 'Rue du Rhône 14', '1204', 'Genève', '+41 22 000', 'Gérance', 'https://x.ch', 'a@x.ch', '4.6', 'ChIJ'];
		const mapping = ['raison_sociale', 'adresse', 'npa', 'localite', 'telephone', 'secteur_detecte', 'site_web', 'email', null, null] as const;
		expect(applyMapping(row, [...mapping])).toEqual({
			raison_sociale: 'Régie du Rhône SA',
			adresse: 'Rue du Rhône 14',
			npa: '1204',
			localite: 'Genève',
			telephone: '+41 22 000',
			secteur_detecte: 'Gérance',
			site_web: 'https://x.ch',
			email: 'a@x.ch',
		});
	});

	it('trim les valeurs et ignore les cellules vides', () => {
		expect(applyMapping(['  Naef  ', ''], ['raison_sociale', 'telephone'])).toEqual({ raison_sociale: 'Naef' });
	});

	it('première colonne non vide gagne quand une cible est mappée 2×', () => {
		expect(applyMapping(['', 'Naef'], ['raison_sociale', 'raison_sociale'])).toEqual({ raison_sociale: 'Naef' });
	});
});

describe('métadonnées', () => {
	it('raison_sociale est le seul champ requis', () => {
		expect(CRM_IMPORT_FIELDS.filter((f) => f.required).map((f) => f.key)).toEqual(['raison_sociale']);
	});
	it('isImportFieldKey garde les clés valides', () => {
		expect(isImportFieldKey('raison_sociale')).toBe(true);
		expect(isImportFieldKey('canton')).toBe(false);
		expect(isImportFieldKey(null)).toBe(false);
	});
});

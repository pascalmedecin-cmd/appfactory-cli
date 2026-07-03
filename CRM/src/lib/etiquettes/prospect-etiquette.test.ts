import { describe, it, expect } from 'vitest';
import { adresseStatut, toEtiquetteEntry, capitalizeNomEtiquette, type ProspectAdresse } from './prospect-etiquette';

function lead(p: Partial<ProspectAdresse>): ProspectAdresse {
	return {
		id: p.id ?? 'id-1',
		raison_sociale: p.raison_sociale ?? 'Régie Test SA',
		adresse: p.adresse ?? null,
		npa: p.npa ?? null,
		localite: p.localite ?? null
	};
}

describe('adresseStatut', () => {
	it('complète quand rue + localité présentes', () => {
		const s = adresseStatut(lead({ adresse: 'Rue du Marché 12', npa: '1204', localite: 'Genève' }));
		expect(s.complete).toBe(true);
		expect(s.manque).toEqual([]);
	});

	it('NPA optionnel : localité sans NPA reste complète', () => {
		const s = adresseStatut(lead({ adresse: 'Grand-Rue 3', npa: null, localite: 'Nyon' }));
		expect(s.complete).toBe(true);
	});

	it('signale la rue manquante', () => {
		const s = adresseStatut(lead({ adresse: '  ', localite: 'Lausanne' }));
		expect(s.complete).toBe(false);
		expect(s.manque).toEqual(['rue']);
	});

	it('signale la localité manquante', () => {
		const s = adresseStatut(lead({ adresse: 'Avenue de la Gare 1', localite: null }));
		expect(s.complete).toBe(false);
		expect(s.manque).toEqual(['localité']);
	});

	it('signale les deux manquants', () => {
		const s = adresseStatut(lead({ adresse: null, npa: '1000', localite: null }));
		expect(s.complete).toBe(false);
		expect(s.manque).toEqual(['rue', 'localité']);
	});
});

describe('toEtiquetteEntry', () => {
	it('mappe les 3 lignes (nom gras, rue, NPA + ville)', () => {
		const e = toEtiquetteEntry(lead({ raison_sociale: 'Boutique Léman', adresse: 'Rue Basse 7', npa: '1201', localite: 'Genève' }));
		expect(e).toEqual({ nom: 'Boutique Léman', rue: 'Rue Basse 7', cpVille: '1201 Genève' });
	});

	it('compacte les espaces et trim', () => {
		const e = toEtiquetteEntry(lead({ raison_sociale: '  Cabasso  ', adresse: ' Quai 4 ', npa: ' 1820 ', localite: ' Montreux ' }));
		expect(e.nom).toBe('Cabasso');
		expect(e.rue).toBe('Quai 4');
		expect(e.cpVille).toBe('1820 Montreux');
	});

	it('NPA seul ou ville seule ne laisse pas d’espace orphelin', () => {
		expect(toEtiquetteEntry(lead({ npa: '1004', localite: null })).cpVille).toBe('1004');
		expect(toEtiquetteEntry(lead({ npa: null, localite: 'Sion' })).cpVille).toBe('Sion');
		expect(toEtiquetteEntry(lead({ npa: null, localite: null })).cpVille).toBe('');
	});

	it('sans destinataire : entrée à 3 clés (rétro-compatible, aucune clé destinataire)', () => {
		const e = toEtiquetteEntry(lead({ adresse: 'Rue Basse 7', localite: 'Genève' }));
		expect(e.destinataire).toBeUndefined();
		expect(Object.keys(e).sort()).toEqual(['cpVille', 'nom', 'rue']);
	});

	it('avec destinataire : ajouté (trim) sous le nom', () => {
		const e = toEtiquetteEntry(
			lead({ raison_sociale: 'Naef Immobilier SA', adresse: 'Rue du Rhône 12', npa: '1204', localite: 'Genève' }),
			'  Service technique, M. Roth  '
		);
		expect(e).toEqual({
			nom: 'Naef Immobilier SA',
			destinataire: 'Service technique, M. Roth',
			rue: 'Rue du Rhône 12',
			cpVille: '1204 Genève'
		});
	});

	it('destinataire vide ou blanc = pas de clé destinataire', () => {
		expect(toEtiquetteEntry(lead({}), '').destinataire).toBeUndefined();
		expect(toEtiquetteEntry(lead({}), '   ').destinataire).toBeUndefined();
	});
});

describe('capitalizeNomEtiquette (noms Google Places tout-minuscules, Pascal 2026-07-03)', () => {
	it('exemple verbatim Pascal : « pharmacieplus du rond-point » -> « Pharmacieplus du Rond-Point »', () => {
		expect(capitalizeNomEtiquette('pharmacieplus du rond-point')).toBe('Pharmacieplus du Rond-Point');
	});

	it('majuscule par mot, particules laissées en minuscule au milieu', () => {
		expect(capitalizeNomEtiquette('café de la place')).toBe('Café de la Place');
		expect(capitalizeNomEtiquette('au pied de cochon')).toBe('Au Pied de Cochon');
	});

	it('particule en TÊTE de nom : majuscule quand même', () => {
		expect(capitalizeNomEtiquette('la finestra')).toBe('La Finestra');
		expect(capitalizeNomEtiquette('le 23')).toBe('Le 23');
	});

	it('élision « l’ »/« d’ » hors tête : conservée en minuscule, suite capitalisée', () => {
		expect(capitalizeNomEtiquette("fouchault l'opticien")).toBe("Fouchault l'Opticien");
		expect(capitalizeNomEtiquette('caves d’or')).toBe('Caves d’Or');
	});

	it('ne dégrade JAMAIS un nom déjà casé (aucune minusculisation)', () => {
		for (const nom of [
			'ACUITIS Opticien & Audioprothésiste Genève',
			'Demi Lune Café',
			'La PHARMACIE Rive Gauche',
			'VIU - Optiker & Brillengeschäft',
			'Optic 2000 Choitel Corraterie - Opticien Genève'
		]) {
			expect(capitalizeNomEtiquette(nom)).toBe(nom);
		}
	});

	it('appliquée au nom par toEtiquetteEntry, ADRESSE 100 % verbatim Google', () => {
		const e = toEtiquetteEntry(
			lead({
				raison_sociale: 'pharmacieplus du rond-point',
				adresse: 'rond-point de plainpalais 6',
				npa: '1205',
				localite: 'genève'
			})
		);
		expect(e.nom).toBe('Pharmacieplus du Rond-Point');
		expect(e.rue).toBe('rond-point de plainpalais 6'); // rue intacte (décision Pascal)
		expect(e.cpVille).toBe('1205 genève'); // localité intacte aussi
	});

	it('le destinataire saisi par Pascal reste verbatim', () => {
		const e = toEtiquetteEntry(lead({ raison_sociale: 'x' }), 'service technique, m. roth');
		expect(e.destinataire).toBe('service technique, m. roth');
	});
});

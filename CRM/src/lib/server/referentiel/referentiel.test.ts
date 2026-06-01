import { describe, it, expect } from 'vitest';
import {
	escapeLikePattern,
	buildEntrepriseInsert,
	buildEntrepriseUpdate,
	type EntrepriseUpsertInput
} from './entreprises';
import { buildContactInsert, buildContactUpdate, type ContactUpsertInput } from './contacts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('escapeLikePattern (dédup entreprise, bug-hunter N1)', () => {
	it('échappe %, _ et backslash', () => {
		expect(escapeLikePattern('Foo%')).toBe('Foo\\%');
		expect(escapeLikePattern('Foo_Bar')).toBe('Foo\\_Bar');
		expect(escapeLikePattern('a\\b')).toBe('a\\\\b');
	});
	it('laisse intacte une saisie sans wildcard', () => {
		expect(escapeLikePattern('Vitrage SA')).toBe('Vitrage SA');
	});
});

describe('buildEntrepriseInsert', () => {
	const base: EntrepriseUpsertInput = {
		raison_sociale: 'Vitrages Léman SA',
		secteur_activite: 'construction',
		canton: 'GE',
		taille_estimee: '',
		site_web: '',
		numero_ide: '',
		adresse_siege: '',
		segment_cible: '',
		source: '',
		notes_libres: '',
		tags: ''
	};

	it('mappe les champs et génère id + timestamps + statut initial', () => {
		const row = buildEntrepriseInsert(base);
		expect(row.raison_sociale).toBe('Vitrages Léman SA');
		expect(row.secteur_activite).toBe('construction');
		expect(row.canton).toBe('GE');
		expect(row.statut_qualification).toBe('nouveau');
		expect(typeof row.id).toBe('string');
		expect(UUID_RE.test(row.id as string)).toBe(true);
		expect(row.date_import_ajout).toBe(row.date_derniere_modification);
	});

	it('convertit les chaînes vides en null (jamais de "" en DB)', () => {
		const row = buildEntrepriseInsert(base);
		expect(row.taille_estimee).toBeNull();
		expect(row.site_web).toBeNull();
		expect(row.numero_ide).toBeNull();
		expect(row.tags).toBeNull();
	});
});

describe('buildEntrepriseUpdate', () => {
	it('mappe les champs sans id et rafraîchit date_derniere_modification', () => {
		const row = buildEntrepriseUpdate({
			raison_sociale: 'X SA',
			secteur_activite: '',
			canton: '',
			taille_estimee: '',
			site_web: '',
			numero_ide: '',
			adresse_siege: '',
			segment_cible: '',
			source: '',
			notes_libres: '',
			tags: ''
		});
		expect(row.raison_sociale).toBe('X SA');
		expect(row.canton).toBeNull();
		expect('id' in row).toBe(false);
		expect(typeof row.date_derniere_modification).toBe('string');
	});
});

describe('buildContactInsert / buildContactUpdate', () => {
	const base: ContactUpsertInput = {
		nom: 'Dupont',
		prenom: 'Jean',
		email_professionnel: '',
		telephone: '',
		role_fonction: '',
		entreprise_id: '',
		canton: '',
		segment: '',
		source: '',
		notes_libres: '',
		adresse: '',
		tags: ''
	};

	it('insert : flags initiaux + id + timestamps + chaînes vides → null', () => {
		const row = buildContactInsert(base);
		expect(row.nom).toBe('Dupont');
		expect(row.prenom).toBe('Jean');
		expect(row.email_professionnel).toBeNull();
		expect(row.entreprise_id).toBeNull();
		expect(row.statut_qualification).toBe('nouveau');
		expect(row.statut_archive).toBe(false);
		expect(row.est_prescripteur).toBe(false);
		expect(row.doublon_detecte).toBe(false);
		expect(UUID_RE.test(row.id as string)).toBe(true);
		expect(row.date_ajout).toBe(row.date_derniere_modification);
	});

	it('update : mappe sans id ni flags initiaux, rafraîchit la date', () => {
		const row = buildContactUpdate({ ...base, entreprise_id: '550e8400-e29b-41d4-a716-446655440000' });
		expect(row.nom).toBe('Dupont');
		expect(row.entreprise_id).toBe('550e8400-e29b-41d4-a716-446655440000');
		expect('id' in row).toBe(false);
		expect('statut_archive' in row).toBe(false);
		expect(typeof row.date_derniere_modification).toBe('string');
	});
});

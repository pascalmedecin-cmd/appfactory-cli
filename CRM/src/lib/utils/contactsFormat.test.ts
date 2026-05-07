import { describe, it, expect } from 'vitest';
import {
	normalizeCompanyName,
	contactsIndicators,
	filterContactsByTab,
	contactsCountsByTab,
	type ContactLite,
} from './contactsFormat';

const NOW = new Date('2026-05-08T10:00:00');

describe('normalizeCompanyName', () => {
	it('lowercase + trim', () => {
		expect(normalizeCompanyName('  Glas-Pro-Tect  ')).toBe('glasprotect');
	});
	it('strip suffixes légaux suisses + germaniques', () => {
		expect(normalizeCompanyName('Vitrerie Lausanne SA')).toBe('vitrerielausanne');
		expect(normalizeCompanyName('Helvetia Energy AG')).toBe('helvetiaenergy');
		expect(normalizeCompanyName('Bondzio GmbH')).toBe('bondzio');
		expect(normalizeCompanyName('Foo Sàrl')).toBe('foo');
		expect(normalizeCompanyName('Bar S.A.')).toBe('bar');
	});
	it('strip non-alphanumeric (garde accents fr)', () => {
		expect(normalizeCompanyName('Café & Co')).toBe('caféco');
	});
	it('matche fuzzy entre variantes équivalentes', () => {
		expect(normalizeCompanyName('Vitrerie Lausanne SA')).toBe(normalizeCompanyName('vitrerie lausanne'));
		expect(normalizeCompanyName('Glas-Pro-Tect SA')).toBe(normalizeCompanyName('Glas Pro Tect'));
	});
});

describe('contactsIndicators', () => {
	const contacts: ContactLite[] = [
		{ id: '1', entreprise_id: 'ent1', statut_qualification: 'nouveau', est_prescripteur: false, date_ajout: '2026-05-02' },
		{ id: '2', entreprise_id: 'ent1', statut_qualification: 'qualifie', est_prescripteur: true, date_ajout: '2026-05-05' },
		{ id: '3', entreprise_id: null, statut_qualification: 'nouveau', est_prescripteur: false, date_ajout: '2026-04-15' },
		{ id: '4', entreprise_id: 'ent2', statut_qualification: 'en_cours', est_prescripteur: true, date_ajout: '2026-04-20' },
		{ id: '5', entreprise_id: null, statut_qualification: 'nouveau', est_prescripteur: false, date_ajout: '2026-05-08' },
	];

	it('compte total', () => {
		expect(contactsIndicators(contacts, NOW).total).toBe(5);
	});

	it('compte prescripteurs (est_prescripteur=true uniquement)', () => {
		expect(contactsIndicators(contacts, NOW).prescripteurs).toBe(2); // ids 2, 4
	});

	it('compte nouveaux ce mois (date_ajout >= 1er mai)', () => {
		expect(contactsIndicators(contacts, NOW).nouveauxThisMonth).toBe(3); // ids 1, 2, 5
	});

	it('compte sans entreprise (entreprise_id=null)', () => {
		expect(contactsIndicators(contacts, NOW).sansEntreprise).toBe(2); // ids 3, 5
	});

	it('liste vide → tous zéros', () => {
		expect(contactsIndicators([], NOW)).toEqual({
			total: 0,
			prescripteurs: 0,
			nouveauxThisMonth: 0,
			sansEntreprise: 0,
		});
	});

	it('date_ajout invalide ou null ne pète pas', () => {
		const c: ContactLite[] = [
			{ id: '1', entreprise_id: 'ent', statut_qualification: 'nouveau', est_prescripteur: false, date_ajout: null },
			{ id: '2', entreprise_id: 'ent', statut_qualification: 'nouveau', est_prescripteur: false, date_ajout: 'pas-une-date' },
		];
		expect(contactsIndicators(c, NOW).total).toBe(2);
		expect(contactsIndicators(c, NOW).nouveauxThisMonth).toBe(0);
	});
});

describe('filterContactsByTab', () => {
	const contacts: ContactLite[] = [
		{ id: '1', entreprise_id: 'ent1', statut_qualification: 'nouveau', est_prescripteur: false, date_ajout: null },
		{ id: '2', entreprise_id: 'ent1', statut_qualification: 'qualifie', est_prescripteur: true, date_ajout: null },
		{ id: '3', entreprise_id: null, statut_qualification: 'nouveau', est_prescripteur: false, date_ajout: null },
	];

	it('tab=tous → retourne tous', () => {
		expect(filterContactsByTab(contacts, 'tous')).toHaveLength(3);
	});
	it('tab=prescripteurs → uniquement est_prescripteur=true', () => {
		const out = filterContactsByTab(contacts, 'prescripteurs');
		expect(out).toHaveLength(1);
		expect(out[0].id).toBe('2');
	});
	it('tab=a-qualifier → statut_qualification=nouveau', () => {
		const out = filterContactsByTab(contacts, 'a-qualifier');
		expect(out).toHaveLength(2);
		expect(out.map((c) => c.id).sort()).toEqual(['1', '3']);
	});
	it('tab=sans-entreprise → entreprise_id null/falsy', () => {
		const out = filterContactsByTab(contacts, 'sans-entreprise');
		expect(out).toHaveLength(1);
		expect(out[0].id).toBe('3');
	});
});

describe('contactsCountsByTab', () => {
	it('counts par tab cohérent avec filterContactsByTab', () => {
		const contacts: ContactLite[] = [
			{ id: '1', entreprise_id: 'ent', statut_qualification: 'nouveau', est_prescripteur: false, date_ajout: null },
			{ id: '2', entreprise_id: null, statut_qualification: 'nouveau', est_prescripteur: true, date_ajout: null },
			{ id: '3', entreprise_id: 'ent', statut_qualification: 'qualifie', est_prescripteur: true, date_ajout: null },
		];
		expect(contactsCountsByTab(contacts)).toEqual({
			tous: 3,
			prescripteurs: 2,
			'a-qualifier': 2,
			'sans-entreprise': 1,
		});
	});
});

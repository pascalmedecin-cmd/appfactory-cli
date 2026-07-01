import { describe, it, expect } from 'vitest';
import { summarize, filterProspects, buildEtiquetteEntries } from './etiquettes-page';
import type { ProspectAdresse } from './prospect-etiquette';

function lead(p: Partial<ProspectAdresse> & { id: string }): ProspectAdresse {
	return {
		id: p.id,
		raison_sociale: p.raison_sociale ?? 'Régie Test SA',
		adresse: p.adresse ?? null,
		npa: p.npa ?? null,
		localite: p.localite ?? null
	};
}

const complet1 = lead({ id: 'a', raison_sociale: 'Naef Immobilier SA', adresse: 'Rue du Rhône 12', npa: '1204', localite: 'Genève' });
const complet2 = lead({ id: 'b', raison_sociale: 'Comptoir Immobilier SA', adresse: 'Rue de la Corraterie 24', npa: '1204', localite: 'Genève' });
const incomplet = lead({ id: 'c', raison_sociale: 'Régie du Centre SA', adresse: null, npa: '1201', localite: null });

describe('summarize', () => {
	it('compte le total, les adresses complètes et les destinataires non vides', () => {
		const dest = new Map([
			['a', 'Service technique'],
			['b', '   '], // blanc = pas renseigné
			['c', 'Direction']
		]);
		expect(summarize([complet1, complet2, incomplet], dest)).toEqual({
			total: 3,
			completes: 2,
			destinataires: 2 // 'a' et 'c' ; 'b' blanc ignoré
		});
	});

	it('map de destinataires vide -> 0 destinataire', () => {
		expect(summarize([complet1, incomplet], new Map())).toEqual({ total: 2, completes: 1, destinataires: 0 });
	});
});

describe('filterProspects', () => {
	it('par défaut masque les adresses incomplètes (vue prête à imprimer)', () => {
		const out = filterProspects([complet1, complet2, incomplet]);
		expect(out.map((p) => p.id)).toEqual(['a', 'b']);
	});

	it('includeIncomplete: true montre aussi les incomplètes', () => {
		const out = filterProspects([complet1, incomplet], { includeIncomplete: true });
		expect(out.map((p) => p.id)).toEqual(['a', 'c']);
	});

	it('recherche insensible à la casse sur raison sociale / localité', () => {
		expect(filterProspects([complet1, complet2], { search: 'naef' }).map((p) => p.id)).toEqual(['a']);
		expect(filterProspects([complet1, complet2], { search: 'GENÈVE' }).map((p) => p.id)).toEqual(['a', 'b']);
	});

	it('recherche + incomplètes : la complétude filtre AVANT la recherche', () => {
		// 'Régie du Centre' matche mais est incomplète -> masquée sans includeIncomplete
		expect(filterProspects([complet1, incomplet], { search: 'régie' })).toEqual([]);
		expect(filterProspects([complet1, incomplet], { search: 'centre', includeIncomplete: true }).map((p) => p.id)).toEqual(['c']);
	});
});

describe('buildEtiquetteEntries', () => {
	it('injecte le destinataire local par id, ordre préservé', () => {
		const dest = new Map([['a', 'Service technique, M. Roth']]);
		const entries = buildEtiquetteEntries([complet1, complet2], dest);
		expect(entries[0]).toEqual({
			nom: 'Naef Immobilier SA',
			destinataire: 'Service technique, M. Roth',
			rue: 'Rue du Rhône 12',
			cpVille: '1204 Genève'
		});
		// complet2 sans destinataire -> pas de clé destinataire
		expect(entries[1].destinataire).toBeUndefined();
		expect(entries[1].nom).toBe('Comptoir Immobilier SA');
	});
});

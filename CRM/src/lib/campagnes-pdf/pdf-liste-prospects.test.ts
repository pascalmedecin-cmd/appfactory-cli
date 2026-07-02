import { describe, it, expect } from 'vitest';
import {
	googleTypesFromDescription,
	humanizeGoogleType,
	toListeRow,
	paginateRows,
	buildListePagesSvg,
	listeFileName,
	LISTE_GEOMETRY,
	LISTE_COLS,
	PAGE_W,
	PAGE_H,
	type ListeProspectRow
} from './pdf-liste-prospects';
import type { ProspectCampagne } from '$lib/campagnes';

/** Prospect de campagne minimal (les champs non pertinents pour le PDF sont figés). */
function lead(over: Partial<ProspectCampagne> = {}): ProspectCampagne {
	return {
		id: 'L1',
		raison_sociale: 'Régie du Lac SA',
		adresse: 'Quai des Fleurs 12',
		npa: '1006',
		localite: 'Lausanne',
		statut: 'vide',
		score_pertinence: 5,
		source: 'google_places',
		source_url: 'https://maps.google.com/?cid=123',
		description: 'Quai des Fleurs 12, 1006 Lausanne, Suisse — real_estate_agency / point_of_interest / establishment',
		...over
	};
}

describe('googleTypesFromDescription (ré-extraction du segment types)', () => {
	it('extrait les types depuis « adresse — types — mentions »', () => {
		expect(
			googleTypesFromDescription('Rue Basse 7, 1201 Genève, Suisse — store / clothing_store — déjà connue (Zefix)')
		).toEqual(['store', 'clothing_store']);
	});

	it('extrait un segment types seul (pas d’adresse formatée)', () => {
		expect(googleTypesFromDescription('real_estate_agency')).toEqual(['real_estate_agency']);
	});

	it('ne matche JAMAIS une adresse formatée ni une mention FR', () => {
		expect(googleTypesFromDescription('Rue Basse 7, 1201 Genève, Suisse — canton non déterminé')).toEqual([]);
		expect(googleTypesFromDescription('déjà connue (Zefix)')).toEqual([]);
	});

	it('description null ou vide -> []', () => {
		expect(googleTypesFromDescription(null)).toEqual([]);
		expect(googleTypesFromDescription('')).toEqual([]);
	});
});

describe('humanizeGoogleType', () => {
	it('remplace les underscores et capitalise', () => {
		expect(humanizeGoogleType('real_estate_agency')).toBe('Real estate agency');
		expect(humanizeGoogleType('store')).toBe('Store');
	});
});

describe('toListeRow (dérivation PDF d’un prospect)', () => {
	it('lead Google : type principal = 1er type + pastille Maps', () => {
		const r = toListeRow(lead());
		expect(r.typePrincipal).toBe('Real estate agency');
		expect(r.mapsUrl).toBe('https://maps.google.com/?cid=123');
	});

	it('lead non-Google : colonnes Google vides même si des champs existent', () => {
		const r = toListeRow(lead({ source: 'zefix', source_url: 'https://zefix.ch/x', description: 'store' }));
		expect(r.typePrincipal).toBeNull();
		expect(r.mapsUrl).toBeNull();
	});

	it('lead Google sans URL exploitable -> pas de pastille (jamais de lien non-http)', () => {
		expect(toListeRow(lead({ source_url: null })).mapsUrl).toBeNull();
		expect(toListeRow(lead({ source_url: 'javascript:alert(1)' })).mapsUrl).toBeNull();
	});

	it('la pastille « Google Maps » ne pointe QUE vers un hôte Google (le libellé tient sa promesse)', () => {
		// Durcissement audit sécu 02/07 : un source_url arbitraire ne devient jamais un lien étiqueté Google.
		expect(toListeRow(lead({ source_url: 'https://evil.example.com/phishing' })).mapsUrl).toBeNull();
		expect(toListeRow(lead({ source_url: 'https://maps.app.goo.gl/AbC123' })).mapsUrl).toBe('https://maps.app.goo.gl/AbC123');
		expect(toListeRow(lead({ source_url: 'https://www.google.com/maps/place/?q=place_id:X' })).mapsUrl).toBe(
			'https://www.google.com/maps/place/?q=place_id:X'
		);
	});

	it('lead Google sans types dans la description -> type principal null', () => {
		expect(toListeRow(lead({ description: 'Rue Basse 7, 1201 Genève, Suisse' })).typePrincipal).toBeNull();
	});
});

describe('paginateRows (pagination pure)', () => {
	const cap1 = Math.floor(
		(LISTE_GEOMETRY.CONTENT_BOTTOM - (LISTE_GEOMETRY.TABLE_TOP_P1 + LISTE_GEOMETRY.HEAD_H)) / LISTE_GEOMETRY.ROW_H
	);
	const capN = Math.floor(
		(LISTE_GEOMETRY.CONTENT_BOTTOM - (LISTE_GEOMETRY.TABLE_TOP_PN + LISTE_GEOMETRY.HEAD_H)) / LISTE_GEOMETRY.ROW_H
	);

	it('0 ligne -> aucune page ; 1 ligne -> 1 page', () => {
		expect(paginateRows(0)).toEqual([]);
		expect(paginateRows(1)).toEqual([1]);
	});

	it('remplit la page 1 (bloc titre) puis les suivantes, somme préservée', () => {
		const n = cap1 + capN + 3;
		const pages = paginateRows(n);
		expect(pages[0]).toBe(cap1);
		expect(pages[1]).toBe(capN);
		expect(pages[2]).toBe(3);
		expect(pages.reduce((a, b) => a + b, 0)).toBe(n);
	});

	it('capacités cohérentes : page 1 < pages suivantes (le titre prend de la place)', () => {
		expect(cap1).toBeGreaterThan(0);
		expect(capN).toBeGreaterThan(cap1);
	});
});

describe('buildListePagesSvg (rendu + zones cliquables)', () => {
	function rows(n: number, googleEvery = 1): ListeProspectRow[] {
		return Array.from({ length: n }, (_, i) => ({
			nom: `Entreprise ${i + 1}`,
			adresse: 'Rue du Test 1',
			npa: '1000',
			localite: 'Lausanne',
			typePrincipal: i % googleEvery === 0 ? 'Store' : null,
			mapsUrl: i % googleEvery === 0 ? `https://maps.google.com/?cid=${i}` : null
		}));
	}

	it('1 lien par ligne Google, aucun pour les autres, page correcte', () => {
		const { links } = buildListePagesSvg('Test', '2 juillet 2026', rows(4, 2), '');
		expect(links).toHaveLength(2);
		expect(links.every((l) => l.page === 0)).toBe(true);
		expect(links[0].url).toBe('https://maps.google.com/?cid=0');
	});

	it('les liens des pages suivantes portent le bon index de page', () => {
		const many = rows(40, 1); // déborde sur la page 2
		const { svgs, links } = buildListePagesSvg('Test', '2 juillet 2026', many, '');
		expect(svgs.length).toBeGreaterThan(1);
		expect(links).toHaveLength(40);
		const pages = paginateRows(40);
		expect(links.filter((l) => l.page === 0)).toHaveLength(pages[0]);
		expect(links.filter((l) => l.page === 1)).toHaveLength(pages[1]);
	});

	it('chaque zone cliquable reste dans la page et dans la colonne Maps', () => {
		const { links } = buildListePagesSvg('Test', '2 juillet 2026', rows(30), '');
		for (const l of links) {
			expect(l.x).toBeCloseTo(LISTE_GEOMETRY.MARGIN + LISTE_COLS.maps.x, 5);
			expect(l.w).toBe(LISTE_GEOMETRY.PILL_W);
			expect(l.x + l.w).toBeLessThanOrEqual(PAGE_W);
			expect(l.y).toBeGreaterThan(0);
			expect(l.y + l.h).toBeLessThanOrEqual(PAGE_H);
		}
	});

	it('la pastille affiche le libellé, jamais l’URL brute', () => {
		const { svgs } = buildListePagesSvg('Test', '2 juillet 2026', rows(1), '');
		expect(svgs[0]).toContain('Ouvrir sur Google Maps');
		expect(svgs[0]).not.toContain('maps.google.com');
	});

	it('en-tête page 1 : nom de campagne + date + numérotation en pied', () => {
		const { svgs } = buildListePagesSvg('Salon Habitat 2026', '2 juillet 2026', rows(2), '');
		expect(svgs[0]).toContain('Salon Habitat 2026');
		expect(svgs[0]).toContain('liste téléchargée le 2 juillet 2026');
		expect(svgs[0]).toContain('1 / 1');
	});

	it('template validé Pascal 02/07 : pas de mention haut-droite ni de texte de footer, numéro CENTRÉ', () => {
		const { svgs } = buildListePagesSvg('Salon Habitat 2026', '2 juillet 2026', rows(40), '');
		for (const svg of svgs) {
			expect(svg).not.toContain('Traitements pour vitrage');
			expect(svg).not.toContain('LISTE DES PROSPECTS');
			expect(svg).not.toContain('FilmPro · Liste des prospects');
		}
		// Numéro de page centré : text-anchor middle à x = PAGE_W / 2.
		const centered = new RegExp(`<text x="${(PAGE_W / 2).toFixed(2).replace('.', '\\.')}"[^>]*text-anchor="middle">1 / `);
		expect(svgs[0]).toMatch(centered);
	});

	it('valeur absente -> tiret court, et le contenu est échappé XML', () => {
		const r: ListeProspectRow[] = [
			{ nom: 'A & B <SA>', adresse: '', npa: '', localite: '', typePrincipal: null, mapsUrl: null }
		];
		const { svgs } = buildListePagesSvg('C', 'd', r, '');
		expect(svgs[0]).toContain('A &amp; B &lt;SA&gt;');
		expect(svgs[0]).not.toContain('<SA>');
	});

	it('SVG parseable (namespace + dimensions paysage)', () => {
		const { svgs } = buildListePagesSvg('Test', 'd', rows(3), '');
		expect(svgs[0].startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
		expect(svgs[0]).toContain(`viewBox="0 0 841.89 595.28"`);
	});
});

describe('listeFileName (convention explicite, décision Pascal 02/07)', () => {
	const d = new Date(2026, 6, 2); // 02.07.2026
	it('nom de campagne verbatim (accents conservés) + date du jour', () => {
		expect(listeFileName('Salon Habitat 2026 - Genève', d)).toBe('Prospects - Salon Habitat 2026 - Genève - 02.07.2026.pdf');
	});
	it('caractères interdits par les systèmes de fichiers remplacés, fallback si vide', () => {
		expect(listeFileName('Vernis / Films : "test"', d)).toBe('Prospects - Vernis Films test - 02.07.2026.pdf');
		expect(listeFileName('///', d)).toBe('Prospects - Campagne - 02.07.2026.pdf');
	});
});

/**
 * Stress tests du module de dédup multi-axes de l'import de liste (Run 3 Atelier 209).
 * Exigence Pascal : mécanisme ROBUSTE, MULTI-AXES, STRESS-TESTÉ. 15 familles (spec §2).
 * Fonctions PURES → 0 DB, déterministe.
 */
import { describe, it, expect } from 'vitest';
import {
	normalizeLeadName,
	normalizeLocalityKey,
	normalizePhoneCH,
	normalizeEmail,
	normalizeDomain,
	syntheticSourceId,
	buildLeadDedupKeys,
	dedupCandidates,
	emptyDedupSets,
	addKeysToSets,
	type LeadDedupInput,
	type LeadDedupSets,
} from './import-dedup';

/** Construit des sets existants à partir de lignes « déjà en base ». */
function setsFrom(rows: LeadDedupInput[]): LeadDedupSets {
	const sets = emptyDedupSets();
	for (const r of rows) addKeysToSets(sets, buildLeadDedupKeys(r));
	return sets;
}
const lead = (r: Partial<LeadDedupInput> & { raison_sociale: string }): LeadDedupInput => r;

describe('normalizeLeadName', () => {
	// Famille 1 : accents
	it('est invariant aux accents', () => {
		expect(normalizeLeadName('Régie Naef')).toBe(normalizeLeadName('Regie Naef'));
		expect(normalizeLeadName('Zürich Vitrerie')).toBe(normalizeLeadName('Zurich Vitrerie'));
		expect(normalizeLeadName('Éclairage Élégance')).toBe('eclairageelegance');
	});
	// Famille 2 : casse
	it('est invariant à la casse', () => {
		expect(normalizeLeadName('MIROITERIE CORNAVIN')).toBe(normalizeLeadName('miroiterie cornavin'));
	});
	// Famille 3 : suffixes légaux
	it('retire les formes juridiques (SA, Sàrl, GmbH, & Cie...)', () => {
		const base = normalizeLeadName('Naef & Cie');
		expect(normalizeLeadName('Naef & Cie SA')).toBe(base);
		expect(normalizeLeadName('Naef & Cie Sàrl')).toBe(base);
		expect(normalizeLeadName('Naef & Cie GmbH')).toBe(base);
		expect(normalizeLeadName('Naef & Cie S.A.')).toBe(base);
		expect(normalizeLeadName('Naef & Cie SAGL')).toBe(base);
		expect(base).toBe('naef');
	});
	it('ne retire PAS les mots génériques (société, entreprise) = anti sur-fusion', () => {
		expect(normalizeLeadName('Entreprise Dupont')).not.toBe(normalizeLeadName('Dupont'));
		expect(normalizeLeadName('Société Meyer')).not.toBe(normalizeLeadName('Meyer'));
	});
	// Famille 4 : espaces / ponctuation
	it('est invariant aux espaces et à la ponctuation', () => {
		const base = normalizeLeadName('Naef & Cie');
		expect(normalizeLeadName('Naef  &  Cie')).toBe(base);
		expect(normalizeLeadName('Naef, Cie')).toBe(base);
		expect(normalizeLeadName('Naef&Cie')).toBe(base);
		expect(normalizeLeadName('  Naef   Cie  ')).toBe(base);
	});
	// Famille 15 (partiel) : nom dégénéré
	it('retourne "" pour un nom sans token utile (forme juridique seule / vide / ponctuation)', () => {
		expect(normalizeLeadName('SA')).toBe('');
		expect(normalizeLeadName('  ')).toBe('');
		expect(normalizeLeadName('&&& ---')).toBe('');
		expect(normalizeLeadName(null)).toBe('');
		expect(normalizeLeadName(undefined)).toBe('');
	});
	it('ne crash pas sur entrée dégénérée (unicode, très long)', () => {
		expect(() => normalizeLeadName('🏢 Émoji Studio 日本')).not.toThrow();
		expect(() => normalizeLeadName('a'.repeat(100000))).not.toThrow();
		expect(normalizeLeadName('日本')).toBe(''); // hors [a-z0-9] → vide
	});
});

describe('normalizePhoneCH', () => {
	// Famille 5 : formats de téléphone
	it('canonicalise tous les formats suisses vers le même national', () => {
		const canon = '228393939';
		expect(normalizePhoneCH('+41 22 839 39 39')).toBe(canon);
		expect(normalizePhoneCH('022 839 39 39')).toBe(canon);
		expect(normalizePhoneCH('0228393939')).toBe(canon);
		expect(normalizePhoneCH('0041 22 839 39 39')).toBe(canon);
		expect(normalizePhoneCH('+41 (0)22 839 39 39')).toBe(canon);
		expect(normalizePhoneCH('tel: 022/839.39.39')).toBe(canon);
	});
	it('gère les numéros de Lucerne (indicatif 041) sans les confondre avec l’indicatif pays', () => {
		expect(normalizePhoneCH('041 210 00 00')).toBe(normalizePhoneCH('+41 41 210 00 00'));
	});
	it('retourne null si trop court', () => {
		expect(normalizePhoneCH('12345')).toBeNull();
		expect(normalizePhoneCH('')).toBeNull();
		expect(normalizePhoneCH(null)).toBeNull();
		expect(normalizePhoneCH('None')).toBeNull();
	});
	it('numéro de service mutualisé (0800 / 084x) → null (pas une identité de dédup)', () => {
		expect(normalizePhoneCH('0848 800 800')).toBeNull();
		expect(normalizePhoneCH('0800 123 456')).toBeNull();
		expect(normalizePhoneCH('+41 848 00 00 00')).toBeNull();
		expect(normalizePhoneCH('022 839 39 39')).toBe('228393939'); // géographique inchangé
	});
});

describe('normalizeEmail', () => {
	// Famille 6 : e-mail
	it('canonicalise casse et espaces', () => {
		expect(normalizeEmail('Contact@Naef.CH')).toBe('contact@naef.ch');
		expect(normalizeEmail('  contact@naef.ch ')).toBe('contact@naef.ch');
	});
	it('prend le premier e-mail valide si plusieurs', () => {
		expect(normalizeEmail('info@naef.ch, contact@naef.ch')).toBe('info@naef.ch');
	});
	it('retourne null si invalide', () => {
		expect(normalizeEmail('None')).toBeNull();
		expect(normalizeEmail('pas-un-email')).toBeNull();
		expect(normalizeEmail('a@b')).toBeNull();
		expect(normalizeEmail('')).toBeNull();
	});
});

describe('normalizeDomain', () => {
	// Famille 7 : domaine
	it('canonicalise protocole, www, chemin, trailing slash', () => {
		expect(normalizeDomain('https://www.naef.ch/contact')).toBe('naef.ch');
		expect(normalizeDomain('naef.ch')).toBe('naef.ch');
		expect(normalizeDomain('http://naef.ch/')).toBe('naef.ch');
		expect(normalizeDomain('HTTPS://NAEF.CH/A/B?x=1#y')).toBe('naef.ch');
		expect(normalizeDomain('www.naef.ch:8080/x')).toBe('naef.ch');
	});
	it('retourne null si pas un domaine', () => {
		expect(normalizeDomain('None')).toBeNull();
		expect(normalizeDomain('')).toBeNull();
		expect(normalizeDomain('juste-du-texte')).toBeNull();
	});
	it('hôte de plateforme mutualisé → null (pas une identité de dédup)', () => {
		expect(normalizeDomain('https://facebook.com/studioalpha')).toBeNull();
		expect(normalizeDomain('instagram.com/boutiquebeta')).toBeNull();
		expect(normalizeDomain('https://sites.google.com/view/x')).toBeNull();
		expect(normalizeDomain('https://fr-fr.facebook.com/x')).toBeNull();
		expect(normalizeDomain('www.local.ch/fr/d/x')).toBeNull();
		expect(normalizeDomain('naef.ch')).toBe('naef.ch'); // vrai domaine inchangé
		expect(normalizeDomain('notfacebook.com')).toBe('notfacebook.com'); // pas de faux positif
	});
});

describe('normalizeLocalityKey', () => {
	it('normalise la localité, retombe sur le NPA si absente', () => {
		expect(normalizeLocalityKey('Genève')).toBe('geneve');
		expect(normalizeLocalityKey('  Zürich ')).toBe('zurich');
		expect(normalizeLocalityKey(null, '1204')).toBe('1204');
		expect(normalizeLocalityKey('', '1201')).toBe('1201');
		expect(normalizeLocalityKey(null, null)).toBe('');
	});
});

describe('syntheticSourceId', () => {
	it('est déterministe et préfixé', () => {
		expect(syntheticSourceId('naef', 'geneve')).toBe(syntheticSourceId('naef', 'geneve'));
		expect(syntheticSourceId('naef', 'geneve')).toMatch(/^manuel_[0-9a-f]{24}$/);
	});
	it('distingue des couples nom/localité différents', () => {
		expect(syntheticSourceId('naef', 'geneve')).not.toBe(syntheticSourceId('naef', 'lausanne'));
		expect(syntheticSourceId('naef', 'geneve')).not.toBe(syntheticSourceId('nael', 'geneve'));
	});
});

describe('dedupCandidates', () => {
	it('classe un import propre entièrement en toImport', () => {
		const rows = [
			lead({ raison_sociale: 'Miroiterie Cornavin', localite: 'Genève' }),
			lead({ raison_sociale: 'Neon Concept', localite: 'Carouge' }),
		];
		const r = dedupCandidates(rows, emptyDedupSets());
		expect(r.stats).toEqual({ total: 2, toImport: 2, duplicates: 0, invalid: 0 });
		expect(r.toImport[0].sourceId).toMatch(/^manuel_/);
	});

	// Famille 8 : homonyme cross-localité NON fusionné
	it('ne fusionne PAS deux homonymes de localités différentes', () => {
		const existing = setsFrom([lead({ raison_sociale: 'Boulangerie du Coin', localite: 'Genève' })]);
		const r = dedupCandidates([lead({ raison_sociale: 'Boulangerie du Coin', localite: 'Lausanne' })], existing);
		expect(r.stats.toImport).toBe(1);
		expect(r.stats.duplicates).toBe(0);
	});
	it('fusionne deux homonymes de MÊME localité (accents/casse/suffixe)', () => {
		const existing = setsFrom([lead({ raison_sociale: 'Régie Naef & Cie SA', localite: 'Genève' })]);
		const r = dedupCandidates([lead({ raison_sociale: 'regie naef', localite: 'geneve' })], existing);
		expect(r.stats.duplicates).toBe(1);
		expect(r.duplicates[0]).toMatchObject({ axis: 'name_locality', against: 'existing' });
	});

	// Famille 9 : match cross-axe (noms différents, même téléphone / email / domaine)
	it('détecte un doublon par TÉLÉPHONE même si le nom diffère', () => {
		const existing = setsFrom([lead({ raison_sociale: 'Ancien Nom', localite: 'Genève', telephone: '+41 22 839 39 39' })]);
		const r = dedupCandidates([lead({ raison_sociale: 'Nouveau Nom Rebranding', localite: 'Genève', telephone: '022 839 39 39' })], existing);
		expect(r.duplicates[0]).toMatchObject({ axis: 'phone', against: 'existing' });
	});
	it('détecte un doublon par E-MAIL puis par DOMAINE', () => {
		const byEmail = setsFrom([lead({ raison_sociale: 'X', localite: 'A', email: 'contact@naef.ch' })]);
		expect(dedupCandidates([lead({ raison_sociale: 'Y', localite: 'B', email: 'Contact@Naef.CH' })], byEmail).duplicates[0].axis).toBe('email');
		const byDomain = setsFrom([lead({ raison_sociale: 'X', localite: 'A', site_web: 'https://www.naef.ch' })]);
		expect(dedupCandidates([lead({ raison_sociale: 'Y', localite: 'B', site_web: 'naef.ch/contact' })], byDomain).duplicates[0].axis).toBe('domain');
	});

	// Famille 10 : champs manquants → pas de crash, dédup sur nom+localité seul
	it('gère les lignes sans téléphone/email/domaine', () => {
		const existing = setsFrom([lead({ raison_sociale: 'Studio Lumière', localite: 'Genève' })]);
		const r = dedupCandidates([
			lead({ raison_sociale: 'Studio Lumiere', localite: 'Genève' }),
			lead({ raison_sociale: 'Autre Studio', localite: 'Genève' }),
		], existing);
		expect(r.stats.duplicates).toBe(1);
		expect(r.stats.toImport).toBe(1);
	});

	// Famille 11 : cross-marque (les sets sont marque-scopés → un import LED vs un existant vide = aucun match)
	it('cross-marque : sets existants vides (marque LED) → tout est nouveau', () => {
		// fetchLeadDedupSets filtre par marque ; ici on simule des sets LED vides face à un homonyme FilmPro.
		const ledExisting = emptyDedupSets(); // aucune donnée LED
		const r = dedupCandidates([lead({ raison_sociale: 'Régie Naef', localite: 'Genève', telephone: '022 839 39 39' })], ledExisting);
		expect(r.stats.toImport).toBe(1);
		expect(r.stats.duplicates).toBe(0);
	});

	// Famille 12 : idempotence (ré-import du même fichier)
	it('ré-import du même fichier → 0 nouveau à la 2e passe', () => {
		const rows = [
			lead({ raison_sociale: 'Neon Concept Sàrl', localite: 'Carouge', telephone: '021 111 22 33' }),
			lead({ raison_sociale: 'Expo Stand Léman', localite: 'Renens', email: 'info@expostand.ch' }),
		];
		const pass1 = dedupCandidates(rows, emptyDedupSets());
		expect(pass1.stats.toImport).toBe(2);
		// Simule l'insertion : construire les sets existants depuis ce qui a été importé.
		const afterInsert = setsFrom(rows);
		const pass2 = dedupCandidates(rows, afterInsert);
		expect(pass2.stats.toImport).toBe(0);
		expect(pass2.stats.duplicates).toBe(2);
	});
	it('dédup intra-payload : la même entreprise deux fois dans le fichier → 1 seule importée', () => {
		const r = dedupCandidates([
			lead({ raison_sociale: 'Doublon SA', localite: 'Genève' }),
			lead({ raison_sociale: 'DOUBLON', localite: 'geneve' }),
		], emptyDedupSets());
		expect(r.stats.toImport).toBe(1);
		expect(r.duplicates[0]).toMatchObject({ axis: 'name_locality', against: 'inline' });
	});

	// Famille 13 : anti sur-fusion (entreprises réellement distinctes)
	it('ne fusionne PAS des entreprises distinctes (noms proches, aucun identifiant partagé)', () => {
		const r = dedupCandidates([
			lead({ raison_sociale: 'Café Central', localite: 'Genève', telephone: '022 111 11 11' }),
			lead({ raison_sociale: 'Café Central Lausanne', localite: 'Lausanne', telephone: '021 222 22 22' }),
			lead({ raison_sociale: 'Garage Meyer', localite: 'Genève', email: 'a@meyer.ch' }),
			lead({ raison_sociale: 'Garage Muller', localite: 'Genève', email: 'b@muller.ch' }),
		], emptyDedupSets());
		expect(r.stats.toImport).toBe(4);
		expect(r.stats.duplicates).toBe(0);
	});

	// Correctif stress : identifiants MUTUALISÉS (lien réseau social, numéro de service) ≠ identité
	it('2 sociétés distinctes partageant un lien réseau social ne fusionnent pas', () => {
		const r = dedupCandidates([
			lead({ raison_sociale: 'Studio Alpha', localite: 'Genève', site_web: 'https://facebook.com/studioalpha' }),
			lead({ raison_sociale: 'Boutique Beta', localite: 'Lausanne', site_web: 'https://facebook.com/boutiquebeta' }),
		], emptyDedupSets());
		expect(r.stats.toImport).toBe(2);
		expect(r.stats.duplicates).toBe(0);
	});
	it('succursales d’une enseigne partageant un numéro 0848 ne fusionnent pas', () => {
		const r = dedupCandidates([
			lead({ raison_sociale: 'Enseigne X', localite: 'Genève', telephone: '0848 800 800' }),
			lead({ raison_sociale: 'Enseigne X', localite: 'Lausanne', telephone: '0848 800 800' }),
			lead({ raison_sociale: 'Enseigne X', localite: 'Sion', telephone: '0848 800 800' }),
		], emptyDedupSets());
		expect(r.stats.toImport).toBe(3);
		expect(r.stats.duplicates).toBe(0);
	});

	// Famille 15 : ligne invalide
	it('classe les lignes sans nom utile en invalid (jamais importées)', () => {
		const r = dedupCandidates([
			lead({ raison_sociale: 'SA', localite: 'Genève' }),
			lead({ raison_sociale: '   ', localite: 'Genève' }),
			lead({ raison_sociale: 'Vrai Nom', localite: 'Genève' }),
		], emptyDedupSets());
		expect(r.stats.invalid).toBe(2);
		expect(r.stats.toImport).toBe(1);
		expect(r.invalid.every((i) => i.reason === 'empty_name')).toBe(true);
	});

	it('est déterministe (même entrée → même sortie)', () => {
		const rows = [
			lead({ raison_sociale: 'A', localite: 'X', telephone: '021 111 11 11' }),
			lead({ raison_sociale: 'B', localite: 'Y', email: 'b@b.ch' }),
		];
		expect(JSON.stringify(dedupCandidates(rows, emptyDedupSets())))
			.toBe(JSON.stringify(dedupCandidates(rows, emptyDedupSets())));
	});

	// Famille 14 : fuzzing (oracle = nombre de clés uniques)
	it('fuzzing : toute perturbation d’un nom de base collapse vers 1 ; N noms distincts → N', () => {
		// Générateur déterministe (pas de Math.random : reproductible en CI).
		const perturb = (name: string, seed: number): string => {
			const accents: Record<string, string> = { e: 'é', a: 'à', u: 'ü', o: 'ô' };
			let out = seed % 2 === 0 ? name.toUpperCase() : name.toLowerCase();
			if (seed % 3 === 0) out = out.split('').map((c) => accents[c.toLowerCase()] ?? c).join('');
			if (seed % 5 === 0) out = `  ${out.split('').join(' ')}  `;
			const suffixes = ['', ' SA', ' Sàrl', ' GmbH', ' & Cie', ' & Cie SA'];
			return out + suffixes[seed % suffixes.length];
		};

		// 1 nom de base, 40 perturbations → 1 seule clé.
		const variants = Array.from({ length: 40 }, (_, i) => normalizeLeadName(perturb('Miroiterie Cornavin', i)));
		expect(new Set(variants).size).toBe(1);

		// N noms distincts, chacun perturbé → N clés distinctes (aucune collision parasite).
		const bases = ['Miroiterie Cornavin', 'Neon Concept', 'Expo Stand Leman', 'Signaux Riviera', 'Pulse Event'];
		const keys = bases.map((b, i) => normalizeLeadName(perturb(b, i * 7 + 1)));
		expect(new Set(keys).size).toBe(bases.length);
	});
});

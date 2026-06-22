import { describe, it, expect } from 'vitest';
import { extractSearchResultUrls, recoverUrl } from './url-recover';

describe('extractSearchResultUrls', () => {
	it('extrait les URLs des blocs web_search_tool_result', () => {
		const raw = {
			content: [
				{ type: 'thinking' },
				{
					type: 'web_search_tool_result',
					content: [
						{ type: 'web_search_result', url: 'https://www.rts.ch/info/a.html' },
						{ type: 'web_search_result', url: 'https://www.3msuisse.ch/p/d/b011/' }
					]
				},
				{ type: 'tool_use', name: 'emit_report', input: {} }
			]
		};
		const urls = extractSearchResultUrls(raw);
		expect(urls).toContain('https://www.rts.ch/info/a.html');
		expect(urls).toContain('https://www.3msuisse.ch/p/d/b011/');
		expect(urls).toHaveLength(2);
	});

	it('déduplique et ignore les non-URLs', () => {
		const raw = {
			content: [
				{
					type: 'web_search_tool_result',
					content: [
						{ url: 'https://a.com/x' },
						{ url: 'https://a.com/x' },
						{ url: 'not-a-url' },
						{ nope: true }
					]
				}
			]
		};
		expect(extractSearchResultUrls(raw)).toEqual(['https://a.com/x']);
	});

	it('retourne [] sur formes inattendues (jamais throw)', () => {
		expect(extractSearchResultUrls(null)).toEqual([]);
		expect(extractSearchResultUrls({})).toEqual([]);
		expect(extractSearchResultUrls({ content: 'x' })).toEqual([]);
		expect(extractSearchResultUrls({ content: [{ type: 'text' }] })).toEqual([]);
	});
});

describe('recoverUrl', () => {
	const kontrastReal = 'https://www.kontrast-solutions.com/batiment/film-vitre/decret-tertiaire-film-solaire-conformite';
	const coolvuReal = 'https://www.coolvu.com/blog/home-security-window-film-stronger-glass-safer-home';

	it('récupère via citation : même host, suffixe parasite court (cas W25 Kontrast /ts)', () => {
		const failed = kontrastReal + '/ts';
		expect(recoverUrl(failed, [kontrastReal])).toBe(kontrastReal);
	});

	it('récupère via citation : cas W25 CoolVu /sd', () => {
		const failed = coolvuReal + '/sd';
		expect(recoverUrl(failed, [coolvuReal])).toBe(coolvuReal);
	});

	it('NE récupère PAS via une citation cross-domaine (host différent)', () => {
		// Garde cross-domaine : si la SEULE citation est sur un autre host, pas de récup
		// (on ne substitue jamais un domaine par un autre). Fallback désactivé car
		// knownUrls non-vide → null.
		const failed = 'https://www.3m.com/3M/en_US/p/d/b5005059013/j';
		const citationAutreHost = 'https://www.3msuisse.ch/3M/fr_CH/p/d/b5005059011/';
		expect(recoverUrl(failed, [citationAutreHost])).toBeNull();
	});

	it('récupère le 3M réel W25 via citation MÊME domaine (b5005059013 + /j parasite)', () => {
		// Donnée réelle W25 : le modèle a émis 3m.com/.../b5005059013/j ; la citation
		// 3m.com/.../b5005059013/ existe (même host, même id) → récupérée (le /j est parasite).
		const failed = 'https://www.3m.com/3M/en_US/p/d/b5005059013/j';
		const memeDomaine = 'https://www.3m.com/3M/en_US/p/d/b5005059013/';
		const autreHost = 'https://www.3msuisse.ch/3M/fr_CH/p/d/b5005059011/';
		expect(recoverUrl(failed, [autreHost, memeDomaine])).toBe(memeDomaine);
	});

	it('NE récupère PAS un chemin réellement différent (segment long, pas un parasite)', () => {
		const failed = 'https://a.com/article-x/autre-article-long';
		const citation = 'https://a.com/article-x';
		// "autre-article-long" n'est pas un suffixe parasite court → pas de récup citation.
		expect(recoverUrl(failed, [citation])).toBeNull();
	});

	it('fallback : retire le suffixe parasite de l URL du modèle si pas de citation', () => {
		const failed = kontrastReal + '/ts';
		const recovered = recoverUrl(failed, []);
		expect(recovered).toBe(kontrastReal);
	});

	it('fallback ne déclenche pas sur un segment final long (vrai article)', () => {
		const failed = 'https://www.rts.ch/info/article-canicule-29276438.html';
		expect(recoverUrl(failed, [])).toBeNull();
	});

	it("fallback n'ampute PAS un code langue ISO légitime (/fr, /de, /en)", () => {
		expect(recoverUrl('https://example.com/article/fr', [])).toBeNull();
		expect(recoverUrl('https://example.com/produit/de', [])).toBeNull();
		expect(recoverUrl('https://example.com/page/en', [])).toBeNull();
	});

	it('ne touche pas le host ni ne fabrique un domaine', () => {
		const failed = 'https://a.com/p/xy';
		const recovered = recoverUrl(failed, []);
		// xy = 2 chars → strippé → https://a.com/p ; host inchangé.
		expect(recovered).toBe('https://a.com/p');
	});

	it('retourne null sur URL non parseable', () => {
		expect(recoverUrl('pas une url', ['https://a.com/x'])).toBeNull();
	});

	it('préfère la citation (ground truth) au fallback', () => {
		// failed = real + /ab ; citation présente avec query distincte → citation gagne.
		const real = 'https://a.com/article';
		const citationWithQuery = 'https://a.com/article'; // même path
		const failed = real + '/ab';
		expect(recoverUrl(failed, [citationWithQuery])).toBe(citationWithQuery);
	});
});

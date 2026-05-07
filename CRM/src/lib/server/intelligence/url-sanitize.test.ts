import { describe, expect, it } from 'vitest';
import { sanitizeUrl, sanitizeUrlsBatch } from './url-sanitize';

describe('sanitizeUrl', () => {
	it('strippe le suffixe parasite \',6 (bug sérialiseur W18)', () => {
		const r = sanitizeUrl("https://swisspowershift.ch/article/',6");
		expect(r.cleaned).toBe('https://swisspowershift.ch/article/');
		expect(r.changed).toBe(true);
	});

	it('strippe les quotes simples ou doubles trailing', () => {
		expect(sanitizeUrl("https://example.com/'").cleaned).toBe('https://example.com/');
		expect(sanitizeUrl('https://example.com/"').cleaned).toBe('https://example.com/');
	});

	it('strippe une virgule trailing', () => {
		expect(sanitizeUrl('https://example.com/,').cleaned).toBe('https://example.com/');
	});

	it('strippe un point-virgule trailing', () => {
		expect(sanitizeUrl('https://example.com/;').cleaned).toBe('https://example.com/');
	});

	it('strippe les espaces trailing', () => {
		expect(sanitizeUrl('https://example.com/article   ').cleaned).toBe(
			'https://example.com/article'
		);
	});

	it('strippe les chaînes mixtes type ",6 (digit suffix)', () => {
		expect(sanitizeUrl('https://example.com/post",6').cleaned).toBe('https://example.com/post');
	});

	it('preserve les query strings normales', () => {
		const url = 'https://example.com/article?id=42&p=3';
		const r = sanitizeUrl(url);
		expect(r.cleaned).toBe(url);
		expect(r.changed).toBe(false);
	});

	it('preserve les hashs normaux', () => {
		const url = 'https://example.com/article#section-2';
		expect(sanitizeUrl(url).cleaned).toBe(url);
	});

	it('preserve un slug avec apostrophe encodée', () => {
		const url = "https://example.com/l'article-cool";
		expect(sanitizeUrl(url).cleaned).toBe(url);
	});

	it('preserve les URLs IDN/internationales', () => {
		const url = 'https://exämple.de/séjour';
		expect(sanitizeUrl(url).cleaned).toBe(url);
	});

	it("retourne chaîne vide pour une entrée non-string", () => {
		// @ts-expect-error : test du garde-fou runtime
		expect(sanitizeUrl(null).cleaned).toBe('');
		// @ts-expect-error : test du garde-fou runtime
		expect(sanitizeUrl(undefined).changed).toBe(false);
	});

	it('itère mais reste borné (zéro infinite loop)', () => {
		const r = sanitizeUrl("https://example.com/post';,6\";,7");
		expect(r.cleaned).toBe('https://example.com/post');
		expect(r.changed).toBe(true);
	});

	it('strippe les whitespace + quote chaînés', () => {
		expect(sanitizeUrl("https://example.com/  '  ").cleaned).toBe('https://example.com/');
	});

	it("ne touche pas le path interne (apostrophe au milieu)", () => {
		const url = "https://example.com/c'est-cool/page";
		expect(sanitizeUrl(url).cleaned).toBe(url);
		expect(sanitizeUrl(url).changed).toBe(false);
	});
});

describe('sanitizeUrlsBatch', () => {
	it('compte les URLs modifiées', () => {
		const items = [
			{ source: { url: "https://a.com/',6" } },
			{ source: { url: 'https://b.com/' } },
			{ source: { url: 'https://c.com/post",6' } }
		];
		const r = sanitizeUrlsBatch(items);
		expect(r.sanitizedCount).toBe(2);
		expect(r.items[0].source.url).toBe('https://a.com/');
		expect(r.items[1].source.url).toBe('https://b.com/');
		expect(r.items[2].source.url).toBe('https://c.com/post');
	});

	it("preserve les autres champs des items", () => {
		const items = [{ source: { url: "https://a.com/'", name: 'Test', other: 42 } }];
		const r = sanitizeUrlsBatch(items as Array<{ source: { url: string } }>);
		const s = r.items[0].source as unknown as { name: string; other: number };
		expect(s.name).toBe('Test');
		expect(s.other).toBe(42);
	});
});

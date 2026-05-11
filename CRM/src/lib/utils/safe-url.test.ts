import { describe, it, expect } from 'vitest';
import { safeHttpUrl } from './safe-url';

describe('safeHttpUrl - whitelist protocole http(s) (M-02)', () => {
	it('https absolu → conservé', () => {
		expect(safeHttpUrl('https://tel.search.ch/foo?bar=1')).toBe('https://tel.search.ch/foo?bar=1');
	});

	it('http absolu → conservé', () => {
		expect(safeHttpUrl('http://example.com/page')).toBe('http://example.com/page');
	});

	it('javascript: → null (XSS bloqué)', () => {
		expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
		expect(safeHttpUrl('JavaScript:alert(1)')).toBeNull();
	});

	it('data: → null', () => {
		expect(safeHttpUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
	});

	it('ftp: et vbscript: et file: → null', () => {
		expect(safeHttpUrl('ftp://example.com/x')).toBeNull();
		expect(safeHttpUrl('vbscript:msgbox(1)')).toBeNull();
		expect(safeHttpUrl('file:///etc/passwd')).toBeNull();
	});

	it('URL relative ou protocol-relative → null (pas absolu)', () => {
		expect(safeHttpUrl('/foo/bar')).toBeNull();
		expect(safeHttpUrl('//evil.com/x')).toBeNull();
		expect(safeHttpUrl('foo/bar')).toBeNull();
	});

	it('chaîne vide / espaces / null / undefined → null', () => {
		expect(safeHttpUrl('')).toBeNull();
		expect(safeHttpUrl('   ')).toBeNull();
		expect(safeHttpUrl(null)).toBeNull();
		expect(safeHttpUrl(undefined)).toBeNull();
	});

	it('valeur poubelle non parsable → null', () => {
		expect(safeHttpUrl('not a url at all')).toBeNull();
		expect(safeHttpUrl('http://')).toBeNull();
	});

	it('espaces autour d’une URL valide → trim puis conservé', () => {
		expect(safeHttpUrl('  https://example.com/x  ')).toBe('https://example.com/x');
	});
});

import { describe, expect, it } from 'vitest';
import { isBlockedHostname, isSafeUrlForFetch } from './url-guard';

describe('isBlockedHostname', () => {
	it('bloque localhost', () => {
		expect(isBlockedHostname('localhost')).toBe(true);
		expect(isBlockedHostname('LocalHost')).toBe(true);
	});

	it('bloque les IPs cloud metadata', () => {
		expect(isBlockedHostname('169.254.169.254')).toBe(true);
		expect(isBlockedHostname('metadata.google.internal')).toBe(true);
	});

	it('bloque IPv4 privées (RFC 1918)', () => {
		expect(isBlockedHostname('10.0.0.1')).toBe(true);
		expect(isBlockedHostname('192.168.1.1')).toBe(true);
		expect(isBlockedHostname('172.16.0.1')).toBe(true);
		expect(isBlockedHostname('172.31.255.254')).toBe(true);
	});

	it('bloque loopback IPv4', () => {
		expect(isBlockedHostname('127.0.0.1')).toBe(true);
		expect(isBlockedHostname('127.255.0.1')).toBe(true);
	});

	it('bloque IPv6 loopback et link-local', () => {
		expect(isBlockedHostname('::1')).toBe(true);
		expect(isBlockedHostname('[::1]')).toBe(true);
		expect(isBlockedHostname('fe80::abcd')).toBe(true);
		expect(isBlockedHostname('fc00::1')).toBe(true);
	});

	it('bloque suffixes internes (.local, .internal)', () => {
		expect(isBlockedHostname('intranet.local')).toBe(true);
		expect(isBlockedHostname('app.internal')).toBe(true);
	});

	it('autorise IPs publiques classiques', () => {
		expect(isBlockedHostname('8.8.8.8')).toBe(false);
		expect(isBlockedHostname('1.1.1.1')).toBe(false);
		expect(isBlockedHostname('203.0.113.1')).toBe(false);
	});

	it('autorise hostnames publics', () => {
		expect(isBlockedHostname('example.com')).toBe(false);
		expect(isBlockedHostname('www.24heures.ch')).toBe(false);
		expect(isBlockedHostname('mordorintelligence.com')).toBe(false);
	});

	it('bloque IPv4 hors RFC mais privées (CGNAT 100.64.0.0/10)', () => {
		expect(isBlockedHostname('100.64.0.1')).toBe(true);
		expect(isBlockedHostname('100.127.255.254')).toBe(true);
	});

	it('autorise les bordures publiques juste à côté des plages privées', () => {
		expect(isBlockedHostname('11.0.0.1')).toBe(false);
		expect(isBlockedHostname('100.63.255.255')).toBe(false);
		expect(isBlockedHostname('100.128.0.0')).toBe(false);
		expect(isBlockedHostname('192.167.255.255')).toBe(false);
	});
});

describe('isSafeUrlForFetch', () => {
	it('autorise une URL article publique', () => {
		expect(isSafeUrlForFetch('https://www.24heures.ch/article-123')).toBe(true);
	});

	it("refuse SSRF cloud metadata", () => {
		expect(isSafeUrlForFetch('http://169.254.169.254/latest/meta-data/')).toBe(false);
	});

	it('refuse loopback', () => {
		expect(isSafeUrlForFetch('http://127.0.0.1:8080/admin')).toBe(false);
		expect(isSafeUrlForFetch('http://localhost/private')).toBe(false);
	});

	it('refuse les schemes non-http(s)', () => {
		expect(isSafeUrlForFetch('file:///etc/passwd')).toBe(false);
		expect(isSafeUrlForFetch('javascript:alert(1)')).toBe(false);
		expect(isSafeUrlForFetch('data:text/html,<h1>x</h1>')).toBe(false);
	});

	it('refuse URL malformée', () => {
		expect(isSafeUrlForFetch('not a url')).toBe(false);
		expect(isSafeUrlForFetch('')).toBe(false);
	});
});

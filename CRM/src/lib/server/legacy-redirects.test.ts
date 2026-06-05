import { describe, it, expect } from 'vitest';
import { legacyHostRedirect } from './legacy-redirects';

describe('legacyHostRedirect', () => {
	it('redirige les anciens hosts vers le portail (308)', () => {
		expect(legacyHostRedirect('filmpro-crm.vercel.app', '/crm/contacts', '')).toBe(
			'https://filmpro-portail.vercel.app/crm/contacts'
		);
		expect(legacyHostRedirect('template-rho-three.vercel.app', '/crm/pipeline', '')).toBe(
			'https://filmpro-portail.vercel.app/crm/pipeline'
		);
	});

	it('exempte `/api/*` (crons Vercel + endpoints internes jamais rediriges)', () => {
		expect(legacyHostRedirect('filmpro-crm.vercel.app', '/api/cron/veille', '')).toBeNull();
		expect(
			legacyHostRedirect('template-rho-three.vercel.app', '/api/intelligence/recheck-historical', '')
		).toBeNull();
	});

	it('ne touche pas le host cible ni un host inconnu', () => {
		expect(legacyHostRedirect('filmpro-portail.vercel.app', '/crm/contacts', '')).toBeNull();
		expect(legacyHostRedirect('localhost:5173', '/crm/contacts', '')).toBeNull();
		expect(legacyHostRedirect('evil.example.com', '/crm/contacts', '')).toBeNull();
	});

	it('preserve le path et la query string dans la cible', () => {
		expect(
			legacyHostRedirect('filmpro-crm.vercel.app', '/crm/prospection', '?canton=GE&tab=chaud')
		).toBe('https://filmpro-portail.vercel.app/crm/prospection?canton=GE&tab=chaud');
		// Racine (home portail) sans query : conservee telle quelle.
		expect(legacyHostRedirect('filmpro-crm.vercel.app', '/', '')).toBe(
			'https://filmpro-portail.vercel.app/'
		);
	});
});

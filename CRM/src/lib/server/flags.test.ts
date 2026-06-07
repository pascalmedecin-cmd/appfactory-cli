import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Flags produit V5 (recentrage Signaux & Prospection sur l'affaire métier, 2026-06-07).
 *
 * `isSignauxZefixEnabled` : interrupteur GLOBAL (pas par utilisateur) de l'ingestion
 * Zefix dans le cron signaux. Lu depuis une variable d'environnement plutôt qu'un flag
 * JWT (le cron n'a pas d'utilisateur) — réactivable sans redéploiement de code (spec V5
 * critère « Le flag réactive l'ingestion Zefix sans redéploiement de code »).
 * Par défaut OFF : le radar Signaux est désormais centré SIMAP.
 */

const { mockEnv } = vi.hoisted(() => ({
	mockEnv: {} as Record<string, string | undefined>,
}));
vi.mock('$env/dynamic/private', () => ({ env: mockEnv }));

import { isSignauxZefixEnabled } from './flags';

describe('isSignauxZefixEnabled', () => {
	beforeEach(() => {
		for (const k of Object.keys(mockEnv)) delete mockEnv[k];
	});

	it('false par défaut quand la variable est absente (radar centré SIMAP)', () => {
		expect(isSignauxZefixEnabled()).toBe(false);
	});

	it('true uniquement quand SIGNAUX_ZEFIX_ENABLED vaut exactement "true"', () => {
		mockEnv.SIGNAUX_ZEFIX_ENABLED = 'true';
		expect(isSignauxZefixEnabled()).toBe(true);
	});

	it('false pour toute autre valeur (strict, pas de "1"/"yes"/"TRUE")', () => {
		for (const v of ['1', 'yes', 'TRUE', 'on', '', 'false']) {
			mockEnv.SIGNAUX_ZEFIX_ENABLED = v;
			expect(isSignauxZefixEnabled()).toBe(false);
		}
	});
});

import { defineConfig, devices } from '@playwright/test';

/**
 * Config e2e dédiée au flux de VALIDATION EXTERNE, contre la base jetable LOCALE (Colima).
 *
 * - baseURL localhost:5173 = dev server SvelteKit, qui charge `.env.development.local` (base
 *   127.0.0.1:54321) : ce fichier gagne sur `.env.local` (prod) en mode développement (priorité
 *   Vite `.env.[mode].local`). Aucun storageState global : le spec crée lui-même deux contextes
 *   (fondateur authentifié via `tests/.auth.local.json` + public anonyme).
 * - Pré-requis exécutés à la main avant : `supabase db reset` puis `node tests/mint-session-local.mjs`.
 */
export default defineConfig({
	testDir: 'tests',
	testMatch: '**/validation-externe.spec.ts',
	timeout: 90_000,
	fullyParallel: false,
	// 1 retry : le tout premier hit d'une route sous `vite dev` la compile à la volée (page campagne
	// + endpoints /api) ; la 2e tentative tourne à chaud. Le test MUTE le seed (applique un retrait),
	// il n'est donc PAS idempotent -> relancer `supabase db reset` avant chaque exécution (méthodo Colima).
	retries: 1,
	reporter: [['list']],
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'retain-on-failure',
	},
	webServer: {
		command: 'npm run dev',
		port: 5173,
		reuseExistingServer: true,
		timeout: 120_000,
	},
	projects: [
		{
			name: 'desktop',
			use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
		},
	],
});

import { defineConfig } from '@playwright/test';

// Gate a11y + responsive du Centre d'aide (refonte 2026-06-30). Session authentifiée
// injectée via storageState (tests/.auth.local.json), mintée OTP-free par
// tests/mint-session.mjs (service_role, aucun email → ne consomme pas le quota OTP).
export default defineConfig({
	testDir: 'tests',
	testMatch: 'aide-a11y.test.ts',
	timeout: 45_000,
	workers: 2,
	use: {
		baseURL: 'http://localhost:5173',
		storageState: 'tests/.auth.local.json'
	},
	webServer: {
		command: 'npm run dev',
		port: 5173,
		reuseExistingServer: true
	}
});

import { defineConfig } from '@playwright/test';

// Gate a11y Vague 2 (audit live 2026-06-07). Session authentifiée injectée via
// storageState (tests/.auth.local.json) mintée OTP-free par tests/mint-session.mjs
// (service_role, aucun email → ne consomme pas le quota OTP Supabase).
export default defineConfig({
	testDir: 'tests',
	testMatch: 'vague2-a11y.test.ts',
	timeout: 45_000,
	workers: 3,
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

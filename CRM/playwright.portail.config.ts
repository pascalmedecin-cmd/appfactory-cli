import { defineConfig } from '@playwright/test';

// Config QA 360 portail (Session 2). Session authentifiée injectée via storageState
// (tests/.auth.local.json) mintée OTP-free par tests/mint-session.mjs (service_role,
// aucun email envoyé → ne consomme pas le quota OTP Supabase).
export default defineConfig({
	testDir: 'tests',
	testMatch: 'portail.test.ts',
	timeout: 30_000,
	// Dev server unique : limiter la concurrence évite les faux négatifs de contention.
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

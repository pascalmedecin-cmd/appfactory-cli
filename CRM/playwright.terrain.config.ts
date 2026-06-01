import { defineConfig } from '@playwright/test';

// axe-core a11y sur le shell mobile V3 /terrain. Session authentifiée (flag ON)
// via storageState mintée OTP-free par tests/mint-session.mjs.
export default defineConfig({
	testDir: 'tests',
	testMatch: 'terrain-a11y.test.ts',
	timeout: 30_000,
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

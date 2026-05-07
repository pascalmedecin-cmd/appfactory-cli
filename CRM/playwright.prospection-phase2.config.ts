import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'https://filmpro-crm.vercel.app';

export default defineConfig({
	testDir: 'tests',
	testMatch: '**/prospection-phase2.spec.ts',
	timeout: 30_000,
	fullyParallel: false,
	retries: 0,
	reporter: [['list']],
	use: {
		baseURL: BASE_URL,
		storageState: 'tests/.auth.json',
		trace: 'retain-on-failure',
	},
	projects: [
		{
			name: 'desktop',
			use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
		},
		{
			name: 'iphone-14-pro-max',
			use: { ...devices['iPhone 14 Pro Max'] },
		},
	],
});

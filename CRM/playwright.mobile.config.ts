import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.MOBILE_BASE_URL ?? 'https://filmpro-crm.vercel.app';

export default defineConfig({
	testDir: 'tests',
	testMatch: '**/mobile.spec.ts',
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
			name: 'iphone-14-pro-max',
			use: { ...devices['iPhone 14 Pro Max'] },
		},
	],
});

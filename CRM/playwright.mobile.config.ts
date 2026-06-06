import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.MOBILE_BASE_URL ?? 'https://filmpro-portail.vercel.app';

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
	// Audit 360 M-56 : couverture multi-viewports — petit (iPhone SE 375×667),
	// Android moyen (Pixel 7 412×915), grand iOS (iPhone 14 Pro Max 430×932).
	// Filtrer un projet : `npm run test:mobile -- --project=pixel-7`.
	projects: [
		{
			name: 'iphone-se',
			use: { ...devices['iPhone SE'] },
		},
		{
			name: 'pixel-7',
			use: { ...devices['Pixel 7'] },
		},
		{
			name: 'iphone-14-pro-max',
			use: { ...devices['iPhone 14 Pro Max'] },
		},
	],
});

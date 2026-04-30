import { defineConfig } from '@playwright/test';

const BASE_URL = process.env.VEILLE_BASE_URL ?? 'https://filmpro-crm.vercel.app';

export default defineConfig({
	testDir: 'tests',
	testMatch: '**/refonte-veille-screenshots.spec.ts',
	timeout: 60_000,
	fullyParallel: false,
	retries: 0,
	reporter: [['list']],
	use: {
		baseURL: BASE_URL,
		storageState: 'tests/.auth.json',
		trace: 'retain-on-failure',
	},
});

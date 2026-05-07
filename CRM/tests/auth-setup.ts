import { chromium, devices } from '@playwright/test';
import { existsSync } from 'fs';

(async () => {
	const browser = await chromium.launch({ headless: false });
	const context = await browser.newContext({ ...devices['iPhone 14 Pro Max'] });
	const page = await context.newPage();
	await page.goto('https://filmpro-crm.vercel.app/login');
	console.log('\n>>> Connecte-toi (email + OTP). Une fois sur le Dashboard, reviens dans ce terminal et appuie sur Entrée.\n');
	await new Promise<void>((resolve) => {
		process.stdin.once('data', () => resolve());
	});
	await context.storageState({ path: 'tests/.auth.json' });
	console.log('\n✅ Session sauvegardée dans tests/.auth.json');
	await browser.close();
	process.exit(0);
})();

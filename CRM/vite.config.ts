import { sentrySvelteKit } from "@sentry/sveltekit";
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sentrySvelteKit({
        org: "pascal-medecin",
        project: "crm-filmpro"
    }), tailwindcss(), sveltekit()],
	test: {
		include: ['src/**/*.test.ts'],
		// Audit 360 V3b I-12 : `npm run coverage` → rapport texte + HTML local (coverage/index.html).
		// Périmètre : la couche logique testable unitairement (`.ts`). Les `.svelte` (pages,
		// composants) sont couverts par les tests Playwright e2e, pas par Vitest (pas de jsdom configuré).
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/**/*.ts'],
			exclude: [
				'src/**/*.test.ts',
				'src/**/*.d.ts',
				'src/**/$types.d.ts',
				'src/app.html',
				'.svelte-kit/**',
			],
		},
	}
});

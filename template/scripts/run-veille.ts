#!/usr/bin/env node
/**
 * Standalone runner pour le pipeline veille hebdomadaire FilmPro.
 *
 * Conçu pour tourner hors SvelteKit, dans n'importe quel environnement Node/tsx
 * (typiquement : un job GitHub Actions cron sans plafond de durée). Cap Vercel
 * Hobby 300 s prouvé S166 par HTTP 504 FUNCTION_INVOCATION_TIMEOUT à 301.4 s
 * → externalisation indispensable.
 *
 * Lancement :
 *   pnpm tsx template/scripts/run-veille.ts
 *
 * ENV vars requises (plante explicitement si manquantes) :
 *   PUBLIC_SUPABASE_URL ou SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ANTHROPIC_API_KEY
 *
 * ENV vars optionnelles :
 *   EMAIL_RECAP_ENABLED (default false)
 *   RESEND_API_KEY (requis si EMAIL_RECAP_ENABLED=true)
 *   EMAIL_RECAP_TO / EMAIL_RECAP_FROM
 *   VEILLE_ANTI_DOUBLONS_FROM (weekLabel YYYY-Www, default toujours actif)
 *   VEILLE_WINDOW_DAYS (default 30)
 *
 * Exit code :
 *   0  succès (édition publiée OU idempotent_skip si déjà publiée)
 *   1  échec attendu (status=error en DB, email d'alerte envoyé)
 *   2  erreur non capturée (env manquante, exception non gérée par runWeeklyGeneration)
 */
import { runWeeklyGeneration } from '../src/lib/server/intelligence/run-generation';
import { buildVeilleDepsFromEnvObject } from '../src/lib/server/intelligence/deps';

async function main(): Promise<number> {
	let deps;
	try {
		deps = buildVeilleDepsFromEnvObject(process.env);
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		console.error(`[run-veille] env invalide: ${msg}`);
		return 2;
	}

	console.log('[run-veille] démarrage pipeline veille hebdomadaire');
	const startedAt = Date.now();

	try {
		const result = await runWeeklyGeneration(new Date(), deps);
		const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

		if (result.ok) {
			if (result.skipped) {
				console.log(
					`[run-veille] idempotent_skip ${result.weekLabel} (déjà publiée, reportId=${result.reportId}) en ${elapsed}s`
				);
			} else {
				console.log(
					`[run-veille] succès ${result.weekLabel} reportId=${result.reportId} en ${elapsed}s`
				);
			}
			return 0;
		}

		console.error(
			`[run-veille] échec ${result.weekLabel} en ${elapsed}s: ${result.error ?? 'inconnu'}`
		);
		return 1;
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
		console.error(`[run-veille] exception non capturée après ${elapsed}s: ${msg}`);
		return 2;
	}
}

main().then(
	(code) => process.exit(code),
	(e) => {
		// Filet de sécurité ultime : main() n'est pas censé throw (try/catch global),
		// mais si jamais une promesse non awaitée échappe, on capture ici.
		console.error('[run-veille] panic non géré:', e);
		process.exit(2);
	}
);

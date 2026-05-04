#!/usr/bin/env node
/**
 * Standalone runner pour le pipeline veille hebdomadaire FilmPro.
 *
 * Conçu pour tourner hors SvelteKit, dans n'importe quel environnement Node/tsx
 * (typiquement : un job GitHub Actions cron sans plafond de durée). Cap Vercel
 * Hobby 300 s prouvé S166 par HTTP 504 FUNCTION_INVOCATION_TIMEOUT à 301.4 s
 * → externalisation indispensable.
 *
 * Lancement (semaine en cours) :
 *   npx tsx template/scripts/run-veille.ts
 *
 * Lancement avec semaine forcée (rattrapage manuel) :
 *   npx tsx template/scripts/run-veille.ts --week 2026-W18
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
 *   2  erreur non capturée (env manquante, argv invalide, exception non gérée)
 */
import { runWeeklyGeneration } from '../src/lib/server/intelligence/run-generation';
import { buildVeilleDepsFromEnvObject } from '../src/lib/server/intelligence/deps';
import { weekLabelToDate } from '../src/lib/server/intelligence/week-utils';
import { parseArgv, HelpRequestedError } from '../src/lib/server/intelligence/cli-args';
import { sanitizeError, sanitizeForLog } from '../src/lib/server/intelligence/sanitize';

const HELP = `
Usage: npx tsx template/scripts/run-veille.ts [--week YYYY-Www]

Options:
  --week YYYY-Www   Force la semaine cible (rattrapage manuel).
                    Exemple : --week 2026-W18
                    Sans ce flag : utilise la semaine ISO de la date système.
  --help, -h        Affiche cette aide.

Exit code : 0 succès, 1 échec attendu, 2 erreur non capturée.
`.trim();

async function main(): Promise<number> {
	let opts;
	try {
		opts = parseArgv(process.argv.slice(2));
	} catch (e) {
		if (e instanceof HelpRequestedError) {
			console.log(HELP);
			return 0;
		}
		// Sanitize obligatoire : repo public S167 = logs GHA publics, toute
		// erreur stdout doit passer par les regex redact (sk-ant, Bearer, JWT,
		// re_, génériques api_key/token/secret).
		console.error(`[run-veille] argv invalide: ${sanitizeError(e)}`);
		console.error(HELP);
		return 2;
	}

	let deps;
	try {
		deps = buildVeilleDepsFromEnvObject(process.env);
	} catch (e) {
		console.error(`[run-veille] env invalide: ${sanitizeError(e)}`);
		return 2;
	}

	let now: Date;
	try {
		now = opts.weekLabel ? weekLabelToDate(opts.weekLabel) : new Date();
	} catch (e) {
		console.error(`[run-veille] weekLabel invalide: ${sanitizeError(e)}`);
		return 2;
	}

	const mode = opts.weekLabel ? `rattrapage ${opts.weekLabel}` : 'semaine en cours';
	console.log(`[run-veille] démarrage pipeline veille (${mode})`);
	const startedAt = Date.now();

	try {
		const result = await runWeeklyGeneration(now, deps);
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
			`[run-veille] échec ${result.weekLabel} en ${elapsed}s: ${sanitizeForLog(result.error ?? 'inconnu')}`
		);
		return 1;
	} catch (e) {
		const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
		console.error(
			`[run-veille] exception non capturée après ${elapsed}s: ${sanitizeError(e)}`
		);
		return 2;
	}
}

main().then(
	(code) => process.exit(code),
	(e) => {
		// Filet de sécurité ultime : main() n'est pas censé throw (try/catch global),
		// mais si jamais une promesse non awaitée échappe, on capture ici.
		// Sanitize obligatoire : repo public, logs GHA publics.
		console.error(`[run-veille] panic non géré: ${sanitizeError(e)}`);
		process.exit(2);
	}
);

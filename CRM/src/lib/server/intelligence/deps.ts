/**
 * Dépendances injectables pour `runWeeklyGeneration`.
 *
 * Avant S167 le pipeline veille importait `$env/dynamic/private` et
 * `createSupabaseServiceClient` directement, ce qui le rendait inexécutable
 * hors SvelteKit. Cap Vercel Hobby 300 s prouvé S166 (HTTP 504 à 301.4 s lors
 * du rerun manuel) : seule solution structurelle = sortir le run d'un handler
 * HTTP et le faire tourner dans un job GitHub Actions cron sans plafond de
 * durée. Pour ça, le pipeline doit accepter ses dépendances en paramètre.
 *
 * Deux factories selon le contexte :
 *  - `buildVeilleDepsFromEnvObject(env)` : pure, prend un Record<string,string?>.
 *    Utilisée à la fois par le cron SvelteKit (avec `$env/dynamic/private`) et
 *    par `scripts/run-veille.ts` (avec `process.env`). Toute validation des
 *    ENV vars vit ici, source unique.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../database.types';

export interface EmailRecapConfig {
	/** Gate global. Default false. */
	enabled: boolean;
	/** Resend API key. Si manquante alors que enabled=true, sendRecapEmail skip. */
	apiKey?: string;
	to: string;
	from: string;
}

export interface VeilleDeps {
	supabase: SupabaseClient<Database>;
	anthropicApiKey: string;
	email: EmailRecapConfig;
	/** Seuil weekLabel à partir duquel l'anti-doublons s'active. Si undefined, toujours actif. */
	antiDoublonsFrom?: string;
	/** Tolérance fenêtre vérification (jours). Default 30. */
	windowDays: number;
}

const DEFAULT_TO = 'pascal@filmpro.ch';
const DEFAULT_FROM = 'FilmPro Veille <noreply@filmpro.ch>';
const DEFAULT_WINDOW_DAYS = 30;

/**
 * Sous-ensemble des ENV vars pertinentes pour la veille. Strict pour qu'un
 * appelant qui passe `process.env` typé `NodeJS.ProcessEnv` reste compatible
 * (toutes les clés sont `string | undefined`).
 */
export type VeilleEnv = Partial<Record<
	| 'SUPABASE_URL'
	| 'PUBLIC_SUPABASE_URL'
	| 'SUPABASE_SERVICE_ROLE_KEY'
	| 'ANTHROPIC_API_KEY'
	| 'EMAIL_RECAP_ENABLED'
	| 'RESEND_API_KEY'
	| 'EMAIL_RECAP_TO'
	| 'EMAIL_RECAP_FROM'
	| 'VEILLE_ANTI_DOUBLONS_FROM'
	| 'VEILLE_WINDOW_DAYS',
	string
>>;

/**
 * Construit les deps depuis un objet env brut. Plante explicitement si une
 * variable critique manque (ANTHROPIC, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
 *
 * RESEND_API_KEY peut manquer : email-recap skip propre via `enabled`/`apiKey`.
 *
 * Note SUPABASE_URL : on tolère `PUBLIC_SUPABASE_URL` (env Vercel SvelteKit)
 * ET `SUPABASE_URL` (convention GitHub Actions / scripts standalone).
 */
export function buildVeilleDepsFromEnvObject(env: VeilleEnv): VeilleDeps {
	const url = env.PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
	if (!url) {
		throw new Error(
			'PUBLIC_SUPABASE_URL ou SUPABASE_URL manquant (l\'un des deux est requis)'
		);
	}
	const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!serviceKey) {
		throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant');
	}
	const anthropicApiKey = env.ANTHROPIC_API_KEY;
	if (!anthropicApiKey) {
		throw new Error('ANTHROPIC_API_KEY manquant');
	}

	const days = parseInt(env.VEILLE_WINDOW_DAYS ?? '', 10);
	const windowDays = Number.isFinite(days) && days > 0 ? days : DEFAULT_WINDOW_DAYS;

	const supabase = createClient<Database>(url, serviceKey);

	return {
		supabase,
		anthropicApiKey,
		email: {
			enabled: (env.EMAIL_RECAP_ENABLED ?? '').toLowerCase() === 'true',
			apiKey: env.RESEND_API_KEY,
			to: env.EMAIL_RECAP_TO || DEFAULT_TO,
			from: env.EMAIL_RECAP_FROM || DEFAULT_FROM
		},
		antiDoublonsFrom: env.VEILLE_ANTI_DOUBLONS_FROM,
		windowDays
	};
}

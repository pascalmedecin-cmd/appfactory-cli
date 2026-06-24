/**
 * sources-loader : charge les sources de veille depuis la table `veille_sources`
 * (filtrées `active=true`, ordonnées par `sort_order`) et construit un CLASSIFIEUR
 * (`SourcesBundle`) qui reproduit exactement les fonctions de `source-allowlist.ts`,
 * mais à partir des données EN BASE au lieu des Sets en dur.
 *
 * Pourquoi : la whitelist 7 tiers + denylist + régimes était hardcodée dans
 * `source-allowlist.ts`. Pour permettre à Pascal d'éditer les sources via UI sans
 * redeploy (chantier « sources éditables »), on externalise la DONNÉE par domaine
 * (tier + flags atomiques) en DB. La POLITIQUE de régime reste en code
 * (`regimeFromClassification`, règle métier stable) et est partagée avec
 * `domainRegime` → table et code produisent le même verdict (équivalence prouvée
 * par `sources-loader.test.ts`).
 *
 * ÉTAPE 2 du chantier : ce module existe et est testé, mais le moteur ne le
 * consomme PAS encore (les 3 call sites lisent toujours `source-allowlist.ts`).
 * L'étape 3 branchera `run-generation.ts` + generate/cross-check.
 *
 * Filet de secours : si la table est vide, inaccessible, ou en erreur, on retombe
 * sur `SOURCES_SEED` (photo exacte du code, générée déterministiquement) pour que
 * le cron veille hebdo ne rate JAMAIS un run à cause d'une erreur DB côté sources.
 * Même contrat de résilience que `theme-loader.ts`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../database.types';
import {
	isSourceTier,
	matchesDenylistHostnamePattern,
	normalizeHostname,
	regimeFromClassification,
	type SourceTier,
	type VerificationRegime
} from './source-allowlist';
import { SOURCES_SEED } from './sources-seed';
import type { VeilleSource } from './sources-repository';

/**
 * Classification atomique d'un domaine, indépendante de sa provenance (table ou
 * seed). Ne porte QUE ce dont le moteur a besoin pour reproduire source-allowlist
 * (les métadonnées d'affichage name/description/is_benchmark/is_new restent dans
 * la row complète, pas ici).
 */
export interface SourceClassification {
	hostname: string;
	tier: SourceTier | null;
	in_denylist: boolean;
	strict_verbatim: boolean;
	is_advocacy: boolean;
	is_preprint: boolean;
}

/**
 * Classifieur de sources : jumeau « table » de `source-allowlist.ts`. Chaque
 * accesseur reproduit la fonction de même rôle, mais lit `byDomain` (rempli depuis
 * la DB ou le seed) au lieu des Sets en dur. Les entrées sont normalisées avant
 * lookup (minuscules, sans `www.`), comme dans le code d'origine.
 */
export interface SourcesBundle {
	/** Domaines connus (clé = hostname normalisé). Domaine absent = inconnu → strict. */
	byDomain: Map<string, SourceClassification>;
	/** Provenance des données : `db` (table lue) ou `fallback` (seed). */
	source: 'db' | 'fallback';
	/** = isDeniedSource : flag DB `in_denylist` OU pattern anti-spam en code. */
	isDenied(hostname: string): boolean;
	/** = getDomainTier : tier du domaine, ou null si inconnu. */
	tierOf(hostname: string): SourceTier | null;
	/** = requiresStrictVerbatim. */
	requiresStrictVerbatim(hostname: string): boolean;
	/** = isPreprintSource. */
	isPreprint(hostname: string): boolean;
	/** = isAdvocacySource. */
	isAdvocacy(hostname: string): boolean;
	/** = domainRegime (via la politique partagée `regimeFromClassification`). */
	regimeOf(hostname: string): VerificationRegime;
}

/**
 * Forme minimale commune à `VeilleSource` (row DB) et `SourceSeedRow` (seed) :
 * les deux portent ces champs. Ancré sur `VeilleSource` (via `Pick`) plutôt que
 * redéclaré, pour que TypeScript signale au build tout renommage/retrait d'une de
 * ces colonnes dans la Row DB (`SourceSeedRow` reste assignable à ce Pick).
 */
type ClassifiableRow = Pick<
	VeilleSource,
	'hostname' | 'tier' | 'in_denylist' | 'strict_verbatim' | 'is_advocacy' | 'is_preprint'
>;

function toClassification(r: ClassifiableRow): SourceClassification {
	// La colonne `tier` est un `text` éditable côté DB : on VALIDE plutôt que de
	// caster. Un tier non reconnu → null → régime 'strict' (fail-safe anti-hallu),
	// jamais une montée silencieuse en confiance. Défense en profondeur : la politique
	// `regimeFromClassification` retombe elle aussi en strict pour un tier inconnu.
	const tier: SourceTier | null = isSourceTier(r.tier) ? r.tier : null;
	if (r.tier !== null && tier === null) {
		console.warn('[sources-loader] tier invalide ignoré (fallback strict):', r.hostname, r.tier);
	}
	return {
		hostname: normalizeHostname(r.hostname),
		tier,
		in_denylist: r.in_denylist,
		strict_verbatim: r.strict_verbatim,
		is_advocacy: r.is_advocacy,
		is_preprint: r.is_preprint
	};
}

/**
 * Construit un classifieur à partir d'une liste de classifications. La dernière
 * occurrence d'un hostname gagne (cohérent avec la clé unique `hostname` en DB).
 */
export function buildSourcesBundle(
	classifications: SourceClassification[],
	source: 'db' | 'fallback'
): SourcesBundle {
	const byDomain = new Map<string, SourceClassification>();
	for (const c of classifications) byDomain.set(normalizeHostname(c.hostname), c);

	const lookup = (hostname: string): SourceClassification | undefined =>
		byDomain.get(normalizeHostname(hostname));

	const isDenied = (hostname: string): boolean => {
		const normalized = normalizeHostname(hostname);
		return (byDomain.get(normalized)?.in_denylist ?? false) || matchesDenylistHostnamePattern(normalized);
	};

	const tierOf = (hostname: string): SourceTier | null => lookup(hostname)?.tier ?? null;
	const requiresStrictVerbatim = (hostname: string): boolean =>
		lookup(hostname)?.strict_verbatim ?? false;
	const isPreprint = (hostname: string): boolean => lookup(hostname)?.is_preprint ?? false;
	const isAdvocacy = (hostname: string): boolean => lookup(hostname)?.is_advocacy ?? false;

	const regimeOf = (hostname: string): VerificationRegime => {
		const normalized = normalizeHostname(hostname);
		const c = byDomain.get(normalized);
		return regimeFromClassification({
			// Denylist : flag DB OU pattern anti-spam (en code) → même règle qu'isDeniedSource.
			denied: (c?.in_denylist ?? false) || matchesDenylistHostnamePattern(normalized),
			strictVerbatim: c?.strict_verbatim ?? false,
			preprint: c?.is_preprint ?? false,
			tier: c?.tier ?? null,
			advocacy: c?.is_advocacy ?? false
		});
	};

	return {
		byDomain,
		source,
		isDenied,
		tierOf,
		requiresStrictVerbatim,
		isPreprint,
		isAdvocacy,
		regimeOf
	};
}

/**
 * Bundle construit sur le filet `SOURCES_SEED` (photo exacte du code). Utilisé
 * quand la DB est indisponible, ou par les tests / scénarios dégradés.
 */
export function getFallbackSourcesBundle(): SourcesBundle {
	return buildSourcesBundle(SOURCES_SEED.map(toClassification), 'fallback');
}

/**
 * Charge les sources actives depuis Supabase et construit le classifieur. Retombe
 * sur le filet hardcodé si la table est vide, inaccessible, ou en erreur — le cron
 * veille ne doit JAMAIS rater un run à cause d'une erreur DB côté sources.
 */
export async function loadSourcesBundle(client: SupabaseClient<Database>): Promise<SourcesBundle> {
	try {
		const { data, error } = await client
			.from('veille_sources')
			.select('*')
			.eq('active', true)
			.order('sort_order', { ascending: true });
		if (error) {
			console.warn('[sources-loader] DB error, fallback hardcoded:', error.message);
			return getFallbackSourcesBundle();
		}
		if (!data || data.length === 0) {
			console.warn('[sources-loader] DB vide, fallback hardcoded');
			return getFallbackSourcesBundle();
		}
		return buildSourcesBundle((data as VeilleSource[]).map(toClassification), 'db');
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'unknown';
		console.warn('[sources-loader] exception, fallback hardcoded:', msg);
		return getFallbackSourcesBundle();
	}
}

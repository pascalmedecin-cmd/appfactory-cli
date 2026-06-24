/**
 * Générateur déterministe (zéro LLM) du seed `veille_sources`.
 *
 * Croise la VÉRITÉ de classification (src/lib/server/intelligence/source-allowlist.ts :
 * tier / regime / denylist / verbatim / advocacy / preprint) avec les noms et
 * descriptifs lisibles du document de revue
 * (.product-architect/editeur-veille/.. ou docs/veille/sources-revue-2026-06-24.html).
 *
 * Sortie : supabase/migrations/20260624_001_veille_sources.sql (schéma + seed) +
 * un rapport d'écarts sur stdout (domaines sans métadonnée, métadonnées orphelines).
 *
 * Lancement : npx tsx scripts/gen-veille-sources-seed.ts
 *
 * Le seed est la PHOTO EXACTE du comportement actuel : pour chaque domaine, on
 * stocke getDomainTier / domainRegime / isDeniedSource / requiresStrictVerbatim /
 * isAdvocacySource / isPreprintSource. Un test d'équivalence (sources-seed.test.ts)
 * reverifie ligne par ligne. Aucune régression : la table reproduit le code.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
	TIER_1_OFFICIAL,
	TIER_2_TRADE_PRO,
	TIER_3_MARKET_RESEARCH,
	TIER_4_PRESS_GENERAL,
	TIER_5_TECH_INNOVATION,
	TIER_6_COMPETITORS_INTERNATIONAL,
	TIER_7A_INSTALLERS_BENCHMARK,
	TIER_7B_BRANDS_BENCHMARK,
	DENYLIST,
	STRICT_VERBATIM_DOMAINS,
	ACADEMIC_PREPRINT_STRICT,
	ADVOCACY_DOMAINS,
	getDomainTier,
	domainRegime,
	isDeniedSource,
	requiresStrictVerbatim,
	isAdvocacySource,
	isPreprintSource
} from '../src/lib/server/intelligence/source-allowlist';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// --- 1. Union de tous les domaines connus du moteur (dédupliqués) ---
const allDomains = new Set<string>();
for (const set of [
	TIER_1_OFFICIAL,
	TIER_2_TRADE_PRO,
	TIER_3_MARKET_RESEARCH,
	TIER_4_PRESS_GENERAL,
	TIER_5_TECH_INNOVATION,
	TIER_6_COMPETITORS_INTERNATIONAL,
	TIER_7A_INSTALLERS_BENCHMARK,
	TIER_7B_BRANDS_BENCHMARK,
	DENYLIST,
	STRICT_VERBATIM_DOMAINS,
	ACADEMIC_PREPRINT_STRICT,
	ADVOCACY_DOMAINS
]) {
	for (const d of set) allDomains.add(d);
}

// --- 2. Métadonnées lisibles (name / desc / benchmark / new) depuis le doc HTML ---
type Meta = { name: string; desc: string; bench: boolean; isNew: boolean };
const metaByDomain = new Map<string, Meta>();

const htmlPath = join(ROOT, 'docs/veille/sources-revue-2026-06-24.html');
const html = readFileSync(htmlPath, 'utf8');
const catsMatch = html.match(/const CATS = (\[[\s\S]*?\n\]);/);
if (!catsMatch) throw new Error('Bloc CATS introuvable dans le doc HTML');
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const CATS = new Function('return ' + catsMatch[1])() as Array<{
	sources: Array<{ n: string; d: string; s: string; f?: string[] }>;
}>;
for (const cat of CATS) {
	for (const src of cat.sources) {
		const d = src.d.split(' ')[0].toLowerCase();
		if (d.includes('*')) continue; // patterns, pas des domaines
		metaByDomain.set(d, {
			name: src.n,
			desc: src.s ?? '',
			bench: (src.f ?? []).includes('bench'),
			isNew: (src.f ?? []).includes('new')
		});
	}
}

// Complément : domaines connus du moteur mais absents du doc de revue (preprints
// académiques secondaires non listés dans l'échantillon HTML).
const EXTRA_META: Record<string, { name: string; desc: string }> = {
	'biorxiv.org': { name: 'bioRxiv', desc: 'Preprints en biologie (non validés par les pairs)' },
	'medrxiv.org': { name: 'medRxiv', desc: 'Preprints en médecine (non validés par les pairs)' },
	'preprints.org': { name: 'Preprints.org', desc: 'Plateforme de preprints multidisciplinaire' },
	'researchsquare.com': { name: 'Research Square', desc: 'Plateforme de preprints' },
	'ssrn.com': { name: 'SSRN', desc: 'Preprints en sciences sociales (Elsevier)' }
};
for (const [d, m] of Object.entries(EXTRA_META)) {
	if (!metaByDomain.has(d)) metaByDomain.set(d, { name: m.name, desc: m.desc, bench: false, isNew: false });
}

// --- 3. Construire les lignes de seed (vérité = fonctions du code) ---
type Row = {
	hostname: string;
	name: string;
	description: string;
	tier: string | null;
	regime: string;
	in_denylist: boolean;
	strict_verbatim: boolean;
	is_advocacy: boolean;
	is_preprint: boolean;
	is_benchmark: boolean;
	is_new: boolean;
	sort_order: number;
};

function deriveName(domain: string): string {
	const core = domain.replace(/\.(com|ch|fr|org|eu|de|it|be|lu|net|info|news|admin\.ch|gouv\.fr)$/i, '');
	return core.charAt(0).toUpperCase() + core.slice(1);
}

const rows: Row[] = [];
const missingMeta: string[] = [];
let sort = 0;
for (const hostname of [...allDomains].sort()) {
	const meta = metaByDomain.get(hostname);
	if (!meta) missingMeta.push(hostname);
	rows.push({
		hostname,
		name: meta?.name ?? deriveName(hostname),
		description: meta?.desc ?? '',
		tier: getDomainTier(hostname),
		regime: domainRegime(hostname),
		in_denylist: isDeniedSource(hostname),
		strict_verbatim: requiresStrictVerbatim(hostname),
		is_advocacy: isAdvocacySource(hostname),
		is_preprint: isPreprintSource(hostname),
		is_benchmark: meta?.bench ?? false,
		is_new: meta?.isNew ?? false,
		sort_order: (sort += 10)
	});
}

// Métadonnées du doc qui ne correspondent à aucun domaine du moteur (à signaler)
const orphanMeta: string[] = [];
for (const d of metaByDomain.keys()) {
	if (!allDomains.has(d)) orphanMeta.push(d);
}

// --- 4. Émettre le SQL ---
function sq(s: string): string {
	return "'" + s.replace(/'/g, "''") + "'";
}
function sqlVal(v: string | number | boolean | null): string {
	if (v === null) return 'NULL';
	if (typeof v === 'boolean') return v ? 'true' : 'false';
	if (typeof v === 'number') return String(v);
	return sq(v);
}
function sqlValTs(s: string): string {
	return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

const valuesLines = rows
	.map(
		(r) =>
			`  (${sqlVal(r.hostname)}, ${sqlVal(r.name)}, ${sqlVal(r.description)}, ${sqlVal(r.tier)}, ${sqlVal(r.regime)}, ${sqlVal(r.in_denylist)}, ${sqlVal(r.strict_verbatim)}, ${sqlVal(r.is_advocacy)}, ${sqlVal(r.is_preprint)}, ${sqlVal(r.is_benchmark)}, ${sqlVal(r.is_new)}, ${r.sort_order})`
	)
	.join(',\n');

const sql = `-- Migration : externaliser les sources de veille (whitelist 7 tiers + denylist +
-- regimes de verification) en table editable, comme veille_themes.
--
-- Genere par scripts/gen-veille-sources-seed.ts (deterministe, zero LLM) :
-- chaque ligne est la PHOTO EXACTE du comportement de
-- src/lib/server/intelligence/source-allowlist.ts (getDomainTier / domainRegime /
-- isDeniedSource / requiresStrictVerbatim / isAdvocacySource / isPreprintSource).
-- Un test d'equivalence (sources-seed.test.ts) reverifie ligne par ligne.
--
-- ETAPE 1 du chantier : le moteur ne lit PAS encore cette table (il lit toujours
-- le code). Aucune regression. Les etapes suivantes branchent le loader + fallback.
--
-- Colonnes :
-- - hostname  : domaine normalise (sans www.), cle naturelle unique.
-- - tier      : T1..T7B (NULL pour les domaines hors whitelist mais connus :
--               strict_verbatim only, denylist).
-- - regime    : strict | trusted | trusted_advocacy (= domainRegime au seed).
-- - in_denylist / strict_verbatim / is_advocacy / is_preprint : flags atomiques
--               qui reproduisent isDeniedSource / requiresStrictVerbatim /
--               isAdvocacySource / isPreprintSource.
-- - is_benchmark / is_new : metadonnees UI (panel benchmark, ajouts recents).
-- - active    : source utilisee par la veille (decoche = en pause, conservee).
--
-- NB : les 4 patterns regex de DENYLIST_HOSTNAME_PATTERNS (*.blogspot, *.wordpress,
-- *.medium.com/@user, *.substack) ne sont PAS des domaines ; ils restent en code
-- (regle anti-spam structurelle, hors UI sources).
--
-- RLS : public read (cron + UI), service-role-only writes (endpoints SvelteKit
-- valident locals.user). Idempotent via ON CONFLICT (hostname).

CREATE TABLE IF NOT EXISTS veille_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  tier text CHECK (tier IN ('T1','T2','T3','T4','T5','T6','T7A','T7B')),
  regime text NOT NULL CHECK (regime IN ('strict','trusted','trusted_advocacy')),
  in_denylist boolean NOT NULL DEFAULT false,
  strict_verbatim boolean NOT NULL DEFAULT false,
  is_advocacy boolean NOT NULL DEFAULT false,
  is_preprint boolean NOT NULL DEFAULT false,
  is_benchmark boolean NOT NULL DEFAULT false,
  is_new boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS veille_sources_active_idx ON veille_sources (active) WHERE active = true;
CREATE INDEX IF NOT EXISTS veille_sources_tier_idx ON veille_sources (tier);

ALTER TABLE veille_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS veille_sources_select_all ON veille_sources;
CREATE POLICY veille_sources_select_all ON veille_sources FOR SELECT USING (true);

-- Aucune policy INSERT/UPDATE/DELETE : seul le service_role bypass RLS (endpoints admin).

CREATE OR REPLACE FUNCTION veille_sources_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS veille_sources_updated_at ON veille_sources;
CREATE TRIGGER veille_sources_updated_at
  BEFORE UPDATE ON veille_sources
  FOR EACH ROW EXECUTE FUNCTION veille_sources_set_updated_at();

-- Seed : ${rows.length} domaines (photo exacte du code au ${'2026-06-24'}).
INSERT INTO veille_sources
  (hostname, name, description, tier, regime, in_denylist, strict_verbatim, is_advocacy, is_preprint, is_benchmark, is_new, sort_order)
VALUES
${valuesLines}
ON CONFLICT (hostname) DO NOTHING;
`;

const outPath = join(ROOT, 'supabase/migrations/20260624_001_veille_sources.sql');
writeFileSync(outPath, sql, 'utf8');

// --- 4bis. Émettre le module TS (filet de secours + base du test d'équivalence) ---
const tsRows = rows
	.map(
		(r) =>
			`\t{ hostname: ${sqlValTs(r.hostname)}, name: ${sqlValTs(r.name)}, description: ${sqlValTs(r.description)}, tier: ${r.tier === null ? 'null' : sqlValTs(r.tier)}, regime: ${sqlValTs(r.regime)}, in_denylist: ${r.in_denylist}, strict_verbatim: ${r.strict_verbatim}, is_advocacy: ${r.is_advocacy}, is_preprint: ${r.is_preprint}, is_benchmark: ${r.is_benchmark}, is_new: ${r.is_new}, sort_order: ${r.sort_order} }`
	)
	.join(',\n');
const ts = `// GÉNÉRÉ par scripts/gen-veille-sources-seed.ts - NE PAS éditer à la main.
// Photo exacte de la classification de source-allowlist.ts (${rows.length} domaines, 2026-06-24).
// Sert de seed SQL (migration jumelle) ET de filet de secours pour sources-loader.ts
// (si la table veille_sources est inaccessible, le cron ne casse pas). Régénérer :
//   npx tsx scripts/gen-veille-sources-seed.ts

export interface SourceSeedRow {
	hostname: string;
	name: string;
	description: string;
	tier: 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7A' | 'T7B' | null;
	regime: 'strict' | 'trusted' | 'trusted_advocacy';
	in_denylist: boolean;
	strict_verbatim: boolean;
	is_advocacy: boolean;
	is_preprint: boolean;
	is_benchmark: boolean;
	is_new: boolean;
	sort_order: number;
}

export const SOURCES_SEED: readonly SourceSeedRow[] = [
${tsRows}
];
`;
const tsPath = join(ROOT, 'src/lib/server/intelligence/sources-seed.ts');
writeFileSync(tsPath, ts, 'utf8');

// --- 5. Rapport ---
const byTier: Record<string, number> = {};
const byRegime: Record<string, number> = {};
for (const r of rows) {
	const t = r.tier ?? 'null';
	byTier[t] = (byTier[t] ?? 0) + 1;
	byRegime[r.regime] = (byRegime[r.regime] ?? 0) + 1;
}
console.log('=== Seed veille_sources genere ===');
console.log('Fichier :', outPath);
console.log('Total domaines :', rows.length);
console.log('Par tier :', JSON.stringify(byTier));
console.log('Par regime :', JSON.stringify(byRegime));
console.log('Denylist :', rows.filter((r) => r.in_denylist).length, '| Benchmark :', rows.filter((r) => r.is_benchmark).length, '| Nouveaux :', rows.filter((r) => r.is_new).length);
console.log('');
console.log('Domaines SANS nom/desc (name derive, desc vide -', missingMeta.length, ') :');
console.log(missingMeta.length ? '  ' + missingMeta.join(', ') : '  (aucun)');
console.log('');
console.log('Metadonnees du doc HTML SANS domaine moteur (' + orphanMeta.length + ', faute de frappe possible) :');
console.log(orphanMeta.length ? '  ' + orphanMeta.join(', ') : '  (aucune)');

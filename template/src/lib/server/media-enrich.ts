/**
 * Enrichissement hebdo de la bibliothèque photo depuis Pexels + Unsplash.
 * Appelé par /api/cron/media-enrich (jeudi 7h via vercel.json).
 *
 * - Pour chaque segment FilmPro : fetch N images par source
 * - Filtrage qualité (orientation landscape, min 1200×630)
 * - Upload idempotent via uploadMedia (dedup hash)
 */
import { uploadMedia, type MediaUploadResult, type MediaSource } from './media-library.js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Queries par segment FilmPro. 2-3 queries par segment pour diversité.
 * Mots-clés sobres, architecture / commercial / professionnel.
 */
const SEGMENT_QUERIES: Record<string, string[]> = {
  securite: ['security glass building', 'commercial window protection', 'glass door modern'],
  'confort-thermique': ['modern office window', 'glass facade building', 'sunlight interior office'],
  'controle-solaire': ['solar control building', 'office glass facade sunny', 'curtain wall glass'],
  esthetique: ['architectural glass facade', 'modern building glass', 'minimalist office glass'],
  discretion: ['frosted glass office', 'privacy glass partition', 'meeting room glass'],
  confidentialite: ['office meeting room glass', 'corporate privacy glass', 'glass partition modern'],
  facade: ['modern building facade', 'glass skyscraper', 'commercial facade glass'],
  'pourquoi-filmpro': ['professional installation glass', 'business office glass', 'corporate building'],
  'a-propos': ['team corporate office', 'business meeting glass', 'modern workspace'],
  partenaires: ['business handshake corporate', 'professional partners office', 'team office glass'],
  accueil: ['modern building entrance', 'commercial lobby glass', 'office reception'],
};

const DEFAULT_PER_QUERY = 2;
const MIN_WIDTH = 1200;
const MIN_HEIGHT = 630;

export interface EnrichOptions {
  segments?: string[]; // Si absent : tous
  perQuery?: number; // Nombre d'images par query (default 2)
  sources?: MediaSource[]; // ['pexels', 'unsplash']
  dryRun?: boolean;
  unsplashKey?: string; // Override (sinon process.env.UNSPLASH_ACCESS_KEY)
  pexelsKey?: string; // Override (sinon process.env.PEXELS_API_KEY)
}

export interface EnrichReport {
  segment: string;
  source: MediaSource;
  query: string;
  fetched: number;
  inserted: number;
  duplicate: number;
  errored: number;
  errors: string[];
}

async function fetchBinary(url: string): Promise<Buffer> {
  const resp = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const ab = await resp.arrayBuffer();
  return Buffer.from(ab);
}

interface UnsplashPhoto {
  id: string;
  urls: { full: string; regular: string; raw: string };
  width: number;
  height: number;
  description: string | null;
  alt_description: string | null;
  user: { name: string; username: string };
  links: { html: string };
  tags?: Array<{ title: string }>;
}

async function searchUnsplash(query: string, perPage: number, apiKey: string): Promise<UnsplashPhoto[]> {
  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('content_filter', 'high');

  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${apiKey}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`Unsplash HTTP ${resp.status}`);
  const data = (await resp.json()) as { results: UnsplashPhoto[] };
  return data.results ?? [];
}

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  alt: string;
  src: { large2x: string; large: string; original: string };
}

async function searchPexels(query: string, perPage: number, apiKey: string): Promise<PexelsPhoto[]> {
  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('orientation', 'landscape');

  const resp = await fetch(url.toString(), {
    headers: { Authorization: apiKey },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`Pexels HTTP ${resp.status}`);
  const data = (await resp.json()) as { photos: PexelsPhoto[] };
  return data.photos ?? [];
}

function stripEnv(name: string): string {
  return (process.env[name] ?? '').replace(/\\n/g, '').replace(/^"|"$/g, '').trim();
}

export async function enrichLibrary(
  supabase: SupabaseClient,
  options: EnrichOptions = {},
): Promise<EnrichReport[]> {
  const perQuery = options.perQuery ?? DEFAULT_PER_QUERY;
  const sources: MediaSource[] = options.sources ?? ['pexels', 'unsplash'];
  const segments = options.segments ?? Object.keys(SEGMENT_QUERIES);
  const dryRun = options.dryRun ?? false;

  const unsplashKey = options.unsplashKey ?? stripEnv('UNSPLASH_ACCESS_KEY');
  const pexelsKey = options.pexelsKey ?? stripEnv('PEXELS_API_KEY');

  const reports: EnrichReport[] = [];

  for (const segment of segments) {
    const queries = SEGMENT_QUERIES[segment];
    if (!queries) continue;

    for (const source of sources) {
      for (const query of queries) {
        const report: EnrichReport = {
          segment,
          source,
          query,
          fetched: 0,
          inserted: 0,
          duplicate: 0,
          errored: 0,
          errors: [],
        };

        try {
          let candidates: Array<{
            source_id: string;
            source_url: string;
            credit: string;
            license: string;
            download_url: string;
            description: string;
            tags: string[];
            width: number;
            height: number;
          }> = [];

          if (source === 'unsplash') {
            if (!unsplashKey) throw new Error('UNSPLASH_ACCESS_KEY manquante');
            const photos = await searchUnsplash(query, perQuery, unsplashKey);
            candidates = photos
              .filter((p) => p.width >= MIN_WIDTH && p.height >= MIN_HEIGHT)
              .map((p) => ({
                source_id: p.id,
                source_url: p.links.html,
                credit: `Photo by ${p.user.name} on Unsplash`,
                license: 'Unsplash License',
                download_url: `${p.urls.raw}&w=1600&fit=clip&q=85&fm=jpg`,
                description: p.description ?? p.alt_description ?? query,
                tags: [segment, ...(p.tags?.map((t) => t.title.toLowerCase()) ?? [])],
                width: p.width,
                height: p.height,
              }));
          } else if (source === 'pexels') {
            if (!pexelsKey) throw new Error('PEXELS_API_KEY manquante');
            const photos = await searchPexels(query, perQuery, pexelsKey);
            candidates = photos
              .filter((p) => p.width >= MIN_WIDTH && p.height >= MIN_HEIGHT)
              .map((p) => ({
                source_id: String(p.id),
                source_url: p.url,
                credit: `Photo by ${p.photographer} on Pexels`,
                license: 'Pexels License',
                download_url: p.src.large2x,
                description: p.alt || query,
                tags: [segment, 'pexels'],
                width: p.width,
                height: p.height,
              }));
          }

          report.fetched = candidates.length;

          for (const c of candidates) {
            if (dryRun) {
              report.inserted++;
              continue;
            }
            try {
              const buffer = await fetchBinary(c.download_url);
              const result: MediaUploadResult = await uploadMedia(supabase, {
                buffer,
                source,
                source_id: c.source_id,
                source_url: c.source_url,
                credit: c.credit,
                license: c.license,
                description: c.description,
                tags: c.tags,
                segment,
              });
              if (result.status === 'inserted') report.inserted++;
              else if (result.status === 'duplicate') report.duplicate++;
              else {
                report.errored++;
                report.errors.push(`${c.source_id}: ${result.reason}`);
              }
            } catch (e) {
              report.errored++;
              report.errors.push(`${c.source_id}: ${(e as Error).message}`);
            }
          }
        } catch (e) {
          report.errors.push(`fetch ${source}/${query}: ${(e as Error).message}`);
        }

        reports.push(report);
      }
    }
  }

  return reports;
}

export function summarize(reports: EnrichReport[]): {
  inserted: number;
  duplicate: number;
  errored: number;
  fetched: number;
} {
  return reports.reduce(
    (acc, r) => ({
      inserted: acc.inserted + r.inserted,
      duplicate: acc.duplicate + r.duplicate,
      errored: acc.errored + r.errored,
      fetched: acc.fetched + r.fetched,
    }),
    { inserted: 0, duplicate: 0, errored: 0, fetched: 0 },
  );
}

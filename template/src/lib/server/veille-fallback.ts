/**
 * Sélection d'images fallback pour /veille depuis la media_library.
 *
 * Cascade côté caller :
 *   1. og:image source (si fiable, cf. og-image-quality.ts)
 *   2. generated_image_url (fal.ai, gravée dans items)
 *   3. fallback media_library (cette fonction) — picker top-N quality_score + mapping titre→segment lib
 *   4. gradient placeholder (UI)
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Segment } from './intelligence/schema.js';
import { inferSegmentFromText, type LibSegment } from './intelligence/segment-mapper.js';

const BUCKET = 'media-library';
const TOP_N = 5;

/**
 * Mapping Segment Veille → segments media_library à privilégier.
 * Utilisé en fallback si l'inférence par titre/summary ne match aucun segment lib.
 */
const SEGMENT_MAP: Record<Segment, LibSegment[]> = {
	tertiaire: ['controle-solaire', 'facade', 'pourquoi-filmpro'],
	residentiel: ['securite', 'discretion', 'accueil'],
	commerces: ['controle-solaire', 'securite', 'facade'],
	erp: ['securite', 'accueil', 'pourquoi-filmpro'],
	partenaires: ['partenaires', 'pourquoi-filmpro', 'a-propos']
};

export interface PoolEntry {
	url: string;
	score: number;
	segment: LibSegment;
}

/**
 * Pools chargés en 1 query, indexés par segment lib (11 segments) ET par segment Veille (5).
 * - byLibSegment : utilisé quand inferSegmentFromText() match (mapping fin par contenu)
 * - byVeilleSegment : fallback quand aucun segment lib ne match les keywords du titre
 */
export interface FallbackPools {
	byLibSegment: Record<string, PoolEntry[]>;
	byVeilleSegment: Record<string, PoolEntry[]>;
}

/**
 * Charge tous les pools en 1 query. Tri quality_score DESC + imported_at DESC stable.
 */
export async function loadFallbackPool(
	supabase: SupabaseClient,
	supabaseUrl: string
): Promise<FallbackPools> {
	const { data, error } = await supabase
		.from('media_library')
		.select('segment, storage_path, quality_score, imported_at')
		.eq('orientation', 'landscape')
		.gte('quality_score', 7)
		.eq('is_placeholder', false)
		.order('quality_score', { ascending: false })
		.order('imported_at', { ascending: false })
		.limit(300);

	if (error || !data) return { byLibSegment: {}, byVeilleSegment: {} };

	const byLibSegment: Record<string, PoolEntry[]> = {};
	for (const row of data) {
		if (!row.segment) continue;
		const url = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${row.storage_path}`;
		byLibSegment[row.segment] = byLibSegment[row.segment] ?? [];
		byLibSegment[row.segment].push({
			url,
			score: row.quality_score ?? 0,
			segment: row.segment as LibSegment
		});
	}

	// Construire pool par segment Veille (concaténation puis re-tri global par score)
	const byVeilleSegment: Record<string, PoolEntry[]> = {};
	for (const [veilleSeg, libSegs] of Object.entries(SEGMENT_MAP)) {
		const merged: PoolEntry[] = [];
		for (const libSeg of libSegs) {
			const entries = byLibSegment[libSeg];
			if (entries) merged.push(...entries);
		}
		merged.sort((a, b) => b.score - a.score);
		byVeilleSegment[veilleSeg] = merged;
	}

	return { byLibSegment, byVeilleSegment };
}

/**
 * Hash 32-bit déterministe d'une string.
 */
function hashSeed(seed: string): number {
	let h = 0;
	for (let i = 0; i < seed.length; i++) {
		h = (h * 31 + seed.charCodeAt(i)) | 0;
	}
	return Math.abs(h);
}

/**
 * Pick déterministe parmi les top-N entries (par quality_score DESC).
 * Garantit qu'on ne sert jamais une image low-score si une image high-score
 * existe dans le pool, tout en préservant la diversité (5 candidats top).
 */
function pickFromPool(entries: PoolEntry[], seed: string, topN = TOP_N): string | null {
	if (!entries.length) return null;
	const top = entries.slice(0, Math.min(topN, entries.length));
	return top[hashSeed(seed) % top.length].url;
}

/**
 * Sélection fallback : tente d'abord segment lib inféré du contenu,
 * puis retombe sur segment Veille générique si aucune inférence ne match.
 */
export function pickFallback(
	pools: FallbackPools,
	veilleSegment: Segment,
	seed: string,
	textHints?: { title?: string; summary?: string }
): string | null {
	// Niveau 1 : inférence par contenu (si hints fournis)
	if (textHints) {
		const inferred = inferSegmentFromText(textHints.title ?? '', textHints.summary ?? '');
		if (inferred) {
			const libPool = pools.byLibSegment[inferred];
			if (libPool && libPool.length > 0) {
				return pickFromPool(libPool, seed);
			}
		}
	}

	// Niveau 2 : segment Veille générique
	return pickFromPool(pools.byVeilleSegment[veilleSegment] ?? [], seed);
}

/**
 * Sélection d'images fallback pour /veille depuis la media_library.
 * Mapping entre segments Veille (5) et segments/tags media_library (11).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Segment } from './intelligence/schema.js';

const BUCKET = 'media-library';

/**
 * Mapping Segment Veille → segments media_library à privilégier.
 * L'ordre compte : on cherche d'abord dans le premier, puis dans le suivant.
 */
const SEGMENT_MAP: Record<Segment, string[]> = {
	tertiaire: ['controle-solaire', 'facade', 'pourquoi-filmpro'],
	residentiel: ['securite', 'discretion', 'accueil'],
	commerces: ['controle-solaire', 'securite', 'facade'],
	erp: ['securite', 'accueil', 'pourquoi-filmpro'],
	partenaires: ['partenaires', 'pourquoi-filmpro', 'a-propos']
};

export interface FallbackPool {
	// Pour chaque segment Veille, liste d'URLs publiques (triées par quality_score DESC)
	[segment: string]: string[];
}

/**
 * Charge un pool d'images fallback pour tous les segments Veille en 1 query.
 * Pas de randomisation : ordre stable (quality_score DESC, imported_at DESC).
 */
export async function loadFallbackPool(
	supabase: SupabaseClient,
	supabaseUrl: string
): Promise<FallbackPool> {
	// Charger toutes les images de qualité ≥7, landscape, groupées par segment
	const { data, error } = await supabase
		.from('media_library')
		.select('segment, storage_path, quality_score, imported_at')
		.eq('orientation', 'landscape')
		.gte('quality_score', 7)
		.eq('is_placeholder', false)
		.order('quality_score', { ascending: false })
		.order('imported_at', { ascending: false })
		.limit(200);

	if (error || !data) return {};

	// Indexer par segment media_library
	const bySegment: Record<string, string[]> = {};
	for (const row of data) {
		if (!row.segment) continue;
		const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${row.storage_path}`;
		bySegment[row.segment] = bySegment[row.segment] ?? [];
		bySegment[row.segment].push(publicUrl);
	}

	// Construire le pool pour chaque segment Veille selon le mapping
	const pool: FallbackPool = {};
	for (const [veilleSeg, libSegs] of Object.entries(SEGMENT_MAP)) {
		const merged: string[] = [];
		for (const libSeg of libSegs) {
			const urls = bySegment[libSeg];
			if (urls) merged.push(...urls);
		}
		pool[veilleSeg] = merged;
	}

	return pool;
}

/**
 * Pick déterministe : même item → même image (stable entre reloads).
 * Hash simple du rank + report_id.
 */
export function pickFallback(pool: FallbackPool, segment: Segment, seed: string): string | null {
	const urls = pool[segment];
	if (!urls || urls.length === 0) return null;

	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash * 31 + seed.charCodeAt(i)) | 0;
	}
	return urls[Math.abs(hash) % urls.length];
}

/**
 * Media Library : upload + dedup + scoring qualité
 *
 * Utilisé par :
 *  - scripts/media/seed-icloud.ts                       (seed initial 30 images)
 *  - src/lib/server/intelligence/image-fallback-generator.ts  (génération fal.ai au cron veille)
 *  - src/lib/server/veille-fallback.ts                  (sélection fallback /veille)
 *
 * Note : les sources 'pexels' et 'unsplash' sont des labels HISTORIQUES (images
 * déjà uploadées avant le pivot Bloc 6quater session 67). Plus aucun import nouveau
 * depuis ces APIs ; conservées comme pool de fallback statique.
 */
import crypto from 'node:crypto';
import { imageSize } from 'image-size';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'media-library';

export type MediaSource = 'seed' | 'pexels' | 'unsplash' | 'fal-ai';

export interface MediaUploadInput {
  buffer: Buffer;
  source: MediaSource;
  source_id?: string;
  source_url?: string;
  credit?: string;
  license?: string;
  description?: string;
  tags?: string[];
  segment?: string;
  notes?: string;
}

export interface MediaUploadResult {
  status: 'inserted' | 'duplicate' | 'error';
  id?: string;
  storage_path?: string;
  content_hash: string;
  width?: number;
  height?: number;
  reason?: string;
}

export function hashContent(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function detectFormat(buffer: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (buffer.length < 12) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png';
  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'webp';
  }
  return null;
}

/**
 * Scoring qualité image 0-10 (Bloc 6bis).
 * Critères : dimensions min (600×315), ratio proche 1.91:1 (og:image standard),
 * format (jpeg/webp > png pour photo), taille fichier raisonnable.
 */
export function qualityScore(
  width: number,
  height: number,
  format: string,
  file_size_kb: number,
): { score: number; is_placeholder: boolean } {
  let score = 10;

  // Dimensions minimales
  if (width < 600 || height < 315) score -= 4;
  if (width < 300 || height < 200) {
    return { score: 0, is_placeholder: true };
  }

  // Ratio : 1.91:1 = 1.905 (og:image standard). Tolérance ±30%.
  const ratio = width / height;
  const idealRatio = 1.91;
  const ratioDeviation = Math.abs(ratio - idealRatio) / idealRatio;
  if (ratioDeviation > 0.3) score -= 2;
  if (ratioDeviation > 0.6) score -= 2;

  // Format
  if (format === 'png' && file_size_kb > 2000) score -= 1; // PNG gros = probablement sous-optimal

  // Taille suspecte (placeholder <20Ko ou favicon)
  if (file_size_kb < 20) {
    return { score: 0, is_placeholder: true };
  }

  return { score: Math.max(0, Math.min(10, score)), is_placeholder: false };
}

export function getServiceClient(): SupabaseClient {
  const urlRaw = process.env.PUBLIC_SUPABASE_URL ?? '';
  const keyRaw = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const url = urlRaw.replace(/\\n/g, '').trim();
  const key = keyRaw.replace(/\\n/g, '').trim();
  if (!url || !key) throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants');
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Upload idempotent : dedup par content_hash.
 * - Si hash déjà en DB → renvoie duplicate sans upload
 * - Sinon : upload Storage + insert DB
 */
export async function uploadMedia(
  supabase: SupabaseClient,
  input: MediaUploadInput,
): Promise<MediaUploadResult> {
  const content_hash = hashContent(input.buffer);

  // Dedup
  const { data: existing } = await supabase
    .from('media_library')
    .select('id, storage_path, width, height')
    .eq('content_hash', content_hash)
    .maybeSingle();

  if (existing) {
    return {
      status: 'duplicate',
      id: existing.id,
      storage_path: existing.storage_path,
      content_hash,
      width: existing.width,
      height: existing.height,
    };
  }

  // Detection format
  const format = detectFormat(input.buffer);
  if (!format) {
    return { status: 'error', content_hash, reason: 'format inconnu (ni jpeg/png/webp)' };
  }

  // Dimensions
  let width = 0;
  let height = 0;
  try {
    const dims = imageSize(input.buffer);
    width = dims.width ?? 0;
    height = dims.height ?? 0;
  } catch (e) {
    return { status: 'error', content_hash, reason: `image-size: ${(e as Error).message}` };
  }
  if (width === 0 || height === 0) {
    return { status: 'error', content_hash, reason: 'dimensions inconnues' };
  }

  const file_size_kb = Math.round(input.buffer.length / 1024);
  const { score, is_placeholder } = qualityScore(width, height, format, file_size_kb);

  // Storage path : filmpro/{source}/{hash12}.{ext}
  const ext = format === 'jpeg' ? 'jpg' : format;
  const storage_path = `filmpro/${input.source}/${content_hash.slice(0, 12)}.${ext}`;

  // Upload Storage
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storage_path, input.buffer, {
      contentType: `image/${format}`,
      upsert: false,
    });
  if (upErr) {
    return { status: 'error', content_hash, reason: `storage upload: ${upErr.message}` };
  }

  // Insert DB
  const { data: row, error: insErr } = await supabase
    .from('media_library')
    .insert({
      storage_path,
      content_hash,
      source: input.source,
      source_id: input.source_id ?? null,
      source_url: input.source_url ?? null,
      credit: input.credit ?? null,
      license: input.license ?? null,
      width,
      height,
      format,
      file_size_kb,
      description: input.description ?? null,
      tags: input.tags ?? [],
      segment: input.segment ?? null,
      quality_score: score,
      is_placeholder,
      notes: input.notes ?? null,
    })
    .select('id')
    .single();

  if (insErr) {
    // Rollback Storage si DB fail
    await supabase.storage.from(BUCKET).remove([storage_path]);
    return { status: 'error', content_hash, reason: `db insert: ${insErr.message}` };
  }

  return {
    status: 'inserted',
    id: row.id,
    storage_path,
    content_hash,
    width,
    height,
  };
}

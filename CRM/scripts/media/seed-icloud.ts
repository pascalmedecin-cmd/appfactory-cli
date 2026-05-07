#!/usr/bin/env tsx
/**
 * Seed initial de la bibliothèque photo FilmPro depuis le dossier iCloud.
 * Usage : npx tsx scripts/media/seed-icloud.ts
 *
 * - Scanne toutes les images (jpg/png/webp) du dossier iCloud 00_Media
 * - Parse le nom de fichier pour extraire segment + description
 * - Upload idempotent (dedup par content_hash)
 * - Affiche un rapport (inserted / duplicate / error)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { uploadMedia, getServiceClient, type MediaUploadResult } from '../../src/lib/server/media-library.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadEnv({ path: path.resolve(__dirname, '../../.env.local') });

const ICLOUD_DIR = '/Users/pascal/Library/Mobile Documents/com~apple~CloudDocs/Téléchargements/00_Media';

// Mapping : préfixe normalisé (sans accents, lowercase) → segment FilmPro canonique
const SEGMENT_MAP: Record<string, string> = {
  'a propos': 'a-propos',
  accueil: 'accueil',
  diagramme: 'controle-solaire',
  discretion: 'discretion',
  facade: 'facade',
  partenaires: 'partenaires',
  'pourquoi filmpro': 'pourquoi-filmpro',
  securite: 'securite',
  solaire: 'controle-solaire',
};

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseFilename(filename: string): { segment: string | null; description: string; tags: string[] } {
  const base = filename.replace(/\.(jpe?g|png|webp)$/i, '');
  const parts = base.split('_');
  const prefix = parts[0]?.trim() ?? '';
  const rest = parts.slice(1).join(' ').trim();

  const segment = SEGMENT_MAP[normalize(prefix)] ?? null;

  const description = rest ? `${prefix} : ${rest}` : prefix;

  const tags: string[] = [];
  if (segment) tags.push(segment);
  if (/hero/i.test(base)) tags.push('hero');
  if (/confort|thermique/i.test(base)) tags.push('confort-thermique');
  if (/confident/i.test(base)) tags.push('confidentialite');
  if (/esthetique|esthétique/i.test(base)) tags.push('esthetique');
  if (/securite|sécurité/i.test(base)) tags.push('securite');
  if (/solaire|control/i.test(base)) tags.push('controle-solaire');
  if (/facade|façade/i.test(base)) tags.push('facade');
  if (/smart/i.test(base)) tags.push('smart-glass');
  if (/commerce/i.test(base)) tags.push('commerce');
  if (/residentiel|résidentiel/i.test(base)) tags.push('residentiel');
  if (/technicien/i.test(base)) tags.push('technicien');
  if (/analyse/i.test(base)) tags.push('analyse');
  if (/pose/i.test(base)) tags.push('pose');
  if (/bleue|bleu/i.test(base)) tags.push('bleu');

  return { segment, description, tags: [...new Set(tags)] };
}

async function main() {
  console.log(`Scan : ${ICLOUD_DIR}`);
  const files = await fs.readdir(ICLOUD_DIR);
  const images = files.filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  console.log(`${images.length} images détectées\n`);

  const supabase = getServiceClient();

  const results: Array<{ file: string; result: MediaUploadResult }> = [];
  let inserted = 0;
  let duplicate = 0;
  let errored = 0;

  for (const file of images) {
    const full = path.join(ICLOUD_DIR, file);
    const buffer = await fs.readFile(full);
    const meta = parseFilename(file);

    process.stdout.write(`  ${file} ... `);

    const result = await uploadMedia(supabase, {
      buffer,
      source: 'seed',
      description: meta.description,
      tags: meta.tags,
      segment: meta.segment ?? undefined,
      license: 'FilmPro proprietary',
      credit: 'FilmPro',
      notes: `Source: ${file}`,
    });

    results.push({ file, result });

    if (result.status === 'inserted') {
      inserted++;
      console.log(`OK ${result.width}×${result.height} q=${result.content_hash.slice(0, 8)}`);
    } else if (result.status === 'duplicate') {
      duplicate++;
      console.log(`DOUBLON ${result.content_hash.slice(0, 8)}`);
    } else {
      errored++;
      console.log(`ERREUR ${result.reason}`);
    }
  }

  console.log('\n=== Rapport ===');
  console.log(`Inserted  : ${inserted}`);
  console.log(`Duplicate : ${duplicate}`);
  console.log(`Errored   : ${errored}`);
  console.log(`Total     : ${results.length}`);

  if (errored > 0) process.exit(1);
}

main().catch((e) => {
  console.error('FATAL :', e);
  process.exit(1);
});

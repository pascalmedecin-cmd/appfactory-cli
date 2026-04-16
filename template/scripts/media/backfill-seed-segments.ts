#!/usr/bin/env tsx
/**
 * One-shot : relit les fichiers iCloud, recalcule segment+description+tags
 * (avec normalisation NFD + lookup "Solaire" → controle-solaire corrigé)
 * et fait un UPDATE sur les rows seed correspondantes (match par content_hash).
 *
 * Idempotent : peut être relancé sans risque.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { getServiceClient } from '../../src/lib/server/media-library.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadEnv({ path: path.resolve(__dirname, '../../.env.local') });

const ICLOUD_DIR = '/Users/pascal/Library/Mobile Documents/com~apple~CloudDocs/Téléchargements/00_Media';

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
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function parseFilename(filename: string) {
  const base = filename.replace(/\.(jpe?g|png|webp)$/i, '');
  const parts = base.split('_');
  const prefix = parts[0]?.trim() ?? '';
  const rest = parts.slice(1).join(' ').trim();
  const segment = SEGMENT_MAP[normalize(prefix)] ?? null;
  const description = rest ? `${prefix} — ${rest}` : prefix;

  const tags: string[] = [];
  if (segment) tags.push(segment);
  const n = normalize(base);
  if (n.includes('hero')) tags.push('hero');
  if (n.includes('confort') || n.includes('thermique')) tags.push('confort-thermique');
  if (n.includes('confident')) tags.push('confidentialite');
  if (n.includes('esthetique')) tags.push('esthetique');
  if (n.includes('securite')) tags.push('securite');
  if (n.includes('solaire') || n.includes('controle')) tags.push('controle-solaire');
  if (n.includes('facade')) tags.push('facade');
  if (n.includes('smart')) tags.push('smart-glass');
  if (n.includes('commerce')) tags.push('commerce');
  if (n.includes('residentiel')) tags.push('residentiel');
  if (n.includes('technicien')) tags.push('technicien');
  if (n.includes('tertiaire')) tags.push('tertiaire');
  if (n.includes('bureau')) tags.push('bureau');
  if (n.includes('logement')) tags.push('logement');
  if (n.includes('film')) tags.push('film');
  if (n.includes('vernis')) tags.push('vernis');
  if (n.includes('verre')) tags.push('verre');
  if (n.includes('analyse')) tags.push('analyse');
  if (n.includes('pose')) tags.push('pose');
  if (n.includes('bleu')) tags.push('bleu');

  return { segment, description, tags: [...new Set(tags)] };
}

async function main() {
  const supabase = getServiceClient();
  const files = await fs.readdir(ICLOUD_DIR);
  const images = files.filter((f) => /\.(jpe?g|png|webp)$/i.test(f));

  let updated = 0;
  let missing = 0;

  for (const file of images) {
    const full = path.join(ICLOUD_DIR, file);
    const buffer = await fs.readFile(full);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const meta = parseFilename(file);

    const { data: row, error: fetchErr } = await supabase
      .from('media_library')
      .select('id, segment, tags, description')
      .eq('content_hash', hash)
      .maybeSingle();

    if (fetchErr) {
      console.log(`  ${file} : erreur fetch ${fetchErr.message}`);
      continue;
    }
    if (!row) {
      missing++;
      console.log(`  ${file} : absent en DB`);
      continue;
    }

    const { error: upErr } = await supabase
      .from('media_library')
      .update({
        segment: meta.segment,
        description: meta.description,
        tags: meta.tags,
      })
      .eq('id', row.id);

    if (upErr) {
      console.log(`  ${file} : erreur update ${upErr.message}`);
      continue;
    }

    updated++;
    console.log(`  ${file} → segment=${meta.segment} tags=[${meta.tags.join(',')}]`);
  }

  console.log(`\n=== Rapport ===`);
  console.log(`Updated : ${updated}`);
  console.log(`Missing : ${missing}`);
}

main().catch((e) => {
  console.error('FATAL :', e);
  process.exit(1);
});

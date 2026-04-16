#!/usr/bin/env tsx
/**
 * CLI pour enrichir la bibliothèque manuellement.
 * Usage :
 *   npx tsx scripts/media/enrich-cli.ts                      # tous segments, 2/query
 *   npx tsx scripts/media/enrich-cli.ts --segment=securite   # un seul segment
 *   npx tsx scripts/media/enrich-cli.ts --per-query=3        # plus par query
 *   npx tsx scripts/media/enrich-cli.ts --source=pexels      # une seule source
 *   npx tsx scripts/media/enrich-cli.ts --dry-run            # sans upload
 */
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { enrichLibrary, summarize } from '../../src/lib/server/media-enrich.js';
import { getServiceClient } from '../../src/lib/server/media-library.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadEnv({ path: path.resolve(__dirname, '../../.env.local') });

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [k, v] = arg.slice(2).split('=');
    out[k] = v ?? true;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const segments = typeof args.segment === 'string' ? [args.segment] : undefined;
  const sources =
    args.source === 'pexels' ? ['pexels' as const] : args.source === 'unsplash' ? ['unsplash' as const] : undefined;
  const perQuery = typeof args['per-query'] === 'string' ? Number(args['per-query']) : 2;
  const dryRun = args['dry-run'] === true;

  console.log(`Enrichissement ${dryRun ? '(DRY-RUN)' : ''}`);
  console.log(`  Segments  : ${segments?.join(', ') ?? 'tous'}`);
  console.log(`  Sources   : ${sources?.join(', ') ?? 'pexels + unsplash'}`);
  console.log(`  Per query : ${perQuery}\n`);

  const supabase = getServiceClient();
  const reports = await enrichLibrary(supabase, { segments, sources, perQuery, dryRun });

  for (const r of reports) {
    const tag = r.errored > 0 ? 'ERR' : r.inserted > 0 ? 'NEW' : r.duplicate > 0 ? 'DUP' : '---';
    console.log(
      `  [${tag}] ${r.segment.padEnd(20)} ${r.source.padEnd(9)} "${r.query}" → fetched=${r.fetched} new=${r.inserted} dup=${r.duplicate} err=${r.errored}`,
    );
    if (r.errors.length > 0) {
      for (const err of r.errors.slice(0, 3)) console.log(`         ${err}`);
    }
  }

  const s = summarize(reports);
  console.log(`\n=== Résumé ===`);
  console.log(`  Fetched   : ${s.fetched}`);
  console.log(`  Inserted  : ${s.inserted}`);
  console.log(`  Duplicate : ${s.duplicate}`);
  console.log(`  Errored   : ${s.errored}`);
}

main().catch((e) => {
  console.error('FATAL :', e);
  process.exit(1);
});

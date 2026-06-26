#!/usr/bin/env node
/**
 * Apercu HTML du Daily Email « Relances du jour » avec des donnees realistes, pour
 * validation visuelle dans le navigateur. Aucun envoi, aucun appel LLM, aucune lecture DB.
 * Sortie : .product-architect/daily-email/preview-daily-email.html
 *
 *   npx tsx scripts/preview-daily-email.ts && open -a "Google Chrome" \
 *     "file://$(pwd)/.product-architect/daily-email/preview-daily-email.html?v=$(date +%s)"
 */
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildDailyEmailPayload } from '../src/lib/server/daily-email/template';
import type { TacheDue } from '../src/lib/utils/dashboardTemporel';

const todayIso = '2026-06-26';

const t = (titre: string | null, date: string, ent: string | null): TacheDue => ({
	id: `${titre ?? ent}-${date}`,
	titre,
	etape_pipeline: null,
	date_relance_prevue: date,
	entreprise: ent ? { raison_sociale: ent } : null
});

const today: TacheDue[] = [
	t('Relancer devis vitrage solaire', `${todayIso}T08:00:00+00:00`, 'Régie Dupont SA'),
	t(null, `${todayIso}T09:00:00+00:00`, 'Bureau Martin Architectes'),
	t('Confirmer RDV pose - Villa Coppet', `${todayIso}T10:00:00+00:00`, 'M. et Mme Berset')
];

const late: TacheDue[] = [
	t('Suivi offre films de sécurité', '2026-06-25T08:00:00+00:00', 'Facility ABC'),
	t(null, '2026-06-23T08:00:00+00:00', 'Archi Plus Sàrl'),
	t('Devis bâtiment scolaire (protection UV)', '2026-06-18T08:00:00+00:00', 'Commune de Nyon')
];

const { html, subject, text } = buildDailyEmailPayload({
	today,
	late,
	todayTotal: today.length,
	lateTotal: late.length,
	todayIso,
	now: new Date(`${todayIso}T05:00:00Z`)
});

const here = dirname(fileURLToPath(import.meta.url));
// Le logo prod n'est servi qu'en ligne : pour l'APERCU local, on l'inline en data URI
// depuis static/ pour que Chrome l'affiche. L'email reel garde l'URL hebergee.
const logoPng = readFileSync(join(here, '..', 'static', 'FilmPro_logo_white.png'));
const dataUri = `data:image/png;base64,${logoPng.toString('base64')}`;
const previewHtml = html.replace(
	'https://filmpro-portail.vercel.app/FilmPro_logo_white.png',
	dataUri
);

const outDir = join(here, '..', '.product-architect', 'daily-email');
mkdirSync(outDir, { recursive: true });
const out = join(outDir, 'preview-daily-email.html');
writeFileSync(out, previewHtml, 'utf8');

console.log(`Apercu ecrit : ${out}`);
console.log(`Sujet : ${subject}`);
console.log('--- TEXTE ---');
console.log(text);

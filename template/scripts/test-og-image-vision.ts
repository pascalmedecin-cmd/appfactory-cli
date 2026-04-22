/**
 * Test isolé : calibrer la Vision Niveau 1 sur og:image avant intégration prod.
 *
 * Cas de test :
 *  1. Springer Fig1_HTML.png (W16 item 1) - schéma scientifique → DOIT être rejeté
 *  2. fal.ai W16 item 2 - photo générique sans lien sémantique → score contextuel faible
 *  3. Photo éditoriale FilmPro univers OK (fal.ai autre semaine) → DOIT passer
 *
 * Usage : npx tsx scripts/test-og-image-vision.ts
 */

import { config as loadEnv } from 'dotenv';
import { writeFileSync, mkdirSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { auditOgImageVision } from '../src/lib/server/intelligence/og-image-vision.js';

loadEnv({ path: '.env.local' });

const ANTHROPIC_KEY = (process.env.ANTHROPIC_API_KEY ?? '').trim();
if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY manquante');

const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
const OUT_DIR = '/tmp/og-vision-test';
mkdirSync(OUT_DIR, { recursive: true });

interface TestCase {
	id: string;
	imageUrl: string;
	title: string;
	summary: string;
	expected_ok: boolean;
	expected_reason?: string;
}

const CASES: TestCase[] = [
	{
		id: '1-springer-fig',
		imageUrl:
			'https://media.springernature.com/full/springer-static/image/art%3A10.1038%2Fs41598-026-46722-4/MediaObjects/41598_2026_46722_Fig1_HTML.png',
		title:
			'Nature : les vitrages avancés réduisent le U-value de 2-4.5 à 0.5-1.5 W/m²K en climat chaud',
		summary:
			"Étude Nature Scientific Reports sur l'impact des vitrages multi-couches (double, triple, low-e) sur la conductivité thermique en climat chaud. Cible : architectes, bureaux d'études thermiques.",
		expected_ok: false,
		expected_reason: 'diagram_or_infographic'
	},
	{
		id: '2-falai-w16-commerce',
		imageUrl:
			'https://fmflvjubjtpidvxwhqab.supabase.co/storage/v1/object/public/media-library/filmpro/fal-ai/abdb427f37c0.jpg',
		title:
			'Guide sectoriel : les films commerciaux réduisent les coûts énergétiques de 10-30 % avec un payback de 2-5 ans',
		summary:
			"Guide sectoriel publié sur le ROI des films solaires en bâtiments commerciaux : réduction charges climatisation, payback 2-5 ans. Cible : propriétaires immobiliers tertiaires, gestionnaires.",
		expected_ok: false,
		expected_reason: 'contextual_score'
	}
];

async function runOneCase(tc: TestCase) {
	console.log(`\n=== ${tc.id} ===`);
	console.log(`Titre : ${tc.title.slice(0, 80)}...`);
	console.log(`URL : ${tc.imageUrl.slice(0, 80)}...`);

	const t0 = Date.now();
	const result = await auditOgImageVision(anthropic, tc.imageUrl, {
		title: tc.title,
		summary: tc.summary
	});
	const ms = Date.now() - t0;

	const pass = result.ok === tc.expected_ok;
	console.log(`  Résultat : ok=${result.ok} (attendu ${tc.expected_ok}) → ${pass ? 'OK' : 'MISMATCH'}`);
	console.log(`  Reason : ${result.reason ?? '(none)'}`);
	if (result.audit) {
		console.log(`  Audit :`);
		console.log(`    is_photograph: ${result.audit.is_photograph}`);
		console.log(`    is_editorial: ${result.audit.is_editorial}`);
		console.log(`    no_diagram_or_infographic: ${result.audit.no_diagram_or_infographic}`);
		console.log(`    no_screenshot_or_ui: ${result.audit.no_screenshot_or_ui}`);
		console.log(`    contextual_score: ${result.audit.contextual_score}/10`);
		console.log(`    critique: ${result.audit.one_sentence_critique}`);
	}
	console.log(`  Latence : ${ms}ms`);

	writeFileSync(
		`${OUT_DIR}/${tc.id}.json`,
		JSON.stringify({ testCase: tc, result, ms, pass }, null, 2)
	);
	return { tc, result, ms, pass };
}

async function main() {
	const results = [];
	for (const tc of CASES) {
		try {
			results.push(await runOneCase(tc));
		} catch (e) {
			console.error(`  ERREUR ${tc.id}:`, e);
		}
	}

	console.log('\n=== Récap ===');
	const passed = results.filter((r) => r.pass).length;
	console.log(`${passed}/${results.length} passes attendus`);
	for (const r of results) {
		const tag = r.pass ? 'OK' : 'MISMATCH';
		console.log(`  [${tag}] ${r.tc.id} : expected=${r.tc.expected_ok} got=${r.result.ok} reason=${r.result.reason ?? '-'}`);
	}

	// Markdown récap
	const md = ['# Test og:image Vision : récap\n'];
	for (const r of results) {
		md.push(`## ${r.tc.id}\n`);
		md.push(`**Titre** : ${r.tc.title}\n`);
		md.push(`**URL** : ${r.tc.imageUrl}\n`);
		md.push(`**Attendu** : ok=${r.tc.expected_ok} (reason=${r.tc.expected_reason ?? '-'})\n`);
		md.push(`**Obtenu** : ok=${r.result.ok} reason=${r.result.reason ?? '-'} (${r.ms}ms)\n`);
		if (r.result.audit) {
			md.push(`**Audit** :\n`);
			md.push(`- is_photograph: ${r.result.audit.is_photograph}`);
			md.push(`- is_editorial: ${r.result.audit.is_editorial}`);
			md.push(`- no_diagram_or_infographic: ${r.result.audit.no_diagram_or_infographic}`);
			md.push(`- no_screenshot_or_ui: ${r.result.audit.no_screenshot_or_ui}`);
			md.push(`- contextual_score: ${r.result.audit.contextual_score}/10`);
			md.push(`- critique: ${r.result.audit.one_sentence_critique}\n`);
		}
	}
	writeFileSync(`${OUT_DIR}/_summary.md`, md.join('\n'));
	console.log(`\nSauvegardé : ${OUT_DIR}/_summary.md`);
}

main().catch((e) => {
	console.error('FATAL:', e);
	process.exit(1);
});

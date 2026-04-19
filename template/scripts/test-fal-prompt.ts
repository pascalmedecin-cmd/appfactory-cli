/**
 * Test isolé : nouveau prompt builder fal.ai (pré-passe LLM Sonnet + structure
 * Recraft officielle + style enterprise + safety checker), avec audit Vision
 * Claude Sonnet pour scorer la pertinence de chaque image générée.
 *
 * Usage : npx tsx scripts/test-fal-prompt.ts
 *
 * Sorties :
 * - /tmp/fal-test/<n>-image.<ext>  (image générée téléchargée)
 * - /tmp/fal-test/<n>-prompt.txt   (prompt envoyé à fal.ai)
 * - /tmp/fal-test/<n>-brief.json   (brief LLM intermédiaire)
 * - /tmp/fal-test/<n>-audit.json   (score Vision + raison)
 * - /tmp/fal-test/_summary.md      (récap markdown)
 */

import { config as loadEnv } from 'dotenv';
import { writeFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';

loadEnv({ path: '.env.local' });

const FAL_KEY = (process.env.FAL_KEY ?? '').trim();
const ANTHROPIC_KEY = (process.env.ANTHROPIC_API_KEY ?? '').trim();
// Flux 1.1 Pro Ultra : prompt adherence near-perfect, 2K natif, $0.06/image
const FAL_ENDPOINT = 'https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra';
const OUT_DIR = '/tmp/fal-test';

if (!FAL_KEY) throw new Error('FAL_KEY manquante');
if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY manquante');

const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

// ─── 3 cas de test représentatifs ─────────────────────────────────────────
interface TestCase {
	id: string;
	title: string;
	summary: string;
	segment_lib_inferred?: string; // attendu (informatif)
}

const TEST_CASES: TestCase[] = [
	{
		id: '1-arphybat',
		title: 'Journée ARPhyBat à Lausanne le 28 avril : ponts thermiques, condensation et confort été/hiver',
		summary:
			"L'Association romande de physique du bâtiment organise une journée technique sur les pathologies courantes des bâtiments tertiaires : ponts thermiques mal traités, risque de condensation interstitielle, surchauffe estivale liée aux grandes baies vitrées non protégées. Cible : architectes, bureaux d'études, gestionnaires de patrimoine.",
		segment_lib_inferred: 'confort-thermique'
	},
	{
		id: '2-season-energy',
		title: 'SeasON Energy AG : stockage thermique intersaisonnier à base de soude caustique pour bâtiments',
		summary:
			"Spin-off zurichois proposant une nouvelle technologie de stockage de chaleur intersaisonnier à base de cristallisation de NaOH. Premier pilote installé sur un bâtiment résidentiel à Zurich en 2026. Objectif : réduire la dépendance au gaz pour le chauffage hivernal sans toiture solaire massive.",
		segment_lib_inferred: 'confort-thermique'
	},
	{
		id: '3-films-3m',
		title: 'Films solaires 3M Prestige : données techniques rejet IR et impact sur charges climatisation',
		summary:
			"3M publie une note technique comparant les performances de sa gamme Prestige (films solaires nano-multicouches) face à des verres Low-E classiques. Mesures sur tour de bureaux genevoise : -42% de charges climatisation été, conservation de 70% de transmission lumineuse. Cible : bureaux d'études thermiques, propriétaires immobiliers tertiaires.",
		segment_lib_inferred: 'controle-solaire'
	}
];

// ─── Étape 1 : LLM Sonnet → brief visuel structuré ───────────────────────
interface VisualBrief {
	main_subject: string;       // sujet principal visible (1 phrase)
	foreground_detail: string;  // détail premier plan (1 phrase)
	background: string;         // arrière-plan (1 phrase)
	photographic_style: string; // style photo (lumière, focale, ambiance)
}

async function buildBriefViaLLM(testCase: TestCase): Promise<VisualBrief> {
	const systemPrompt = `Tu génères des briefs visuels pour un illustrateur photographe éditorial.

CONTEXTE MÉTIER (non négociable) : FilmPro est un installateur suisse romand de films et vernis pour vitrages de bâtiments tertiaires/résidentiels (contrôle solaire, sécurité, anti-vandalisme, discrétion, esthétique). Toutes les images doivent évoquer cet univers visuel : vitrages, façades vitrées, intérieurs vus à travers des baies vitrées, films/vernis appliqués, matériaux verre + métal + lumière.

ANCRAGE OBLIGATOIRE : la composition DOIT contenir au moins un élément vitrage/baie vitrée/façade en verre, même si le sujet de l'article est abstrait ou technique. Si le sujet ne s'y prête pas directement (ex: technologie de stockage thermique, financement, réglementation), tu utilises une MÉTAPHORE ARCHITECTURALE via le vitrage : façade qui reflète, intérieur tertiaire vu derrière une baie, lumière filtrée par un film, etc.

INTERDITS :
- Tuyauterie industrielle, machines, équipements techniques hors vitrage
- Personnes, visages, mains
- Textes, logos, watermarks
- Style illustration, 3D rendu, dessin : UNIQUEMENT photoréalisme éditorial

Style cible : photographie éditoriale BtoB premium (architecture/Wallpaper/Dezeen), lumière naturelle, composition cinématographique, focale moyenne/longue, profondeur de champ marquée.

CONTRAINTE LONGUEUR (cruciale, fal.ai rejette >1000 chars) :
- Chaque champ : 1 phrase, MAX 25 mots
- Style télégraphique éditorial, pas de subordonnées multiples

Tu réponds UNIQUEMENT avec un JSON valide, sans markdown, format :
{
  "main_subject": "sujet principal, DOIT contenir vitrage/façade/baie (max 25 mots)",
  "foreground_detail": "détail premier plan (max 25 mots)",
  "background": "arrière-plan (max 25 mots)",
  "photographic_style": "lumière + ambiance + technique (max 25 mots)"
}`;

	const userPrompt = `Titre article : ${testCase.title}\n\nRésumé : ${testCase.summary}\n\nGénère le brief visuel JSON.`;

	const response = await anthropic.messages.create({
		model: 'claude-sonnet-4-6',
		max_tokens: 500,
		system: systemPrompt,
		messages: [{ role: 'user', content: userPrompt }]
	});

	const textBlock = response.content.find((b) => b.type === 'text');
	if (!textBlock || textBlock.type !== 'text') throw new Error('Pas de réponse texte LLM');

	// Parser JSON (peut être enveloppé dans markdown malgré l'instruction)
	let jsonStr = textBlock.text.trim();
	if (jsonStr.startsWith('```')) {
		jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
	}
	const brief = JSON.parse(jsonStr) as VisualBrief;
	return brief;
}

// ─── Étape 2 : Construction prompt Recraft (structure officielle) ────────
function buildRecraftPrompt(brief: VisualBrief): string {
	// Pattern officiel Recraft : "An <image style> of <main content>. <detail>. <background>. <style description>."
	const full = [
		`Editorial photograph: ${brief.main_subject}.`,
		`Foreground: ${brief.foreground_detail}.`,
		`Background: ${brief.background}.`,
		`Style: ${brief.photographic_style}.`,
		'No people, no text, no logos, no watermarks.'
	].join(' ');
	// Sécurité : Recraft V3 rejette >1000 chars
	return full.length > 990 ? full.slice(0, 990) : full;
}

// ─── Étape 3 : Appel fal.ai Recraft V3 ───────────────────────────────────
interface FalResult {
	url: string;
	width: number;
	height: number;
}

async function generateViaFal(prompt: string): Promise<FalResult> {
	const submitRes = await fetch(FAL_ENDPOINT, {
		method: 'POST',
		headers: {
			Authorization: `Key ${FAL_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			prompt,
			aspect_ratio: '16:9',
			output_format: 'jpeg',
			safety_tolerance: 2, // 1=strict, 6=permissif (défaut 2)
			raw: false // false = legèrement stylisé éditorial, true = brut/photo journalistique
		})
	});

	if (!submitRes.ok) {
		const text = await submitRes.text();
		throw new Error(`submit ${submitRes.status}: ${text.slice(0, 300)}`);
	}
	const submitData = (await submitRes.json()) as {
		request_id?: string;
		status_url?: string;
		response_url?: string;
		images?: Array<{ url: string; width?: number; height?: number }>;
	};

	if (submitData.images?.[0]) {
		const i = submitData.images[0];
		return { url: i.url, width: i.width ?? 0, height: i.height ?? 0 };
	}
	if (!submitData.request_id) throw new Error('no request_id');

	const statusUrl =
		submitData.status_url ?? `${FAL_ENDPOINT}/requests/${submitData.request_id}/status`;
	const resultUrl =
		submitData.response_url ?? `${FAL_ENDPOINT}/requests/${submitData.request_id}`;

	for (let i = 0; i < 90; i++) {
		await new Promise((r) => setTimeout(r, 2000));
		const sRes = await fetch(statusUrl, {
			headers: { Authorization: `Key ${FAL_KEY}` }
		});
		if (!sRes.ok) continue;
		const s = (await sRes.json()) as { status?: string; error?: string };
		if (s.status === 'COMPLETED') {
			const rRes = await fetch(resultUrl, {
				headers: { Authorization: `Key ${FAL_KEY}` }
			});
			const r = (await rRes.json()) as {
				images?: Array<{ url: string; width?: number; height?: number }>;
			};
			if (!r.images?.[0]) {
				console.error('  [debug] result payload:', JSON.stringify(r).slice(0, 500));
				throw new Error('no image in result');
			}
			return {
				url: r.images[0].url,
				width: r.images[0].width ?? 0,
				height: r.images[0].height ?? 0
			};
		}
		if (s.status === 'FAILED' || s.status === 'CANCELLED') {
			throw new Error(`fal status ${s.status}: ${s.error ?? ''}`);
		}
	}
	throw new Error('poll timeout');
}

// ─── Étape 4 : Téléchargement local ──────────────────────────────────────
async function downloadImage(url: string, outPath: string): Promise<void> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`download ${res.status}`);
	const buf = Buffer.from(new Uint8Array(await res.arrayBuffer()));
	writeFileSync(outPath, buf);
}

// ─── Étape 5 : Audit Vision Claude Sonnet ────────────────────────────────
interface VisionAudit {
	relevance_score: number; // 0-10 (pertinence visuelle vs titre)
	quality_score: number;   // 0-10 (qualité photo : composition, lumière, netteté)
	rule_compliance: {
		no_people: boolean;
		no_text: boolean;
		no_logos: boolean;
		photo_realistic: boolean;
	};
	one_sentence_critique: string;
}

async function auditViaVision(
	imageUrl: string,
	testCase: TestCase
): Promise<VisionAudit> {
	const systemPrompt = `Tu es un directeur artistique évaluant des images d'illustration de presse pour le secteur "films et vernis vitrages bâtiments" (FilmPro, Suisse romande).

Tu réponds UNIQUEMENT avec un JSON valide, sans markdown, format strict :
{
  "relevance_score": 0-10 (pertinence visuelle vs titre/résumé article),
  "quality_score": 0-10 (qualité photo : composition, lumière, netteté, professionnalisme),
  "rule_compliance": {
    "no_people": true/false (aucune personne ni visage visible),
    "no_text": true/false (aucun texte/typographie visible),
    "no_logos": true/false (aucun logo, marque, watermark),
    "photo_realistic": true/false (style photoréaliste, pas illustration ni 3D rendu)
  },
  "one_sentence_critique": "1 phrase factuelle décrivant ce qu'on voit + verdict pertinence"
}`;

	const userPrompt = `Article :
Titre : ${testCase.title}
Résumé : ${testCase.summary}

Évalue l'image ci-dessous selon les critères du système.`;

	const response = await anthropic.messages.create({
		model: 'claude-sonnet-4-6',
		max_tokens: 800,
		system: systemPrompt,
		messages: [
			{
				role: 'user',
				content: [
					{ type: 'image', source: { type: 'url', url: imageUrl } },
					{ type: 'text', text: userPrompt }
				]
			}
		]
	});

	const textBlock = response.content.find((b) => b.type === 'text');
	if (!textBlock || textBlock.type !== 'text') throw new Error('Pas de réponse Vision');
	let jsonStr = textBlock.text.trim();
	if (jsonStr.startsWith('```')) {
		jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
	}
	return JSON.parse(jsonStr) as VisionAudit;
}

// ─── Pipeline test ───────────────────────────────────────────────────────
async function runOneTest(testCase: TestCase) {
	console.log(`\n=== ${testCase.id} ===`);
	console.log(`Title: ${testCase.title.slice(0, 70)}...`);

	console.log('  [1/4] LLM brief...');
	const brief = await buildBriefViaLLM(testCase);
	writeFileSync(`${OUT_DIR}/${testCase.id}-brief.json`, JSON.stringify(brief, null, 2));

	const prompt = buildRecraftPrompt(brief);
	writeFileSync(`${OUT_DIR}/${testCase.id}-prompt.txt`, prompt);
	console.log(`  [2/4] Prompt construit (${prompt.length} chars)`);

	console.log('  [3/4] fal.ai génération...');
	const t0 = Date.now();
	const fal = await generateViaFal(prompt);
	console.log(`        OK (${fal.width}×${fal.height}, ${Math.round((Date.now() - t0) / 1000)}s)`);

	const ext = fal.url.split('.').pop()?.split('?')[0] ?? 'jpg';
	const localPath = `${OUT_DIR}/${testCase.id}-image.${ext}`;
	await downloadImage(fal.url, localPath);
	console.log(`        Sauvegardé : ${localPath}`);

	console.log('  [4/4] Audit Vision...');
	const audit = await auditViaVision(fal.url, testCase);
	writeFileSync(`${OUT_DIR}/${testCase.id}-audit.json`, JSON.stringify(audit, null, 2));

	return { testCase, brief, prompt, fal, audit, localPath };
}

async function main() {
	const results = [];
	for (const tc of TEST_CASES) {
		try {
			const r = await runOneTest(tc);
			results.push(r);
		} catch (e) {
			console.error(`  ERREUR ${tc.id}:`, e);
			results.push({ testCase: tc, error: String(e) });
		}
	}

	// Récap markdown
	const md = ['# Test prompt fal.ai v2 : récap\n'];
	for (const r of results) {
		md.push(`## ${r.testCase.id}\n`);
		md.push(`**Titre** : ${r.testCase.title}\n`);
		if ('error' in r) {
			md.push(`**ERREUR** : ${r.error}\n`);
			continue;
		}
		md.push(`**Brief LLM** :`);
		md.push('```json');
		md.push(JSON.stringify(r.brief, null, 2));
		md.push('```');
		md.push(`**Prompt fal.ai** :`);
		md.push('```');
		md.push(r.prompt);
		md.push('```');
		md.push(`**Image** : \`${r.localPath}\` (${r.fal.width}×${r.fal.height})`);
		md.push(`**URL fal CDN** : ${r.fal.url}`);
		md.push(`**Audit Vision** :`);
		md.push(`- Pertinence : **${r.audit.relevance_score}/10**`);
		md.push(`- Qualité photo : **${r.audit.quality_score}/10**`);
		md.push(`- Règles : people=${r.audit.rule_compliance.no_people} text=${r.audit.rule_compliance.no_text} logos=${r.audit.rule_compliance.no_logos} realistic=${r.audit.rule_compliance.photo_realistic}`);
		md.push(`- Critique : ${r.audit.one_sentence_critique}\n`);
	}
	writeFileSync(`${OUT_DIR}/_summary.md`, md.join('\n'));
	console.log(`\n=== Récap ===`);
	console.log(`Sauvegardé : ${OUT_DIR}/_summary.md`);
}

main().catch((e) => {
	console.error('FATAL:', e);
	process.exit(1);
});

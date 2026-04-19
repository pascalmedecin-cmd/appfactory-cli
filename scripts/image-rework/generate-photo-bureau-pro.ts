/**
 * Photo 1 (v2 approche) : génération from scratch via Nano Banana Pro.
 *
 * Modèle : fal-ai/nano-banana-pro (Gemini 3 Pro Image)
 * Prix   : $0.15 / image en 2K
 *
 * Objectif : exprimer la problématique « surexposition solaire dans un bureau »
 * avec UN seul soleil, ambiance golden hour marquée, éditorial photoréaliste.
 *
 * Exécution : npx tsx scripts/image-rework/generate-photo-bureau-pro.ts
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../..');
const ENV_FILE = resolve(PROJECT_ROOT, 'template/.env.local');
const OUTPUT_DIR = resolve(__dirname, 'output');

const ENDPOINT = 'https://queue.fal.run/fal-ai/nano-banana-pro';
const PRICE_USD = 0.15;
const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_ATTEMPTS = 180; // Nano Banana Pro peut être plus lent que Flash

const PROMPT = [
	'Professional ULTRA-REALISTIC editorial photograph of a real-world modern open-plan office captured at DEEP GOLDEN HOUR.',
	'Rich warm amber and orange tones saturate every surface.',
	'Exactly ONE sun visible low on the horizon through the floor-to-ceiling glass windows.',
	'Wide-angle DIAGONAL camera perspective from near the entrance, looking across rows of contemporary workstations aligned perpendicular to the window wall.',
	'Strong leading lines recede toward the back of the room.',
	'Realistic, lived-in working environments : NOT futuristic, NOT sci-fi, NOT a designer showroom. Just a real modern office that an actual company would use today: standard contemporary workstations with metal legs and matte white or light wood tops, ergonomic mesh task chairs in dark grey/black, dual large monitors with subtle on-screen content visible (dashboards, documents, design files), keyboards, mice, laptop docks, monitor arms, headphones on stands, small potted plants, open notebooks, water bottles, framed minimalist art on walls, cable management trays. Everything looks plausible, used, authentic.',
	'The space feels uncomfortably bright and overexposed : the problem that solar window film solves.',
	'Swiss contemporary aesthetic: discreet high-quality materials, understated design, subtle Zurich or Geneva feel (no cliché mountain, flag, or chalet references).',
	'Urban skyline faintly visible through the windows in soft backlight.',
	'High-end architectural editorial photography, intense golden-hour color grading, photorealistic, 16:9 landscape.',
	'No people. No text. No logos. No watermarks.'
].join(' ');

function loadFalKey(): string {
	const content = readFileSync(ENV_FILE, 'utf-8');
	const match = content.match(/^FAL_KEY="?([^"\n]+)"?/m);
	if (!match) throw new Error('FAL_KEY introuvable dans template/.env.local');
	return match[1].trim();
}

function nextVersion(): number {
	if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
	const files = readdirSync(OUTPUT_DIR).filter((f) => f.startsWith('photo1-pro-v'));
	const versions = files
		.map((f) => Number.parseInt(f.match(/^photo1-pro-v(\d+)/)?.[1] ?? '0', 10))
		.filter((n) => Number.isFinite(n));
	return versions.length === 0 ? 1 : Math.max(...versions) + 1;
}

function imageToDataUrl(path: string): string {
	const buf = readFileSync(path);
	const ext = path.toLowerCase().split('.').pop() ?? 'jpeg';
	const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
	return `data:${mime};base64,${buf.toString('base64')}`;
}

async function submitGenerate(apiKey: string): Promise<string> {
	const res = await fetch(ENDPOINT, {
		method: 'POST',
		headers: {
			Authorization: `Key ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			prompt: PROMPT,
			num_images: 1,
			aspect_ratio: '16:9',
			resolution: '2K',
			output_format: 'png'
		})
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`submit HTTP ${res.status}: ${text.slice(0, 300)}`);
	}
	const data = (await res.json()) as {
		request_id?: string;
		status_url?: string;
		response_url?: string;
		images?: Array<{ url: string }>;
	};
	if (data.images?.[0]?.url) return data.images[0].url;
	if (!data.request_id) throw new Error(`no request_id: ${JSON.stringify(data).slice(0, 300)}`);

	const statusUrl = data.status_url ?? `${ENDPOINT}/requests/${data.request_id}/status`;
	const resultUrl = data.response_url ?? `${ENDPOINT}/requests/${data.request_id}`;

	for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
		await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
		const sres = await fetch(statusUrl, { headers: { Authorization: `Key ${apiKey}` } });
		if (!sres.ok) continue;
		const sdata = (await sres.json()) as { status?: string; error?: string };
		process.stdout.write(`\r  polling [${attempt + 1}/${MAX_POLL_ATTEMPTS}] status=${sdata.status ?? '?'}   `);
		if (sdata.status === 'COMPLETED') {
			process.stdout.write('\n');
			const rres = await fetch(resultUrl, { headers: { Authorization: `Key ${apiKey}` } });
			if (!rres.ok) throw new Error(`result HTTP ${rres.status}`);
			const rdata = (await rres.json()) as { images?: Array<{ url: string }> };
			const url = rdata.images?.[0]?.url;
			if (!url) throw new Error('no image in completed result');
			return url;
		}
		if (sdata.status === 'FAILED' || sdata.status === 'CANCELLED') {
			throw new Error(`fal status ${sdata.status}: ${sdata.error ?? ''}`);
		}
	}
	throw new Error('poll timeout (6 min)');
}

async function downloadImage(url: string, dest: string): Promise<void> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`download HTTP ${res.status}`);
	const buf = Buffer.from(await res.arrayBuffer());
	writeFileSync(dest, buf);
}

function generatePreviewHtml(opts: {
	version: number;
	resultPath: string;
	prompt: string;
	priceUsd: number;
	durationMs: number;
}): string {
	const resDataUrl = imageToDataUrl(opts.resultPath);
	const duration = (opts.durationMs / 1000).toFixed(1);
	return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Photo 1 Pro : v${opts.version}, Bureau surexposition</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px; line-height: 1.5; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color: #94a3b8; font-size: 13px; margin-bottom: 20px; }
  .meta strong { color: #cbd5e1; }
  .panel { background: #1e293b; border-radius: 10px; padding: 12px; margin-bottom: 20px; }
  .panel h2 { font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .panel img { width: 100%; height: auto; border-radius: 6px; display: block; max-width: 1400px; margin: 0 auto; }
  .prompt { background: #1e293b; border-radius: 10px; padding: 16px; font-family: ui-monospace, Menlo, monospace; font-size: 12px; white-space: pre-wrap; color: #cbd5e1; margin-bottom: 16px; }
  .prompt h2 { font-family: -apple-system, system-ui, sans-serif; font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; font-weight: 600; }
  .cta { background: #134e4a; border: 1px solid #14b8a6; border-radius: 10px; padding: 16px; color: #ccfbf1; font-size: 14px; }
  .cta strong { color: #5eead4; }
  code { background: #0f172a; padding: 2px 6px; border-radius: 4px; color: #e2e8f0; }
</style>
</head>
<body>
  <h1>Photo 1 Pro : Bureau surexposition solaire, version ${opts.version}</h1>
  <p class="meta">
    Modèle : <strong>Nano Banana Pro (Gemini 3 Pro Image) · 2K 16:9</strong> ·
    Coût : <strong>$${opts.priceUsd.toFixed(2)}</strong> ·
    Durée : <strong>${duration}s</strong> ·
    Fichier : <code>scripts/image-rework/output/photo1-pro-v${opts.version}.png</code>
  </p>

  <div class="panel">
    <h2>Résultat v${opts.version}</h2>
    <img src="${resDataUrl}" alt="résultat">
  </div>

  <div class="prompt">
    <h2>Prompt utilisé</h2>${opts.prompt}
  </div>

  <div class="cta">
    <strong>Prochaine étape.</strong> Retour dans le terminal : dis <code>valide v${opts.version}</code> ou décris ce qui ne va pas pour un prompt ajusté (je ne régénère qu'après ton feu vert).
  </div>
</body>
</html>`;
}

async function main() {
	console.log('→ Photo 1 Pro : génération bureau surexposition (Nano Banana Pro, 2K)');

	const apiKey = loadFalKey();
	console.log('  FAL_KEY chargée');

	const version = nextVersion();
	console.log(`  version cible : v${version}`);

	console.log('  envoi à fal.ai (Nano Banana Pro)...');
	const t0 = Date.now();
	const resultUrl = await submitGenerate(apiKey);
	const durationMs = Date.now() - t0;
	console.log(`  image reçue (${(durationMs / 1000).toFixed(1)}s)`);

	const outPath = resolve(OUTPUT_DIR, `photo1-pro-v${version}.png`);
	await downloadImage(resultUrl, outPath);
	console.log(`  sauvegardée : ${outPath}`);

	const htmlPath = resolve(OUTPUT_DIR, `photo1-pro-v${version}.html`);
	const html = generatePreviewHtml({
		version,
		resultPath: outPath,
		prompt: PROMPT,
		priceUsd: PRICE_USD,
		durationMs
	});
	writeFileSync(htmlPath, html);
	console.log(`  preview HTML : ${htmlPath}`);

	execSync(`open "${htmlPath}"`);
	console.log('  preview ouverte dans le navigateur.');
	console.log(`\n✓ v${version} prête. Coût : $${PRICE_USD.toFixed(2)}. Attends validation Pascal.`);
}

main().catch((err) => {
	console.error('\n✗ échec :', err.message ?? err);
	process.exit(1);
});

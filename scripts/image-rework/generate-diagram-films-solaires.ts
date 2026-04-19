/**
 * Photo 2 : diagramme films solaires moderne (génération + future remove-bg).
 *
 * Étape 1 (ce script) : génération via Nano Banana Pro (text-to-image, fond blanc).
 * Étape 2 (script séparé après validation Pascal) : remove-bg via fal-ai/bria.
 *
 * Modèle : fal-ai/nano-banana-pro
 * Prix   : $0.15 / image en 2K
 *
 * Exécution : npx tsx scripts/image-rework/generate-diagram-films-solaires.ts
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
const MAX_POLL_ATTEMPTS = 180;

const PROMPT = [
	'Modern flat infographic illustration explaining how solar window film works on a building glass facade. Pure white plain background (will be removed to transparent afterwards).',
	'LEFT: stylized warm yellow sun in upper-left area, the sun must be ENTIRELY visible inside the frame (do not crop, do not let any part touch the image edge). Two single arrows emanate from the sun toward the right: ONE single bold red-orange arrow labeled "Rayons infrarouges (chaleur)", and ONE single bold violet/purple arrow labeled "Rayons UV".',
	'CENTER: clean side cross-section of a modern double-glazed window with a thin transparent solar film visible between the two glass panes (subtle blue-grey tint).',
	'Both arrows (IR and UV) hit the OUTER glass surface at the same angle and clearly REFLECT back outward at symmetrical mirror angles (one curved red-orange arrow rebound, one curved violet arrow rebound). A small red X mark sits on each impact point indicating blockage.',
	'Only neutral visible light passes through to the right (a few thin pale yellow horizontal lines labeled "Lumière visible").',
	'A thin annotation leader line points DIRECTLY to the GLASS PANE itself (NOT to the window frame, NOT to the structure) with the label "Film/Vernis solaire".',
	'RIGHT: small modern wall thermostat displaying "22°C" with a green indicator, and a small modern air conditioner unit with subtle "réduit" badge. Tiny label "Confort sans climatisation excessive".',
	'Style: clean modern flat illustration with subtle soft shadows, infographic look, professional editorial quality, technical diagram for a Swiss solar film company website. Palette: warm yellow sun, red-orange IR, violet UV, light blue-silver glass and film, cool neutral greys for thermostat and AC, dark grey text.',
	'16:9 aspect ratio. Pure plain white background. Labels in French only. No people. No watermark.'
].join(' ');

function loadFalKey(): string {
	const content = readFileSync(ENV_FILE, 'utf-8');
	const match = content.match(/^FAL_KEY="?([^"\n]+)"?/m);
	if (!match) throw new Error('FAL_KEY introuvable dans template/.env.local');
	return match[1].trim();
}

function nextVersion(): number {
	if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
	const files = readdirSync(OUTPUT_DIR).filter((f) => f.startsWith('diagram-v'));
	const versions = files
		.map((f) => Number.parseInt(f.match(/^diagram-v(\d+)/)?.[1] ?? '0', 10))
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
<title>Diagramme films solaires : v${opts.version}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px; line-height: 1.5; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color: #94a3b8; font-size: 13px; margin-bottom: 20px; }
  .meta strong { color: #cbd5e1; }
  .panel { background: #1e293b; border-radius: 10px; padding: 12px; margin-bottom: 20px; }
  .panel h2 { font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .panel img { width: 100%; height: auto; border-radius: 6px; display: block; max-width: 1400px; margin: 0 auto; background: #fff; }
  .prompt { background: #1e293b; border-radius: 10px; padding: 16px; font-family: ui-monospace, Menlo, monospace; font-size: 12px; white-space: pre-wrap; color: #cbd5e1; margin-bottom: 16px; }
  .prompt h2 { font-family: -apple-system, system-ui, sans-serif; font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; font-weight: 600; }
  .cta { background: #134e4a; border: 1px solid #14b8a6; border-radius: 10px; padding: 16px; color: #ccfbf1; font-size: 14px; }
  .cta strong { color: #5eead4; }
  code { background: #0f172a; padding: 2px 6px; border-radius: 4px; color: #e2e8f0; }
</style>
</head>
<body>
  <h1>Diagramme films solaires : version ${opts.version}</h1>
  <p class="meta">
    Modèle : <strong>Nano Banana Pro (Gemini 3 Pro Image) · 2K 16:9</strong> ·
    Coût : <strong>$${opts.priceUsd.toFixed(2)}</strong> ·
    Durée : <strong>${duration}s</strong> ·
    Fichier : <code>scripts/image-rework/output/diagram-v${opts.version}.png</code>
  </p>

  <div class="panel">
    <h2>Résultat v${opts.version} (fond blanc, à détourer après validation)</h2>
    <img src="${resDataUrl}" alt="diagramme">
  </div>

  <div class="prompt">
    <h2>Prompt utilisé</h2>${opts.prompt}
  </div>

  <div class="cta">
    <strong>Prochaine étape.</strong> Si le rendu est bon → je lance remove-bg ($0.02) et je te livre le PNG transparent. Sinon → décris ce qui ne va pas pour un prompt ajusté.
  </div>
</body>
</html>`;
}

async function main() {
	console.log('→ Diagramme films solaires (Nano Banana Pro, 2K, fond blanc)');

	const apiKey = loadFalKey();
	console.log('  FAL_KEY chargée');

	const version = nextVersion();
	console.log(`  version cible : v${version}`);

	console.log('  envoi à fal.ai (Nano Banana Pro)...');
	const t0 = Date.now();
	const resultUrl = await submitGenerate(apiKey);
	const durationMs = Date.now() - t0;
	console.log(`  image reçue (${(durationMs / 1000).toFixed(1)}s)`);

	const outPath = resolve(OUTPUT_DIR, `diagram-v${version}.png`);
	await downloadImage(resultUrl, outPath);
	console.log(`  sauvegardée : ${outPath}`);

	const htmlPath = resolve(OUTPUT_DIR, `diagram-v${version}.html`);
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

/**
 * Génération d'images via fal.ai (Recraft V3) pour items Veille.
 *
 * Use case : pipeline cron intelligence — quand l'og:image source n'est pas
 * fiable (logo/placeholder/404) ET le fallback media_library pas pertinent
 * (segment lib inféré vide), on génère une image custom via fal.ai puis on
 * la stocke dans media_library (source='fal-ai') pour réutilisation future.
 *
 * Coût : ~0.04 USD / image. Volume max : 5-9 items/semaine = ~0.36 USD/sem.
 *
 * Pattern queue : POST → request_id → poll status_url → GET response_url.
 */

const ENDPOINT = 'https://queue.fal.run/fal-ai/recraft/v3/text-to-image';
const SUBMIT_TIMEOUT_MS = 30_000;
const POLL_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_ATTEMPTS = 90; // ~3 min max

const SAFETY_TOLERANCE = 3;
const OUTPUT_FORMAT = 'jpeg';
const STYLE = 'realistic_image';
const IMAGE_SIZE = 'landscape_16_9';

const PROMPT_SUFFIX =
	', shot on Phase One IQ4 150MP, natural lighting, sharp focus, high dynamic range, no text, no logos, no watermarks, no people, no faces';

export interface FalGenerateInput {
	prompt: string;
	apiKey: string;
}

export interface FalGenerateResult {
	ok: boolean;
	url?: string;
	width?: number;
	height?: number;
	reason?: string;
}

interface FalSubmitResponse {
	request_id?: string;
	status_url?: string;
	response_url?: string;
	images?: Array<{ url: string; width?: number; height?: number }>;
}

interface FalStatusResponse {
	status?: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
	error?: string;
}

interface FalResultResponse {
	images?: Array<{ url: string; width?: number; height?: number }>;
	error?: string;
}

function fetchJsonWithTimeout(
	url: string,
	init: RequestInit,
	timeoutMs: number
): Promise<Response> {
	const controller = new AbortController();
	const t = setTimeout(() => controller.abort(), timeoutMs);
	return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(t));
}

/**
 * Lance la génération via fal.ai. Polling intégré.
 * Retourne l'URL temporaire (cdn.fal.media) de l'image générée.
 */
export async function generateImageViaFal(
	input: FalGenerateInput
): Promise<FalGenerateResult> {
	const headers = {
		Authorization: `Key ${input.apiKey}`,
		'Content-Type': 'application/json'
	};

	const fullPrompt = `${input.prompt}${PROMPT_SUFFIX}`;

	const body = JSON.stringify({
		prompt: fullPrompt,
		image_size: IMAGE_SIZE,
		style: STYLE,
		output_format: OUTPUT_FORMAT,
		safety_tolerance: SAFETY_TOLERANCE
	});

	let submitData: FalSubmitResponse;
	try {
		const submitRes = await fetchJsonWithTimeout(
			ENDPOINT,
			{ method: 'POST', headers, body },
			SUBMIT_TIMEOUT_MS
		);
		if (!submitRes.ok) {
			const text = await submitRes.text();
			return { ok: false, reason: `submit http ${submitRes.status}: ${text.slice(0, 200)}` };
		}
		submitData = (await submitRes.json()) as FalSubmitResponse;
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return { ok: false, reason: `submit error: ${msg}` };
	}

	// Réponse synchrone (rare) : images directes
	if (submitData.images && submitData.images[0]) {
		const img = submitData.images[0];
		return { ok: true, url: img.url, width: img.width, height: img.height };
	}

	if (!submitData.request_id) {
		return { ok: false, reason: 'no request_id and no images' };
	}

	const statusUrl =
		submitData.status_url ?? `${ENDPOINT}/requests/${submitData.request_id}/status`;
	const resultUrl =
		submitData.response_url ?? `${ENDPOINT}/requests/${submitData.request_id}`;

	for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
		await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

		let statusData: FalStatusResponse;
		try {
			const statusRes = await fetchJsonWithTimeout(
				statusUrl,
				{ method: 'GET', headers: { Authorization: headers.Authorization } },
				POLL_TIMEOUT_MS
			);
			if (!statusRes.ok) continue;
			statusData = (await statusRes.json()) as FalStatusResponse;
		} catch {
			continue;
		}

		if (statusData.status === 'COMPLETED') {
			try {
				const resultRes = await fetchJsonWithTimeout(
					resultUrl,
					{ method: 'GET', headers: { Authorization: headers.Authorization } },
					POLL_TIMEOUT_MS
				);
				if (!resultRes.ok) {
					return { ok: false, reason: `result http ${resultRes.status}` };
				}
				const resultData = (await resultRes.json()) as FalResultResponse;
				const img = resultData.images?.[0];
				if (!img) return { ok: false, reason: 'no images in completed result' };
				return { ok: true, url: img.url, width: img.width, height: img.height };
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				return { ok: false, reason: `result fetch error: ${msg}` };
			}
		}

		if (statusData.status === 'FAILED' || statusData.status === 'CANCELLED') {
			return { ok: false, reason: `fal status: ${statusData.status} - ${statusData.error ?? ''}` };
		}
	}

	return { ok: false, reason: 'poll timeout' };
}

/**
 * Construit un prompt fal.ai depuis le titre/segment d'un item Veille.
 * Le prompt est éditorial/photoréaliste, focus matériaux et architecture
 * (cohérent avec le métier FilmPro : films vitrages bâtiments).
 */
const SEGMENT_PROMPT_HINTS: Record<string, string> = {
	securite:
		'modern commercial glass facade with subtle security film overlay, urban setting, dusk',
	'confort-thermique':
		'modern office interior with large windows, natural light filtered, neutral palette',
	'controle-solaire':
		'modern building exterior with sun-control glass facade, bright daylight, architectural detail',
	esthetique:
		'minimalist architectural detail of glass and metal facade, refined materials',
	discretion:
		'modern office meeting room with frosted privacy glass partition, soft daylight',
	confidentialite:
		'corporate meeting room interior with privacy glass walls, contemporary design',
	facade:
		'modern high-rise office building facade, glass and steel, architectural photography',
	'pourquoi-filmpro':
		'professional installation detail of architectural window film, hands and tools, editorial style',
	'a-propos':
		'modern commercial building entrance with reflective glass facade, daylight',
	partenaires:
		'corporate architectural detail, glass facade, professional editorial photography',
	accueil:
		'modern building entrance lobby with floor-to-ceiling glass facade, daylight'
};

export function buildFalPromptFromItem(input: {
	title: string;
	segment?: string | null;
}): string {
	const hint = input.segment ? SEGMENT_PROMPT_HINTS[input.segment] : null;
	const base =
		hint ??
		'modern architectural glass facade detail, editorial photography, daylight, neutral palette';
	// On garde le titre comme contexte sémantique mais on privilégie le hint visuel.
	// Le titre seul mène à des compositions trop littérales/textuelles.
	return `Cinematic photorealistic editorial photograph, ${base}, contextual subject: ${input.title.slice(0, 120)}`;
}

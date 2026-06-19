import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
	crossCheckBatch,
	fetchPageContent,
	htmlToPlainText
} from './cross-check';
import type { IntelligenceItem } from './schema';

// Mock @anthropic-ai/sdk : on intercepte le constructeur et messages.create.
const __mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
	class MockAnthropic {
		messages = { create: __mockCreate };
		constructor(_opts: unknown) {
			void _opts;
		}
	}
	return { default: MockAnthropic };
});

// Helper pour stub fetch global.
beforeEach(() => {
	vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

const baseItem: IntelligenceItem = {
	rank: 1,
	theme: 'films_solaires',
	title: 'Test article',
	source: {
		url: 'https://example.com/article',
		name: 'Example',
		published_at: '2026-04-27T00:00:00Z'
	},
	segment: 'tertiaire',
	summary:
		'Le marché des films de fenêtre est estimé à 2,88 milliards USD en 2026 et projeté à 3,94 milliards USD en 2031.',
	maturity: 'speculatif',
	deep_dive: null,
	geo_scope: 'monde',
	is_update: false,
	search_terms: [
		{ kind: 'simap', label: 'SIMAP VD · test', query: 'test', canton: 'VD' },
		{ kind: 'simap', label: 'SIMAP GE · test 2', query: 'test 2', canton: 'GE' }
	],
	actionability: 'veille_active',
	filmpro_relevance: 'Test relevance pour le segment tertiaire suisse romand.'
};

describe('htmlToPlainText', () => {
	it('retire scripts, styles, balises et normalise les espaces', () => {
		const html = `
			<html>
				<head><style>body { color: red; }</style></head>
				<body>
					<script>alert(1)</script>
					<p>Le marché atteint <strong>2,88 milliards USD</strong> en 2026.</p>
				</body>
			</html>`;
		const text = htmlToPlainText(html);
		expect(text).toContain('2,88 milliards USD');
		expect(text).not.toContain('<script>');
		expect(text).not.toContain('alert(1)');
		expect(text).not.toContain('color: red');
	});

	it('décode quelques entités HTML basiques', () => {
		const text = htmlToPlainText('<p>Il&nbsp;fait 30&deg;C &amp; pluie</p>');
		expect(text).toContain('Il fait');
		expect(text).toContain('&');
	});
});

describe('fetchPageContent', () => {
	it('retourne null si fetch échoue', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('boom'));
		const r = await fetchPageContent('https://example.com/article');
		expect(r).toBeNull();
	});

	it('retourne null si status non-OK', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: false,
			status: 500,
			text: async () => ''
		});
		const r = await fetchPageContent('https://example.com/article');
		expect(r).toBeNull();
	});

	it('retourne le texte si OK', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () => '<html><body>hello</body></html>'
		});
		const r = await fetchPageContent('https://example.com/article');
		expect(r).toContain('hello');
	});

	it('accepte status 206 (partial content via Range)', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: false,
			status: 206,
			text: async () => '<html>partial</html>'
		});
		const r = await fetchPageContent('https://example.com/article');
		expect(r).toContain('partial');
	});
});

describe('crossCheckBatch', () => {
	it('rejette items avec verdict verbatim_ok=false ET divergence fatale', async () => {
		
		const create = __mockCreate;
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () =>
				'<html><body>' + 'L\'article publié le 27 avril 2026 par Mordor Intelligence détaille le marché des films de fenêtre. '.repeat(5) + 'Le marché est évalué à 2,88 milliards USD en 2026, projeté à 3,94 milliards USD en 2031, soit un CAGR de 6,42%. ' + 'Le bâtiment représente 52,12% de part de marché en 2025. '.repeat(5) + '</body></html>'
		});
		create.mockResolvedValueOnce({
			content: [
				{
					type: 'tool_use',
					name: 'emit_verdict',
					input: {
						verbatim_ok: false,
						divergences: [
							{
								quoted: '2,66 milliards USD',
								found: '2,88 milliards USD',
								severity: 'fatal'
							}
						],
						confidence: 'high'
					}
				}
			],
			usage: { input_tokens: 100, output_tokens: 50 }
		});
		const itemHallu = {
			...baseItem,
			summary: 'Le marché atteint 2,66 milliards USD en 2026 et 3,62 milliards en 2031.'
		};
		const r = await crossCheckBatch([itemHallu], { anthropicApiKey: 'sk-test' });
		expect(r.kept).toHaveLength(0);
		expect(r.rejected).toHaveLength(1);
		expect(r.rejected[0].verdict.divergences[0].severity).toBe('fatal');
	});

	it('garde items avec verbatim_ok=true', async () => {
		
		const create = __mockCreate;
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () =>
				'<html><body>' +
				'Le marché des films de fenêtre est détaillé dans ce rapport long. '.repeat(5) +
				'2,88 milliards USD en 2026, projeté à 3,94 milliards USD en 2031, CAGR 6,42 pourcent. ' +
				'Bâtiment et construction représentent 52,12 pourcent. '.repeat(3) +
				'</body></html>'
		});
		create.mockResolvedValueOnce({
			content: [
				{
					type: 'tool_use',
					name: 'emit_verdict',
					input: { verbatim_ok: true, divergences: [], confidence: 'high' }
				}
			],
			usage: { input_tokens: 100, output_tokens: 30 }
		});
		const r = await crossCheckBatch([baseItem], { anthropicApiKey: 'sk-test' });
		expect(r.kept).toHaveLength(1);
		expect(r.rejected).toHaveLength(0);
	});

	it("rejette items avec verbatim_ok=false même si divergences seulement minor (audit 360 H-04)", async () => {
		const create = __mockCreate;
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () =>
				'<html><body>' +
				'Article réel sans chiffres précis dont le contenu est suffisamment long pour passer le seuil minimal du cross-check. '.repeat(
					5
				) +
				'</body></html>'
		});
		create.mockResolvedValueOnce({
			content: [
				{
					type: 'tool_use',
					name: 'emit_verdict',
					input: {
						verbatim_ok: false,
						divergences: [
							{
								quoted: 'reformulation enrichie',
								found: 'paraphrase originale',
								severity: 'minor'
							}
						],
						confidence: 'medium'
					}
				}
			],
			usage: { input_tokens: 100, output_tokens: 50 }
		});
		const r = await crossCheckBatch([baseItem], { anthropicApiKey: 'sk-test' });
		expect(r.rejected).toHaveLength(1);
		expect(r.kept).toHaveLength(0);
	});

	it("rejette items avec verbatim_ok=false ET divergences vides (audit 360 H-04 brèche zéro hallu)", async () => {
		const create = __mockCreate;
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () =>
				'<html><body>' +
				'Article réel sans chiffres précis dont le contenu est suffisamment long pour passer le seuil minimal du cross-check. '.repeat(
					5
				) +
				'</body></html>'
		});
		create.mockResolvedValueOnce({
			content: [
				{
					type: 'tool_use',
					name: 'emit_verdict',
					input: {
						verbatim_ok: false,
						divergences: [],
						confidence: 'low'
					}
				}
			],
			usage: { input_tokens: 100, output_tokens: 30 }
		});
		const r = await crossCheckBatch([baseItem], { anthropicApiKey: 'sk-test' });
		expect(r.rejected).toHaveLength(1);
		expect(r.kept).toHaveLength(0);
	});

	it('item dont la page ne fetch pas → unverifiable (pas rejeté par défaut)', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: false,
			status: 500,
			text: async () => ''
		});
		const r = await crossCheckBatch([baseItem], { anthropicApiKey: 'sk-test' });
		expect(r.unverifiable).toHaveLength(1);
		expect(r.kept).toHaveLength(0);
		expect(r.rejected).toHaveLength(0);
	});

	it("rejectUnfetchable=true → unverifiable devient rejected", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: false,
			status: 500,
			text: async () => ''
		});
		const r = await crossCheckBatch([baseItem], {
			anthropicApiKey: 'sk-test',
			rejectUnfetchable: true
		});
		expect(r.rejected).toHaveLength(1);
		expect(r.unverifiable).toHaveLength(0);
	});

	it('liste vide → résultat vide sans appel SDK', async () => {
		const r = await crossCheckBatch([], { anthropicApiKey: 'sk-test' });
		expect(r.kept).toHaveLength(0);
		expect(r.rejected).toHaveLength(0);
		expect(r.unverifiable).toHaveLength(0);
	});

	it("garde SSRF : item URL privée ne fetch jamais → unverifiable", async () => {
		const itemSSRF = {
			...baseItem,
			source: { ...baseItem.source, url: 'http://169.254.169.254/latest/meta-data/' }
		};
		// fetch ne devrait JAMAIS être appelé si la garde fonctionne. Si elle
		// loupe, le mock par défaut retourne undefined → exception côté ok/text.
		const r = await crossCheckBatch([itemSSRF], { anthropicApiKey: 'sk-test' });
		expect(r.unverifiable).toHaveLength(1);
		expect(global.fetch).not.toHaveBeenCalled();
	});

	// Régression W18 audit 2026-05-06 : 2 patterns de paraphrase imprécise
	// laissés passer par le cross-check S168 (severity=minor au lieu de fatal).
	// Ces tests valident que le LLM, instruit par les nouvelles règles du SYSTEM
	// prompt, classe désormais ces 2 patterns comme `fatal` → item rejeté.
	it("rejette extension d'énumération comme fatal (W18 item 1 régression)", async () => {
		const create = __mockCreate;
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () =>
				'<html><body>' +
				'Programme Bâtiments 2026 : isolation thermique soutenue, en particulier sur les façades, toitures et sols. '.repeat(
					3
				) +
				'</body></html>'
		});
		// Item dont le résumé étend la liste : ajoute « fenêtres » non présente
		// + supprime « façades » et « sols » de la page → fatal selon nouvelles règles.
		const itemEnum = {
			...baseItem,
			summary:
				'Travaux d\'isolation thermique soutenus, en particulier sur les éléments les plus déperditifs comme les fenêtres et les toitures.'
		};
		create.mockResolvedValueOnce({
			content: [
				{
					type: 'tool_use',
					name: 'emit_verdict',
					input: {
						verbatim_ok: false,
						divergences: [
							{
								quoted: 'fenêtres et les toitures',
								found: 'façades, toitures et sols',
								severity: 'fatal'
							}
						],
						confidence: 'high'
					}
				}
			],
			usage: { input_tokens: 100, output_tokens: 30 }
		});
		const r = await crossCheckBatch([itemEnum], { anthropicApiKey: 'sk-test' });
		expect(r.rejected).toHaveLength(1);
		expect(r.kept).toHaveLength(0);
		expect(r.rejected[0].verdict.divergences[0].severity).toBe('fatal');
	});

	it('rejette traduction technique imprécise comme fatal (W18 item 2 régression)', async () => {
		const create = __mockCreate;
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () =>
				'<html><body>' +
				'Innovation Award 2026 finalists. Gretsch-Unitas presented a Magnetic fixed-sash stop for double-sash units. '.repeat(
					3
				) +
				'</body></html>'
		});
		const itemTrad = {
			...baseItem,
			summary:
				'Finalistes Innovation Award 2026 : Gretsch-Unitas (fixe magnétique sur seuil affleurant) parmi les nominés.'
		};
		create.mockResolvedValueOnce({
			content: [
				{
					type: 'tool_use',
					name: 'emit_verdict',
					input: {
						verbatim_ok: false,
						divergences: [
							{
								quoted: 'fixe magnétique sur seuil affleurant',
								found: 'Magnetic fixed-sash stop for double-sash units',
								severity: 'fatal'
							}
						],
						confidence: 'high'
					}
				}
			],
			usage: { input_tokens: 100, output_tokens: 30 }
		});
		const r = await crossCheckBatch([itemTrad], { anthropicApiKey: 'sk-test' });
		expect(r.rejected).toHaveLength(1);
		expect(r.kept).toHaveLength(0);
		expect(r.rejected[0].verdict.divergences[0].severity).toBe('fatal');
	});

	// --- Bloc 4 (audit 360 racine 2026-06-19) : résilience par-item du second-pass ---

	const longHtml =
		'<html><body>' +
		'Contenu réel suffisamment long pour dépasser le seuil de 200 caractères du cross-check pipeline anti-hallucination. '.repeat(
			4
		) +
		'</body></html>';

	it("une exception API sur UN item ne fait plus échouer tout le batch (résilience par-item)", async () => {
		// item0 : page OK puis verifier lève un 400 (non-retryable) → capturé, pas propagé.
		// item1 : page OK puis verdict OK → gardé. Le batch NE throw PAS.
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => longHtml
		});
		__mockCreate
			.mockRejectedValueOnce(Object.assign(new Error('400 bad request'), { status: 400 }))
			.mockResolvedValueOnce({
				content: [
					{
						type: 'tool_use',
						name: 'emit_verdict',
						input: { verbatim_ok: true, divergences: [], confidence: 'high' }
					}
				],
				usage: { input_tokens: 100, output_tokens: 30 }
			});
		const item0 = { ...baseItem, source: { ...baseItem.source, url: 'https://example.com/a' } };
		const item1 = { ...baseItem, source: { ...baseItem.source, url: 'https://example.com/b' } };
		// concurrency 1 → ordre déterministe (item0 d'abord).
		const r = await crossCheckBatch([item0, item1], {
			anthropicApiKey: 'sk-test',
			rejectUnfetchable: true,
			concurrency: 1
		});
		expect(r.kept).toHaveLength(1); // item1 sauvé
		expect(r.apiErrorCount).toBe(1); // item0 en erreur API
		expect(r.rejected).toHaveLength(1); // item0 rejeté (jamais publié = zéro-hallu)
		expect(r.systemicError).toBeUndefined(); // 1/2 → pas systémique
	});

	it("crédit API épuisé sur TOUS les items → systemicError (kind=request), pas un échec contenu", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => longHtml
		});
		// 400 'credit balance too low' (non-retryable) sur l'unique item.
		__mockCreate.mockRejectedValue(
			Object.assign(new Error('400 {"type":"error","error":{"type":"invalid_request_error","message":"credit balance too low"}}'), {
				status: 400
			})
		);
		const r = await crossCheckBatch([baseItem], {
			anthropicApiKey: 'sk-test',
			rejectUnfetchable: true
		});
		expect(r.apiErrorCount).toBe(1);
		expect(r.systemicError).toBeDefined();
		expect(r.systemicError?.kind).toBe('request');
		expect(r.kept).toHaveLength(0); // rien publié sans vérification (zéro-hallu)
	});

	it("erreur réseau (sans status HTTP) classée 'network' — pas de retry, pas de blocage", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => longHtml
		});
		// Erreur de connexion sans status : non-retryable côté boucle manuelle
		// (seuls 429/529/503 le sont) → throw immédiat → classé 'network', rapide.
		__mockCreate.mockRejectedValue(new Error('socket hang up'));
		const r = await crossCheckBatch([baseItem], {
			anthropicApiKey: 'sk-test',
			rejectUnfetchable: true
		});
		expect(r.systemicError?.kind).toBe('network');
		expect(r.kept).toHaveLength(0);
	});

	it("rejette verdict avec severity manquant (Zod safeParse)", async () => {
		const create = __mockCreate;
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () =>
				'<html><body>' +
				'Article test contenu suffisamment long pour passer le seuil minimal de 200 caractères du cross-check pipeline. '.repeat(
					3
				) +
				'</body></html>'
		});
		create.mockResolvedValueOnce({
			content: [
				{
					type: 'tool_use',
					name: 'emit_verdict',
					input: {
						verbatim_ok: false,
						// divergences sans severity → Zod refuse
						divergences: [{ quoted: 'X', found: null }],
						confidence: 'high'
					}
				}
			],
			usage: { input_tokens: 100, output_tokens: 30 }
		});
		const r = await crossCheckBatch([baseItem], { anthropicApiKey: 'sk-test' });
		// Verdict invalide → traité comme unverifiable (par défaut conservé).
		expect(r.unverifiable).toHaveLength(1);
		expect(r.kept).toHaveLength(0);
		expect(r.rejected).toHaveLength(0);
	});
});

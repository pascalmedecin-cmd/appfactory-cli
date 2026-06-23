import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
	crossCheckBatch,
	fetchPageContent,
	htmlToPlainText,
	buildUserPrompt,
	isSponsoredOrOpinion,
	effectiveRegime,
	mentionsMarketResearchFirm,
	looksLikePaywallTeaser,
	articleBodyText
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

	it("décode les entités numériques (apostrophe des milliers : 28&#x27;500 et &#8217;)", () => {
		// Cas réel Blick W25 : « 28&#x27;500 personnes » - sans décodage, le chiffre du
		// résumé « 28'500 » ne matchait pas → faux « chiffre absent » → rejet à tort.
		expect(htmlToPlainText('<p>28&#x27;500 personnes</p>')).toContain("28'500");
		expect(htmlToPlainText('<p>3&#39;500 cas</p>')).toContain("3'500");
		// Décimale hors apostrophe : &#8364; = € (juste vérifier que ça ne casse pas).
		expect(htmlToPlainText('<p>Prix 100&#8364;</p>')).toContain('100');
	});

	it('décodage numérique robuste aux code points invalides (jamais throw)', () => {
		expect(() => htmlToPlainText('<p>&#xFFFFFFFF; &#99999999999;</p>')).not.toThrow();
	});

	// ROUND-2 re-vérif : retrait LINÉAIRE de script/style/commentaires (plus de regex lazy
	// quadratique). Un <script> NON FERMÉ (page tronquée) est retiré jusqu'à la fin, sans ReDoS.
	it('retire un <script> non fermé (page tronquée) et son contenu, sans ReDoS', () => {
		const html = '<p>Vrai texte.</p><script>var huge = "' + 'x'.repeat(100000); // pas de </script>
		const out = htmlToPlainText(html);
		expect(out).toContain('Vrai texte.');
		expect(out).not.toContain('var huge');
		expect(out.length).toBeLessThan(200);
	});
	it('ne hangue pas sur des ouvrants <script>/<style>/<!-- sans fermant (ReDoS-safe)', () => {
		expect(() => htmlToPlainText('<script '.repeat(20000) + '<style '.repeat(20000) + '<!-- '.repeat(20000))).not.toThrow();
	});
	// Re-vérif finale (bloqueur DoS) : strip de balises <[^<>]+> linéaire même sur du code
	// non-échappé / des « < » consécutifs sans « > ». Avec l'ancien <[^>]+> : ~57 s sur 200KB.
	it('strip des balises linéaire sur du code non-échappé « a < b » (pas de ReDoS event-loop)', () => {
		const codeBlob = 'if (a < b && c < d) { x++; } '.repeat(8000); // ~230KB de « < » sans balise réelle
		const out = htmlToPlainText('<article><p>' + codeBlob + '</p></article>');
		// Le texte « a < b » est préservé (et non avalé) ; surtout : termine instantanément.
		expect(out).toContain('a < b');
		expect(out.length).toBeGreaterThan(1000);
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

describe('buildUserPrompt', () => {
	it('soumet aussi la lecture FilmPro (so-what) au vérificateur - ferme la brèche entité externe fabriquée', () => {
		const item = {
			...baseItem,
			filmpro_relevance:
				'Opportunité tertiaire : la régie Dupont SA a lancé un appel d\'offres, à contacter.'
		};
		const prompt = buildUserPrompt(item, 'contenu de la page');
		expect(prompt).toContain('Lecture FilmPro');
		expect(prompt).toContain('régie Dupont SA');
		expect(prompt).toContain(item.summary);
	});

	it('omet la section so-what si filmpro_relevance est vide', () => {
		const item = { ...baseItem, filmpro_relevance: '' };
		expect(buildUserPrompt(item, 'page')).not.toContain('Lecture FilmPro');
	});
});

describe('crossCheckBatch', () => {
	it('rejette items avec verdict facts_ok=false ET divergence fatale', async () => {
		
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
						facts_ok: false,
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

	it('garde items avec facts_ok=true', async () => {
		
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
					input: { facts_ok: true, divergences: [], confidence: 'high' }
				}
			],
			usage: { input_tokens: 100, output_tokens: 30 }
		});
		const r = await crossCheckBatch([baseItem], { anthropicApiKey: 'sk-test' });
		expect(r.kept).toHaveLength(1);
		expect(r.rejected).toHaveLength(0);
	});

	// Recalibrage faits/interprétation 2026-06-22 (cause racine W25 « 0 item ») :
	// un résumé d'analyste contient des phrases d'INTERPRÉTATION (le « so what »)
	// jamais présentes verbatim dans la page. Sous l'ancien contrat verbatim-de-tout,
	// le LLM posait verbatim_ok=false → item jeté. Sous le nouveau contrat faits-only,
	// le LLM pose facts_ok=true (faits sains, interprétation ignorée) → item gardé.
	it("garde un résumé interprétatif (so-what d'analyste) si les FAITS sont sains (fix W25)", async () => {
		const create = __mockCreate;
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () =>
				'<html><body>' +
				"MétéoSuisse annonce une canicule de degré 3 en Suisse romande, jusqu'à 37 degrés entre jeudi et mardi. ".repeat(
					4
				) +
				'</body></html>'
		});
		const itemAnalyste = {
			...baseItem,
			summary:
				"MétéoSuisse annonce une canicule de degré 3 en Suisse romande, jusqu'à 37 degrés. C'est la deuxième vague intense en quelques semaines, confirmant la pression estivale croissante sur les bâtiments très vitrés."
		};
		create.mockResolvedValueOnce({
			content: [
				{
					type: 'tool_use',
					name: 'emit_verdict',
					// Le vérificateur, sous le nouveau SYSTEM, ne flagge PAS l'interprétation.
					input: { facts_ok: true, divergences: [], confidence: 'high' }
				}
			],
			usage: { input_tokens: 100, output_tokens: 30 }
		});
		const r = await crossCheckBatch([itemAnalyste], { anthropicApiKey: 'sk-test' });
		expect(r.kept).toHaveLength(1);
		expect(r.rejected).toHaveLength(0);
	});

	it('garde un item avec facts_ok=true ET une divergence minor (paraphrase fidèle, informatif)', async () => {
		const create = __mockCreate;
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () =>
				'<html><body>' +
				'Le rapport décrit en détail le marché du vitrage performant et ses tendances. '.repeat(5) +
				'</body></html>'
		});
		create.mockResolvedValueOnce({
			content: [
				{
					type: 'tool_use',
					name: 'emit_verdict',
					input: {
						facts_ok: true,
						divergences: [
							{ quoted: 'forte croissance', found: 'croissance soutenue', severity: 'minor' }
						],
						confidence: 'high'
					}
				}
			],
			usage: { input_tokens: 100, output_tokens: 30 }
		});
		const r = await crossCheckBatch([baseItem], { anthropicApiKey: 'sk-test' });
		expect(r.kept).toHaveLength(1);
		expect(r.rejected).toHaveLength(0);
	});

	it("rejette items avec facts_ok=false même si divergences seulement minor (audit 360 H-04)", async () => {
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
						facts_ok: false,
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

	it("rejette items avec facts_ok=false ET divergences vides (audit 360 H-04 brèche zéro hallu)", async () => {
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
						facts_ok: false,
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

	it('trust-by-source : page non fetchable d\'une source FIABLE (rts.ch, régime trusted) → conservée + marquée, malgré rejectUnfetchable', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: false,
			status: 500,
			text: async () => ''
		});
		const itemOfficiel = {
			...baseItem,
			source: { ...baseItem.source, url: 'https://www.rts.ch/info/canicule-geneve' },
			summary:
				'RTS a consacré un sujet aux solutions pour rafraîchir les logements pendant la canicule.',
			filmpro_relevance:
				"Fenêtre médiatique sur le confort d'été, à exploiter auprès des régies romandes."
		};
		const r = await crossCheckBatch([itemOfficiel], {
			anthropicApiKey: 'sk-test',
			rejectUnfetchable: true
		});
		expect(r.kept).toHaveLength(1);
		expect(r.rejected).toHaveLength(0);
		expect(r.keptByTrust).toBe(1);
		expect(r.kept[0].verification?.content_reverified).toBe(false);
	});

	it('trust-by-source : page non fetchable d\'une source INCONNUE (example.com, régime strict) reste REJETÉE (compteur trust=0)', async () => {
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
		expect(r.kept).toHaveLength(0);
		expect(r.keptByTrust).toBe(0);
	});

	it('trust-by-source NE couvre PAS une panne du vérificateur (apiError) : source fiable dont la VÉRIF échoue côté API reste REJETÉE', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () =>
				'<html><body><p>' +
				'Article officiel RTS sur la canicule à Genève, contenu réel et suffisamment long pour dépasser le seuil de prose et atteindre le vérificateur. '.repeat(
					6
				) +
				'</p></body></html>'
		});
		__mockCreate.mockRejectedValue(new Error('verifier down (credit exhausted)'));
		const itemOfficiel = {
			...baseItem,
			source: { ...baseItem.source, url: 'https://www.rts.ch/info/canicule-geneve' }
		};
		const r = await crossCheckBatch([itemOfficiel], {
			anthropicApiKey: 'sk-test',
			rejectUnfetchable: true
		});
		expect(r.apiErrorCount).toBe(1);
		expect(r.rejected).toHaveLength(1);
		expect(r.kept).toHaveLength(0);
		expect(r.keptByTrust).toBe(0);
	});

	it('trust-by-source resserré : source fiable, page LISIBLE mais verdict avorté (pas de bloc emit_verdict = verifier_failed) → REJETÉE, pas de trust-keep', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () =>
				'<html><body><p>' +
				'Article officiel RTS sur la canicule, contenu réel et suffisamment long pour dépasser le seuil de prose et atteindre le vérificateur. '.repeat(
					6
				) +
				'</p></body></html>'
		});
		// Le vérificateur répond mais SANS bloc emit_verdict → crossCheckItem renvoie 'verifier_failed'
		// (échec de NOTRE côté, pas une page morte) → jamais de trust-keep, même sur rts.ch (trusted).
		__mockCreate.mockResolvedValueOnce({
			content: [{ type: 'text', text: 'pas de tool_use' }],
			usage: { input_tokens: 10, output_tokens: 5 }
		});
		const itemOfficiel = {
			...baseItem,
			source: { ...baseItem.source, url: 'https://www.rts.ch/info/canicule-geneve' }
		};
		const r = await crossCheckBatch([itemOfficiel], {
			anthropicApiKey: 'sk-test',
			rejectUnfetchable: true
		});
		expect(r.rejected).toHaveLength(1);
		expect(r.kept).toHaveLength(0);
		expect(r.keptByTrust).toBe(0);
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
						facts_ok: false,
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
						facts_ok: false,
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
						input: { facts_ok: true, divergences: [], confidence: 'high' }
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

	it("erreur réseau (sans status HTTP) classée 'network' - pas de retry, pas de blocage", async () => {
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
						facts_ok: false,
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

// ─── Trust-by-source (cadrage sources fiables 2026-06-23) ───────────────────────
describe('isSponsoredOrOpinion (matching par segment, revue 2026-06-23)', () => {
	it('détecte les segments sponsorisés/opinion (y compris tokens élargis)', () => {
		expect(isSponsoredOrOpinion('https://x.ch/partenaire/abc', 'Titre')).toBe(true);
		expect(isSponsoredOrOpinion('https://x.ch/sponsored/abc', 'Titre')).toBe(true);
		expect(isSponsoredOrOpinion('https://x.ch/opinion/abc', 'Titre')).toBe(true);
		expect(isSponsoredOrOpinion('https://x.ch/idees/abc', 'Titre')).toBe(true);
		// Tokens publicitaires ajoutés (findings MEDIUM-3/4) :
		expect(isSponsoredOrOpinion('https://x.ch/publicite/abc', 'Titre')).toBe(true);
		expect(isSponsoredOrOpinion('https://x.ch/news/sponsored-content/abc', 'Titre')).toBe(true);
		expect(isSponsoredOrOpinion('https://x.de/anzeige/abc', 'Titel')).toBe(true);
		expect(isSponsoredOrOpinion('https://x.de/werbung/abc', 'Titel')).toBe(true);
		expect(isSponsoredOrOpinion('https://x.ch/publi-12345-acme', 'Titre')).toBe(true); // préfixe publi-
	});
	it('PAS de faux positif par sous-chaîne (findings LOW-5/6)', () => {
		expect(isSponsoredOrOpinion('https://x.ch/idees-recues/abc', 'Titre')).toBe(false); // != segment idees
		expect(isSponsoredOrOpinion('https://x.ch/recap-2025/abc', 'Titre')).toBe(false); // cp- non matché mid-slug
		expect(isSponsoredOrOpinion('https://x.ch/info/abc', 'Titre normal')).toBe(false);
		expect(isSponsoredOrOpinion('https://x.ch/a', 'Genève présenté par son maire')).toBe(false); // marqueur loose retiré
		expect(isSponsoredOrOpinion('https://x.ch/a', 'En collaboration avec les régies du canton')).toBe(false);
	});
	// ROUND-2 finding LOW : segments AMBIGUS retirés → plus de faux strict sur des slugs métier.
	it('ROUND-2 : segments ambigus (cp/native/promotion/annonce) ne déclenchent plus', () => {
		expect(isSponsoredOrOpinion('https://x.ch/cp/article', 'Titre')).toBe(false); // cp seul (≠ communiqué garanti)
		expect(isSponsoredOrOpinion('https://x.ch/native/innovation', 'Titre')).toBe(false); // native ambigu
		expect(isSponsoredOrOpinion('https://x.ch/promotion/ecole-batiment', 'Titre')).toBe(false); // promotion (scolaire)
		expect(isSponsoredOrOpinion('https://x.ch/annonces/officielles', 'Titre')).toBe(false); // annonce d'actualité
		// Les marqueurs publicitaires NON ambigus restent actifs :
		expect(isSponsoredOrOpinion('https://x.ch/native-advertising/abc', 'Titre')).toBe(true);
		expect(isSponsoredOrOpinion('https://x.ch/brandstudio/abc', 'Titre')).toBe(true);
	});
	it('détecte les marqueurs de titre non ambigus', () => {
		expect(isSponsoredOrOpinion('https://x.ch/a', 'Contenu de marque : super produit')).toBe(true);
		expect(isSponsoredOrOpinion('https://x.ch/a', 'Publireportage : Acme lance un film')).toBe(true);
		expect(isSponsoredOrOpinion('https://x.ch/a', 'Opinion : il faut agir')).toBe(true);
	});
	it('ne déclenche pas sur un article normal', () => {
		expect(isSponsoredOrOpinion('https://rts.ch/info/canicule-geneve', 'Canicule à Genève')).toBe(false);
	});
	it('robuste à une URL non parseable', () => {
		expect(() => isSponsoredOrOpinion('pas-une-url', 'Titre')).not.toThrow();
	});
});

describe('mentionsMarketResearchFirm (backstop garde-fou 1 déterministe, finding LOW-7 + ROUND-2)', () => {
	const withText = (over: Partial<IntelligenceItem>) => ({ ...baseItem, ...over });
	it('détecte un CHIFFRE attribué à un cabinet d\'études nommé (cabinet + chiffre proche)', () => {
		expect(mentionsMarketResearchFirm(withText({ summary: 'Selon Mordor Intelligence, le marché atteint 2,9 milliards USD.' }))).toBe(true);
		expect(mentionsMarketResearchFirm(withText({ filmpro_relevance: 'Une étude de MarketsandMarkets cite +6 % de croissance.' }))).toBe(true);
		expect(mentionsMarketResearchFirm(withText({ deep_dive: 'Statista évalue le segment à 1,2 milliard EUR.' }))).toBe(true);
	});
	// ROUND-2 finding MEDIUM : un name-drop SANS chiffre attribué ne force plus tout l'item en strict.
	// (champs isolés : le summary de baseItem porte des chiffres, on le remplace par du texte pur)
	it('ne déclenche PAS sur un cabinet nommé SANS chiffre à proximité (name-drop anodin)', () => {
		const clean = { deep_dive: null, filmpro_relevance: '' };
		expect(mentionsMarketResearchFirm(withText({ ...clean, summary: 'Selon McKinsey, les régies doivent revoir leur stratégie de rénovation.' }))).toBe(false);
		expect(mentionsMarketResearchFirm(withText({ ...clean, summary: 'Une approche conseil inspirée de Roland Berger pour cibler le tertiaire.' }))).toBe(false);
	});
	// ROUND-2 finding MEDIUM : « grand view » nu retiré → plus de faux positif sur le métier vitrage.
	it('ne déclenche PAS sur « a grand view of the skyline » même avec un chiffre (métier vitrage)', () => {
		expect(mentionsMarketResearchFirm(withText({ deep_dive: null, filmpro_relevance: '', summary: 'Les bureaux offrent a grand view of the skyline depuis 12 étages.' }))).toBe(false);
	});
	// ROUND-2 re-vérif finding LOW : un chiffre NON-marché près d'un cabinet (année, étage, °C) ne
	// force plus strict - on exige un indice de chiffre de MARCHÉ (%, monnaie, ordre de grandeur, marché).
	it('ne déclenche PAS sur un cabinet près d\'un chiffre non-marché (année / étage)', () => {
		const clean = { deep_dive: null, filmpro_relevance: '' };
		expect(mentionsMarketResearchFirm(withText({ ...clean, summary: 'Selon McKinsey, en 2026 les régies rénovent 12 immeubles à Genève.' }))).toBe(false);
	});
	it('DÉCLENCHE bien sur un vrai chiffre de marché attribué (indice : %, monnaie, milliard)', () => {
		const clean = { deep_dive: null, filmpro_relevance: '' };
		expect(mentionsMarketResearchFirm(withText({ ...clean, summary: 'Selon Gartner, le marché croît de 7,4 % par an.' }))).toBe(true);
		expect(mentionsMarketResearchFirm(withText({ ...clean, summary: 'Technavio estime le segment à 3,1 milliards USD.' }))).toBe(true);
	});
	// ROUND-2 re-vérif finding LOW : frontière de mot → « mordoré » (teinte vitrage, métier FilmPro)
	// contient « mordor » mais n'est PAS le cabinet Mordor.
	it('ne déclenche PAS sur une sous-chaîne (« mordoré » = teinte de vitrage, pas le cabinet Mordor)', () => {
		const clean = { deep_dive: null, filmpro_relevance: '' };
		expect(mentionsMarketResearchFirm(withText({ ...clean, summary: 'Un film aux reflets mordorés réduisant 30 % des apports solaires.' }))).toBe(false);
	});
	// ROUND-2 re-vérif finding MEDIUM : l'indice de marché (eur/usd/marche…) ne doit PAS matcher en
	// sous-chaîne accentuée (« leur », « démarche ») → sinon faux strict ré-ouvert.
	it('ne déclenche PAS quand le seul « indice marché » est une sous-chaîne accentuée (leur/démarche)', () => {
		const clean = { deep_dive: null, filmpro_relevance: '' };
		// « leur » contient « eur », « démarche » contient « march », mais aucun vrai chiffre de marché.
		expect(mentionsMarketResearchFirm(withText({ ...clean, summary: 'Selon McKinsey, leur démarche de rénovation a couvert 12 immeubles cette année.' }))).toBe(false);
		expect(mentionsMarketResearchFirm(withText({ ...clean, summary: 'Gartner note que Europe compte 27 États, sans heurter le calendrier.' }))).toBe(false);
	});
	it('ne déclenche pas sans cabinet', () => {
		expect(mentionsMarketResearchFirm(withText({ summary: 'La canicule frappe Genève, mesures dès 28°C.' }))).toBe(false);
	});
	it('force le régime strict même sur source fiable si un chiffre est attribué à un cabinet', () => {
		const item = withText({ source: { ...baseItem.source, url: 'https://www.rts.ch/info/x' }, summary: 'Selon Fortune Business Insights, +6%.' });
		expect(effectiveRegime(item)).toBe('strict');
	});
});

describe('articleBodyText + looksLikePaywallTeaser (garde paywall durcie, finding HIGH-2)', () => {
	it('articleBodyText ignore le chrome de page (nav/footer) et mesure le corps réel', () => {
		const chrome = '<nav>' + 'Menu Accueil Rubriques Abonnement '.repeat(30) + '</nav><footer>' + 'Mentions légales contact '.repeat(30) + '</footer>';
		const teaserBody = '<article>Trois phrases de teaser seulement.</article>';
		const html = `<html><body>${chrome}${teaserBody}</body></html>`;
		// Le htmlToPlainText global serait gonflé par le chrome ; articleBodyText isole <article>.
		expect(htmlToPlainText(html).length).toBeGreaterThan(1200);
		expect(articleBodyText(html).length).toBeLessThan(1200);
	});
	it('articleBodyText retire nav/header/footer/aside quand pas de <article>', () => {
		const html = '<html><body><nav>' + 'gros menu '.repeat(200) + '</nav><div>Corps court.</div></body></html>';
		expect(articleBodyText(html).length).toBeLessThan(htmlToPlainText(html).length);
	});
	it('looksLikePaywallTeaser détecte les marqueurs d\'abonnement', () => {
		expect(looksLikePaywallTeaser('... réservé aux abonnés ...')).toBe(true);
		expect(looksLikePaywallTeaser('... Nur für Abonnenten ...')).toBe(true);
		expect(looksLikePaywallTeaser('Un article normal sans paywall.')).toBe(false);
	});
	it('looksLikePaywallTeaser détecte aussi un paywall académique EN (ROUND-2)', () => {
		expect(looksLikePaywallTeaser('Abstract... Purchase PDF to read the full article.')).toBe(true);
		expect(looksLikePaywallTeaser('Access through your institution to continue.')).toBe(true);
	});

	// ── ROUND-2 (re-vérif 2026-06-23) : la mesure hors ancres ferme le finding HIGH résiduel ──
	it('HIGH résiduel : une zone « à lire aussi » DANS le <article> ne gonfle PAS le corps mesuré', () => {
		// Teaser court + énorme bloc de liens recommandés À L'INTÉRIEUR du <article>.
		const related =
			'<aside class="lire-aussi">' +
			Array.from({ length: 60 }, (_, i) => `<a href="/x${i}">Article recommandé numéro ${i} sur le vitrage</a>`).join('') +
			'</aside>';
		const html = `<html><body><article><p>Trois phrases de teaser seulement avant le paywall.</p>${related}</article></body></html>`;
		// Le retrait des ancres effondre le bloc de liens malgré son volume.
		expect(articleBodyText(html).length).toBeLessThan(350);
	});
	// ── BLOQUEUR HIGH (re-vérif) : liens « à lire aussi » ENROBÉS <p><a> (CMS Tamedia/WordPress/AMP) ──
	it('BLOQUEUR HIGH : des liens recommandés enrobés <p><a> ne gonflent PAS le corps (retrait des ancres)', () => {
		const relatedP =
			Array.from({ length: 50 }, (_, i) => `<p class="reco"><a href="/x${i}">A lire aussi : article recommandé numéro ${i} sur le vitrage performant</a></p>`).join('');
		const html = `<html><body><article><p>Teaser court derriere le paywall.</p>${relatedP}</article></body></html>`;
		// Avant : extractTagBlocks('p') comptait les 50 <p> de liens → 2800+ chars → restait trusted.
		expect(articleBodyText(html).length).toBeLessThan(350);
	});
	// ── BLOQUEUR MEDIUM (re-vérif, régression round-2) : corps rédigé en <div> SANS <p> interne ──
	it('BLOQUEUR MEDIUM : un corps en <div> (chapô <p> seul) est BIEN compté (pas de faux strict)', () => {
		const divBody = Array.from({ length: 10 }, (_, i) => `<div class="paragraph">Paragraphe ${i} du corps réel et vérifiable de l'article, sans balise p interne.</div>`).join('');
		const html = `<html><body><article><p>Chapô court.</p>${divBody}</article></body></html>`;
		// La mesure de TEXTE BRUT (pas seulement les <p>) capte le corps en <div>.
		expect(articleBodyText(html).length).toBeGreaterThan(350);
	});
	it('un <p>/<article> injecté dans <script> ou un commentaire HTML ne gonfle PAS la mesure', () => {
		const html = '<html><body>' +
			'<script>var x = "<p>' + 'faux corps injecté '.repeat(60) + '</p>";</script>' +
			'<!-- <article><p>' + 'corps commenté '.repeat(60) + '</p></article> -->' +
			'<article><p>Vrai teaser court.</p></article></body></html>';
		// stripNonContent retire script + commentaire avant mesure → seul le vrai teaser compte.
		expect(articleBodyText(html).length).toBeLessThan(350);
	});
	it('un </article> DANS un commentaire ne tronque pas l\'extraction du vrai corps', () => {
		const html = '<html><body><!-- fin de section </article> --><article><p>' +
			"Corps réel et vérifiable de l'article, suffisamment long pour la confiance. ".repeat(8) +
			'</p></article></body></html>';
		expect(articleBodyText(html).length).toBeGreaterThan(350);
	});
	// ── BLOQUEUR re-vérif v2 (régression) : <script> NON FERMÉ (page tronquée à 200KB en plein
	// JSON-LD) ne doit PAS gonfler la mesure de corps. Le vrai corps = teaser court → mesure < 350. ──
	it('BLOQUEUR HIGH v2 : un <script> non fermé (troncature) ne gonfle PAS le corps mesuré', () => {
		const html = '<html><body><article><p>Teaser court derriere le paywall.</p></article>' +
			'<script type="application/ld+json">{"x":"' + 'bruit json-ld lorem ipsum corps factice '.repeat(60) + '"'; // tronqué : pas de </script> ni fin
		// stripNonContent retire le <script> non fermé jusqu'à la fin → seul le teaser compte.
		expect(articleBodyText(html).length).toBeLessThan(350);
	});
	it('MEDIUM : un <article> minuscule (chapô) ne rabaisse PAS un corps réel volumineux', () => {
		// CMS qui n'enveloppe que le chapô dans un <article> ; le vrai corps est dans un <div>.
		const body = '<div class="article-body"><p>' + "Corps complet et vérifiable de l'article avec de la prose réelle et détaillée. ".repeat(10) + '</p></div>';
		const html = `<html><body><article>Chapô très court.</article>${body}</body></html>`;
		// max-sur-scopes récupère la prose du <div> → bien au-dessus du seuil (pas de faux strict).
		expect(articleBodyText(html).length).toBeGreaterThan(350);
	});
	it('ReDoS : extraction linéaire - termine vite sur des ouvrants <article>/<main> sans fermant', () => {
		// Exactement l'input qui tuait l'ancien /<article>([\s\S]*?)<\/article>/g (lazy scan
		// jusqu'à la fin pour CHAQUE ouvrant non fermé = O(N²), ~secondes). Ouvrants avec '>'
		// (benins pour htmlToPlainText) mais sans fermant. Extraction indexOf → O(N), termine.
		const degenerate = '<article> '.repeat(25000) + '<main> '.repeat(25000);
		expect(() => articleBodyText(degenerate)).not.toThrow();
		expect(typeof articleBodyText(degenerate).length).toBe('number');
	});
});

describe('effectiveRegime', () => {
	const withUrl = (url: string, title = 'Titre') => ({ ...baseItem, title, source: { ...baseItem.source, url } });
	it('trusted pour source fiable, strict pour inconnu', () => {
		expect(effectiveRegime(withUrl('https://www.rts.ch/info/x'))).toBe('trusted');
		expect(effectiveRegime(withUrl('https://unknown-source.example/x'))).toBe('strict');
	});
	it('trusted_advocacy pour une association sectorielle', () => {
		expect(effectiveRegime(withUrl('https://ewfa.org/news/x'))).toBe('trusted_advocacy');
	});
	it('rabaisse à strict sur rubrique sponsorisée / opinion (même domaine fiable)', () => {
		expect(effectiveRegime(withUrl('https://www.rts.ch/opinion/x'))).toBe('strict');
		expect(effectiveRegime(withUrl('https://www.lemonde.fr/a', 'Publireportage : Acme'))).toBe('strict');
	});
});

describe('crossCheckBatch - SYSTEM par régime (cadrage trust-by-source)', () => {
	const LONG_BODY =
		'<html><body>' +
		"Texte réel de l'article, suffisamment long pour dépasser le seuil de corps réel exigé pour accorder la confiance à la source. ".repeat(
			20
		) +
		'</body></html>';

	function mockPage(html: string) {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () => html
		});
	}
	function mockVerdict(input: unknown) {
		__mockCreate.mockResolvedValueOnce({
			content: [{ type: 'tool_use', name: 'emit_verdict', input }],
			usage: { input_tokens: 100, output_tokens: 40 }
		});
	}
	const systemOf = () => __mockCreate.mock.calls[0][0].system as string;
	const STRICT_MARK = 'Ta SEULE mission : détecter si le résumé INVENTE ou DÉFORME';
	const TRUSTED_MARK = 'SOURCE RECONNUE ET REDEVABLE';
	const ADVOCACY_MARK = 'GARDE-FOU 2';

	it('source fiable (rts.ch) + corps réel → SYSTEM CONFIANCE', async () => {
		mockPage(LONG_BODY);
		mockVerdict({ facts_ok: true, divergences: [], confidence: 'high' });
		const item = { ...baseItem, source: { ...baseItem.source, url: 'https://www.rts.ch/info/article-xyz' } };
		const r = await crossCheckBatch([item], { anthropicApiKey: 'sk-test' });
		expect(r.kept).toHaveLength(1);
		expect(systemOf()).toContain(TRUSTED_MARK);
		expect(systemOf()).not.toContain(ADVOCACY_MARK);
	});

	it('domaine inconnu (non fiable) → SYSTEM STRICT, PAS exclu (filtre anti-hallu)', async () => {
		mockPage(LONG_BODY);
		mockVerdict({ facts_ok: true, divergences: [], confidence: 'high' });
		const item = { ...baseItem, source: { ...baseItem.source, url: 'https://unknown-source.example/x' } };
		const r = await crossCheckBatch([item], { anthropicApiKey: 'sk-test' });
		expect(r.kept).toHaveLength(1); // passé par le filtre, non exclu
		expect(systemOf()).toContain(STRICT_MARK);
		expect(systemOf()).not.toContain(TRUSTED_MARK);
	});

	it('association (ewfa.org) → SYSTEM CONFIANCE + clause advocacy', async () => {
		mockPage(LONG_BODY);
		mockVerdict({ facts_ok: true, divergences: [], confidence: 'high' });
		const item = { ...baseItem, source: { ...baseItem.source, url: 'https://ewfa.org/news/x' } };
		await crossCheckBatch([item], { anthropicApiKey: 'sk-test' });
		expect(systemOf()).toContain(TRUSTED_MARK);
		expect(systemOf()).toContain(ADVOCACY_MARK);
	});

	it('rubrique sponsorisée sur domaine fiable → SYSTEM STRICT', async () => {
		mockPage(LONG_BODY);
		mockVerdict({ facts_ok: true, divergences: [], confidence: 'high' });
		const item = { ...baseItem, source: { ...baseItem.source, url: 'https://www.rts.ch/partenaire/article' } };
		await crossCheckBatch([item], { anthropicApiKey: 'sk-test' });
		expect(systemOf()).toContain(STRICT_MARK);
		expect(systemOf()).not.toContain(TRUSTED_MARK);
	});

	it('garde paywall (filet) : source fiable mais corps quasi vide → SYSTEM STRICT', async () => {
		mockPage('<html><body>' + 'Teaser court mais lisible. '.repeat(10) + '</body></html>'); // ~270 chars : >= 200 (page lisible, verifier appelé) mais < 350 (plancher prose)
		mockVerdict({ facts_ok: true, divergences: [], confidence: 'high' });
		const item = { ...baseItem, source: { ...baseItem.source, url: 'https://www.nzz.ch/x' } };
		await crossCheckBatch([item], { anthropicApiKey: 'sk-test' });
		expect(systemOf()).toContain(STRICT_MARK);
		expect(systemOf()).not.toContain(TRUSTED_MARK);
	});

	// ── ROUND-2 régression VOLUME (finding HIGH) : une brève d'agence courte mais fiable
	// (le format RTS/ATS qui a sauvé W25) NE doit PLUS être rabaissée en strict. ──
	it('ROUND-2 : brève d\'agence courte mais lisible (sans marqueur paywall) → SYSTEM CONFIANCE', async () => {
		mockPage('<html><body><article><p>' + 'La canicule de degré 3 touche la Suisse romande cette semaine. '.repeat(8) + '</p></article></body></html>'); // ~496 chars prose, < 1200 mais >= 350
		mockVerdict({ facts_ok: true, divergences: [], confidence: 'high' });
		const item = { ...baseItem, source: { ...baseItem.source, url: 'https://www.keystone-sda.ch/news/x' } };
		const r = await crossCheckBatch([item], { anthropicApiKey: 'sk-test' });
		expect(r.kept).toHaveLength(1);
		expect(systemOf()).toContain(TRUSTED_MARK); // confiance préservée (volume récupéré)
		expect(systemOf()).not.toContain(STRICT_MARK);
	});

	// ── ROUND-2 régression FAUX STRICT (finding MEDIUM) : un <article> minuscule (chapô) ne doit
	// PLUS faire basculer un article complet en strict (max-sur-scopes récupère le vrai corps). ──
	it('ROUND-2 : <article> chapô minuscule + vrai corps hors <article> → SYSTEM CONFIANCE', async () => {
		const body = '<div class="content"><p>' + "Corps complet et vérifiable de l'article avec beaucoup de prose réelle. ".repeat(10) + '</p></div>';
		mockPage(`<html><body><article>Chapô.</article>${body}</body></html>`);
		mockVerdict({ facts_ok: true, divergences: [], confidence: 'high' });
		const item = { ...baseItem, source: { ...baseItem.source, url: 'https://www.rts.ch/info/article-complet' } };
		await crossCheckBatch([item], { anthropicApiKey: 'sk-test' });
		expect(systemOf()).toContain(TRUSTED_MARK);
		expect(systemOf()).not.toContain(STRICT_MARK);
	});

	// ── BLOQUEUR re-vérif (bout-en-bout) : corps en <div> sans <p> interne → CONFIANCE préservée ──
	it('BLOQUEUR MEDIUM intégration : corps en <div> (chapô <p>) sur source fiable → SYSTEM CONFIANCE', async () => {
		const divBody = Array.from({ length: 12 }, (_, i) => `<div class="par">Paragraphe ${i} du corps réel et vérifiable de l'article sans balise p.</div>`).join('');
		mockPage(`<html><body><article><p>Chapô.</p>${divBody}</article></body></html>`);
		mockVerdict({ facts_ok: true, divergences: [], confidence: 'high' });
		const item = { ...baseItem, source: { ...baseItem.source, url: 'https://www.keystone-sda.ch/news/div-body' } };
		const r = await crossCheckBatch([item], { anthropicApiKey: 'sk-test' });
		expect(r.kept).toHaveLength(1);
		expect(systemOf()).toContain(TRUSTED_MARK);
		expect(systemOf()).not.toContain(STRICT_MARK);
	});

	// ── BLOQUEUR re-vérif (bout-en-bout) : « à lire aussi » en <p><a> → STRICT (garde paywall tient) ──
	it('BLOQUEUR HIGH intégration : teaser + liens recommandés <p><a> sur source fiable → SYSTEM STRICT', async () => {
		const relatedP = Array.from({ length: 50 }, (_, i) => `<p class="reco"><a href="/x${i}">A lire aussi : recommandation numéro ${i} sur le vitrage performant et solaire</a></p>`).join('');
		mockPage(`<html><body><article><p>Teaser court derriere le paywall sur source fiable.</p>${relatedP}</article></body></html>`);
		mockVerdict({ facts_ok: true, divergences: [], confidence: 'high' });
		const item = { ...baseItem, source: { ...baseItem.source, url: 'https://www.nzz.ch/teaser-pa' } };
		await crossCheckBatch([item], { anthropicApiKey: 'sk-test' });
		expect(systemOf()).toContain(STRICT_MARK);
		expect(systemOf()).not.toContain(TRUSTED_MARK);
	});

	// ── BLOQUEUR re-vérif v2 (bout-en-bout) : teaser réel court + <script> tronqué non fermé sur
	// source fiable → le bruit JS ne fait plus trusted ; le corps réel (~260) < 350 → SYSTEM STRICT. ──
	it('BLOQUEUR HIGH v2 intégration : teaser + <script> non fermé (troncature) → SYSTEM STRICT', async () => {
		const teaser = '<article><p>' + 'Teaser un peu plus long mais toujours sous le seuil de confiance. '.repeat(4) + '</p></article>';
		mockPage('<html><body>' + teaser + '<script type="application/ld+json">{"corps":"' + 'bruit json-ld factice '.repeat(80)); // tronqué, pas de </script>
		mockVerdict({ facts_ok: true, divergences: [], confidence: 'high' });
		const item = { ...baseItem, source: { ...baseItem.source, url: 'https://www.swissinfo.ch/fre/x' } };
		await crossCheckBatch([item], { anthropicApiKey: 'sk-test' });
		expect(systemOf()).toContain(STRICT_MARK);
		expect(systemOf()).not.toContain(TRUSTED_MARK);
	});

	it('HIGH-2 : gros chrome + corps d\'article minuscule sur source fiable → SYSTEM STRICT', async () => {
		const chrome = '<nav>' + 'Menu Accueil Rubriques Newsletter Abonnement '.repeat(40) + '</nav><footer>' + 'Mentions impressum contact '.repeat(40) + '</footer>';
		mockPage(`<html><body>${chrome}<article>Trois phrases derrière le paywall.</article></body></html>`);
		mockVerdict({ facts_ok: true, divergences: [], confidence: 'high' });
		const item = { ...baseItem, source: { ...baseItem.source, url: 'https://www.rts.ch/info/x' } };
		await crossCheckBatch([item], { anthropicApiKey: 'sk-test' });
		// Avant le fix, le chrome gonflait pageText > 1200 et gardait 'trusted'. Désormais
		// le corps réel (<article>) fait < 1200 → strict.
		expect(systemOf()).toContain(STRICT_MARK);
		expect(systemOf()).not.toContain(TRUSTED_MARK);
	});

	it('HIGH-2 : marqueur paywall explicite dans un corps long sur source fiable → SYSTEM STRICT', async () => {
		mockPage('<html><body>' + "Long corps lisible avec beaucoup de texte de contexte editorial. ".repeat(25) + 'Pour lire la suite, abonnez-vous. Réservé aux abonnés.</body></html>');
		mockVerdict({ facts_ok: true, divergences: [], confidence: 'high' });
		const item = { ...baseItem, source: { ...baseItem.source, url: 'https://www.letemps.ch/x' } };
		await crossCheckBatch([item], { anthropicApiKey: 'sk-test' });
		expect(systemOf()).toContain(STRICT_MARK);
		expect(systemOf()).not.toContain(TRUSTED_MARK);
	});

	it('LOW-7 : item nommant un cabinet d\'études sur source fiable → SYSTEM STRICT', async () => {
		mockPage(LONG_BODY);
		mockVerdict({ facts_ok: true, divergences: [], confidence: 'high' });
		const item = { ...baseItem, source: { ...baseItem.source, url: 'https://www.rts.ch/info/x' }, summary: 'Selon Mordor Intelligence, le marché des films croît de 6%.' };
		await crossCheckBatch([item], { anthropicApiKey: 'sk-test' });
		expect(systemOf()).toContain(STRICT_MARK);
		expect(systemOf()).not.toContain(TRUSTED_MARK);
	});

	it('le GATE reste inchangé en mode confiance : facts_ok=false → rejeté', async () => {
		mockPage(LONG_BODY);
		mockVerdict({ facts_ok: false, divergences: [{ quoted: 'X', found: 'Y', severity: 'fatal' }], confidence: 'high' });
		const item = { ...baseItem, source: { ...baseItem.source, url: 'https://www.nature.com/articles/x' } };
		const r = await crossCheckBatch([item], { anthropicApiKey: 'sk-test' });
		expect(r.kept).toHaveLength(0);
		expect(r.rejected).toHaveLength(1);
	});
});

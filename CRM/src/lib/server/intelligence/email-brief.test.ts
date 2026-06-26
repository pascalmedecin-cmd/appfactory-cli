import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildBriefPayload, buildBriefPrintHtml, sendBriefEmail, weekStartFr } from './email-brief';
import type { EmailBriefConfig } from './deps';
import type { IntelligenceReport } from './schema';

function mockReport(overrides?: Partial<IntelligenceReport>): IntelligenceReport {
	return {
		meta: {
			week_label: '2026-W26',
			generated_at: '2026-06-26T06:00:00Z',
			compliance_tag: 'Non-exhaustif',
			executive_summary: 'Semaine W26 marquée par la canicule et le confort d’été.'
		},
		items: [
			{
				rank: 1,
				title: 'Canicule de degré 3 en Suisse romande',
				summary: 'MétéoSuisse annonce 37 degrés.',
				filmpro_relevance:
					'Pic de demande confort d’été sur le tertiaire très vitré, relancer les régies VD.',
				maturity: 'etabli',
				theme: 'confort_ete',
				geo_scope: 'suisse_romande',
				source: { name: 'RTS', url: 'https://rts.ch/canicule', published_at: '2026-06-24' },
				deep_dive: null,
				segment: 'tertiaire',
				actionability: 'action_directe',
				search_terms: []
			},
			{
				rank: 2,
				title: 'Décret tertiaire étendu en France',
				summary: '13 nouvelles catégories.',
				filmpro_relevance: 'Signal miroir pour le tertiaire suisse, argumentaire efficacité.',
				maturity: 'etabli',
				theme: 'reglementation',
				geo_scope: 'monde',
				source: { name: 'Le Moniteur', url: 'https://lemoniteur.fr/decret', published_at: '2026-06-22' },
				deep_dive: null,
				segment: 'tertiaire',
				actionability: 'veille_active',
				search_terms: []
			}
		],
		impacts_filmpro: [{ note: 'Préparer un argumentaire canicule pour les régies VD et GE.' }],
		search_terms: [],
		...overrides
	} as unknown as IntelligenceReport;
}

const ENABLED_CONFIG: EmailBriefConfig = {
	enabled: true,
	apiKey: 're_fake_key_aaaaaaaaaaaaaaaaaaaaaa',
	to: ['pascal@filmpro.ch', 'antoine@filmpro.ch'],
	from: 'FilmPro Veille <noreply@filmpro.ch>'
};

describe('buildBriefPayload', () => {
	it('subject = Veille FilmPro + semaine + nb signaux + (n à actionner)', () => {
		const p = buildBriefPayload({ weekLabel: '2026-W26', report: mockReport() });
		expect(p.subject).toContain('Veille FilmPro');
		expect(p.subject).toContain('2026-W26');
		expect(p.subject).toContain('2 signaux');
		expect(p.subject).toContain('1 à actionner');
	});

	it('html contient le résumé exécutif, les titres, les so-what et le wordmark FilmPro', () => {
		const p = buildBriefPayload({ weekLabel: '2026-W26', report: mockReport() });
		expect(p.html).toContain('Semaine W26 marquée par la canicule');
		expect(p.html).toContain('Canicule de degré 3 en Suisse romande');
		expect(p.html).toContain('relancer les régies VD');
		expect(p.html).toContain('FilmPro');
		// Couleur de marque navy présente (header brandé).
		expect(p.html).toContain('#152A45');
	});

	it('html intègre le logo FilmPro couleur hébergé (PNG, pas SVG) + la date « Semaine du ... »', () => {
		const p = buildBriefPayload({ weekLabel: '2026-W26', report: mockReport() });
		expect(p.html).toContain('/FilmPro_logo_white.png');
		expect(p.html).toContain('alt="FilmPro"');
		expect(p.html).toContain('Semaine du');
		// La date humaine du lundi de la semaine ISO.
		expect(p.html).toContain(weekStartFr('2026-W26'));
		// Pas de référence SVG (non rendu par Gmail/Outlook).
		expect(p.html).not.toContain('.svg');
	});

	it('html lie chaque item vers sa source réelle (https)', () => {
		const p = buildBriefPayload({ weekLabel: '2026-W26', report: mockReport() });
		expect(p.html).toContain('https://rts.ch/canicule');
		expect(p.html).toContain('https://lemoniteur.fr/decret');
		expect(p.html).toContain('/crm/veille');
	});

	it('html affiche les badges d’actionnabilité (À actionner / Veille active)', () => {
		const p = buildBriefPayload({ weekLabel: '2026-W26', report: mockReport() });
		expect(p.html).toContain('À actionner');
		expect(p.html).toContain('Veille active');
	});

	it('html liste les impacts FilmPro', () => {
		const p = buildBriefPayload({ weekLabel: '2026-W26', report: mockReport() });
		expect(p.html).toContain('Impacts FilmPro');
		expect(p.html).toContain('argumentaire canicule pour les régies');
	});

	it('AUCUN tiret cadratin ni emoji dans le HTML statique du template', () => {
		const p = buildBriefPayload({ weekLabel: '2026-W26', report: mockReport() });
		expect(p.html).not.toMatch(/[‒–—―]/);
		// Plage emoji courante (pictogrammes + symboles).
		expect(p.html).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
	});

	it('escape le HTML injecté (XSS dans titre / résumé / so-what)', () => {
		const xss = mockReport();
		(xss.meta as { executive_summary: string }).executive_summary =
			'<script>alert("x")</script>';
		(xss.items[0] as { title: string }).title = '<img src=x onerror=alert(1)>';
		const p = buildBriefPayload({ weekLabel: '2026-W26', report: xss });
		expect(p.html).not.toContain('<script>alert');
		expect(p.html).not.toMatch(/<img[^>]*onerror/);
		expect(p.html).toContain('&lt;script&gt;');
	});

	it('text fallback non vide et structuré', () => {
		const p = buildBriefPayload({ weekLabel: '2026-W26', report: mockReport() });
		expect(p.text).toContain('FilmPro Veille');
		expect(p.text).toContain('SIGNAUX CLÉS');
		expect(p.text).toContain('Canicule de degré 3');
	});

	it('weekStartFr : lundi ISO en français « 22 juin 2026 » pour 2026-W26', () => {
		expect(weekStartFr('2026-W26')).toBe('22 juin 2026');
		// Format stable « J mois AAAA », accents FR.
		expect(weekStartFr('2026-W25')).toMatch(/^\d{1,2} \S+ 2026$/);
		// weekLabel invalide -> fallback brut, pas d'exception.
		expect(weekStartFr('pas-une-semaine')).toBe('pas-une-semaine');
	});

	it('item sans URL valide retombe sur /crm/veille (pas de lien cassé)', () => {
		const r = mockReport();
		(r.items[0] as { source: { url: string } }).source.url = 'pas-une-url';
		const p = buildBriefPayload({ weekLabel: '2026-W26', report: r });
		// Le titre du 1er item pointe vers le fallback CRM.
		expect(p.html).toContain('/crm/veille');
		expect(p.html).not.toContain('href="pas-une-url"');
	});
});

describe('sendBriefEmail - gating', () => {
	afterEach(() => vi.restoreAllMocks());

	it('skip si enabled=false', async () => {
		const r = await sendBriefEmail(
			{ weekLabel: '2026-W26', report: mockReport() },
			{ ...ENABLED_CONFIG, enabled: false }
		);
		expect(r.skipped).toBe(true);
		expect(r.ok).toBe(false);
	});

	it('skip si apiKey manquante', async () => {
		const r = await sendBriefEmail(
			{ weekLabel: '2026-W26', report: mockReport() },
			{ ...ENABLED_CONFIG, apiKey: undefined }
		);
		expect(r.skipped).toBe(true);
	});

	it('skip si aucun destinataire', async () => {
		const r = await sendBriefEmail(
			{ weekLabel: '2026-W26', report: mockReport() },
			{ ...ENABLED_CONFIG, to: [] }
		);
		expect(r.skipped).toBe(true);
	});

	it('envoie via Resend avec to = array de destinataires', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ id: 'resend-123' })
		});
		vi.stubGlobal('fetch', fetchMock);

		const r = await sendBriefEmail(
			{ weekLabel: '2026-W26', report: mockReport() },
			ENABLED_CONFIG
		);
		expect(r.ok).toBe(true);
		expect(r.resendId).toBe('resend-123');
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.to).toEqual(['pascal@filmpro.ch', 'antoine@filmpro.ch']);
		expect(body.from).toBe('FilmPro Veille <noreply@filmpro.ch>');
		expect(body.subject).toContain('Veille FilmPro');
	});

	it('jamais d’exception propagée si fetch échoue', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
		const r = await sendBriefEmail(
			{ weekLabel: '2026-W26', report: mockReport() },
			ENABLED_CONFIG
		);
		expect(r.ok).toBe(false);
		expect(r.reason).toContain('fetch error');
	});

	it('Resend non-2xx -> ok:false avec status', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => 'invalid to' })
		);
		const r = await sendBriefEmail(
			{ weekLabel: '2026-W26', report: mockReport() },
			ENABLED_CONFIG
		);
		expect(r.ok).toBe(false);
		expect(r.reason).toContain('422');
	});
});


describe('buildBriefPrintHtml (PDF de marque)', () => {
	it('reprend le rendu brandé email (navy + signaux) et reste un HTML complet', () => {
		const html = buildBriefPrintHtml({ weekLabel: '2026-W26', report: mockReport() });
		expect(html).toContain('<!DOCTYPE html>');
		expect(html).toContain('#152A45'); // navy charte FilmPro
		expect(html).toContain('Canicule de degré 3 en Suisse romande'); // intégrité contenu
	});

	it('injecte les enrichissements impression (@page A4 + bouton + auto-print)', () => {
		const html = buildBriefPrintHtml({ weekLabel: '2026-W26', report: mockReport() });
		expect(html).toContain('@page');
		expect(html).toContain('size:A4');
		expect(html).toContain('fp-no-print');
		expect(html).toContain('window.print()');
	});

	it('préserve l’échappement HTML du contenu (pas d’injection via le titre)', () => {
		const xss = mockReport();
		xss.items[0].title = '<img src=x onerror=alert(1)>';
		const html = buildBriefPrintHtml({ weekLabel: '2026-W26', report: xss });
		expect(html).not.toContain('<img src=x onerror=alert(1)>');
		expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
	});
});

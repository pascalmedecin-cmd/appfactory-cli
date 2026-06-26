import { describe, it, expect } from 'vitest';
import { buildDailyEmailPayload, type DailyEmailInput } from './template';
import type { TacheDue } from '$lib/utils/dashboardTemporel';

function tache(p: Partial<TacheDue>): TacheDue {
	return {
		id: p.id ?? 'id-1',
		titre: p.titre ?? null,
		etape_pipeline: p.etape_pipeline ?? null,
		date_relance_prevue: p.date_relance_prevue ?? null,
		entreprise: p.entreprise ?? null
	};
}

const NOW = new Date('2026-06-26T05:00:00Z');
const TODAY = '2026-06-26';

/** Construit un input en derivant les totaux des longueurs (sauf override). */
function input(p: Partial<DailyEmailInput>): DailyEmailInput {
	const today = p.today ?? [];
	const late = p.late ?? [];
	return {
		today,
		late,
		todayTotal: p.todayTotal ?? today.length,
		lateTotal: p.lateTotal ?? late.length,
		todayIso: p.todayIso ?? TODAY,
		now: p.now ?? NOW
	};
}

describe('buildDailyEmailPayload - sujet', () => {
	it('adaptatif avec les deux compteurs', () => {
		const p = buildDailyEmailPayload(
			input({ today: [tache({ titre: 'A' }), tache({ titre: 'B' })], late: [tache({ titre: 'C', date_relance_prevue: '2026-06-24T00:00:00+00:00' })] })
		);
		expect(p.subject).toBe("FilmPro · Relances du jour · 2 aujourd'hui, 1 en retard");
	});

	it('today-only', () => {
		const p = buildDailyEmailPayload(input({ today: [tache({ titre: 'A' })] }));
		expect(p.subject).toBe("FilmPro · Relances du jour · 1 aujourd'hui");
	});

	it('late-only', () => {
		const p = buildDailyEmailPayload(input({ late: [tache({ titre: 'C', date_relance_prevue: '2026-06-20T00:00:00+00:00' })] }));
		expect(p.subject).toBe('FilmPro · Relances du jour · 1 en retard');
	});
});

describe('buildDailyEmailPayload - structure & charte', () => {
	it('bandeau navy + logo PNG FilmPro', () => {
		const p = buildDailyEmailPayload(input({ today: [tache({ titre: 'A' })] }));
		expect(p.html).toContain('#152A45'); // navy
		expect(p.html).toContain('FilmPro_logo_white.png');
	});

	it('conteneur à coins arrondis EN BAS seulement (bandeau carré)', () => {
		const p = buildDailyEmailPayload(input({ today: [tache({ titre: 'A' })] }));
		expect(p.html).toContain('border-radius:0 0 14px 14px');
	});

	it('CTA Ouvrir le CRM + footer rappel', () => {
		const p = buildDailyEmailPayload(input({ today: [tache({ titre: 'A' })] }));
		expect(p.html).toContain('Ouvrir le CRM');
		expect(p.html).toContain('Rappel quotidien du CRM FilmPro');
	});

	it('responsive mobile (media query) + conditionnel MSO Outlook', () => {
		const p = buildDailyEmailPayload(input({ today: [tache({ titre: 'A' })] }));
		expect(p.html).toContain('@media only screen and (max-width:480px)');
		expect(p.html).toContain('[if (gte mso 9)|(IE)]');
	});
});

describe('buildDailyEmailPayload - contenu', () => {
	it('titres échappés (anti-XSS)', () => {
		const p = buildDailyEmailPayload(input({ today: [tache({ titre: 'Devis <b>X</b>' })] }));
		expect(p.html).toContain('Devis &lt;b&gt;X&lt;/b&gt;');
		expect(p.html).not.toContain('<b>X</b>');
	});

	it('titre fallback = "Relancer {entreprise}", sans doublon entreprise en meta', () => {
		const p = buildDailyEmailPayload(input({ today: [tache({ entreprise: { raison_sociale: 'Régie Dupont' } })] }));
		expect(p.html).toContain('Relancer Régie Dupont');
		// pas de meta entreprise dupliquée (titre = fallback)
		expect(p.html.match(/Régie Dupont/g)?.length).toBe(1);
	});

	it('titre custom + entreprise -> entreprise en meta', () => {
		const p = buildDailyEmailPayload(input({ today: [tache({ titre: 'Devis solaire', entreprise: { raison_sociale: 'Acme SA' } })] }));
		expect(p.html).toContain('Devis solaire');
		expect(p.html).toContain('Acme SA');
	});

	it("section En retard montre l'ancienneté du retard", () => {
		const p = buildDailyEmailPayload(input({ late: [tache({ titre: 'C', date_relance_prevue: '2026-06-24T00:00:00+00:00' })] }));
		expect(p.html).toContain('il y a 2 j');
		expect(p.text).toContain('(il y a 2 j)');
	});

	it('date FR capitalisée dans le bandeau', () => {
		const p = buildDailyEmailPayload(input({ today: [tache({ titre: 'A' })] }));
		expect(p.html).toContain('Vendredi 26 juin 2026');
	});

	it('compteur de section = TOTAL exact, pas la slice ; "+ N autres" = total - affiché', () => {
		const shown = Array.from({ length: 25 }, (_, i) => tache({ id: `t${i}`, titre: `Relance ${i}` }));
		const p = buildDailyEmailPayload(input({ today: shown, todayTotal: 30 }));
		expect(p.html).toContain('+ 5 autres');
		expect(p.text).toContain('+ 5 autres, voir le CRM');
	});

	it('intro adaptative (accent aujourd hui / danger retard)', () => {
		const p = buildDailyEmailPayload(input({ today: [tache({ titre: 'A' })], late: [tache({ titre: 'B', date_relance_prevue: '2026-06-20T00:00:00+00:00' })] }));
		expect(p.html).toContain("à faire aujourd'hui");
		expect(p.html).toContain('en retard');
	});
});

describe('buildDailyEmailPayload - typo FR (règles dures)', () => {
	const p = buildDailyEmailPayload(
		input({ today: [tache({ titre: 'A' })], late: [tache({ titre: 'B', date_relance_prevue: '2026-06-10T00:00:00+00:00' })] })
	);
	const all = p.subject + p.html + p.text;

	it('zéro tiret cadratin (—) ni en-dash (–)', () => {
		expect(all).not.toContain('—');
		expect(all).not.toContain('–');
	});

	it('zéro emoji ni flèche unicode brute', () => {
		expect(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}]/u.test(all)).toBe(false);
	});

	it('accents FR présents (pas de dégradation ASCII)', () => {
		expect(p.html).toContain('envoyé'); // footer
		expect(p.html).toContain('À faire');
		expect(p.html).toContain("à faire aujourd'hui");
	});
});

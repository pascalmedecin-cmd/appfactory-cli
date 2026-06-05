/*
 * Golden v3 — écran « bon de travail » Découpe Films (refonte post-council).
 * Sans diagramme. Principes minimalistes (macro-blanc, hiérarchie typo, couleur rare,
 * ultra-flat) appliqués au système CRM (DM Sans, tokens projet). Plan calculé par le VRAI algo.
 * Usage : npx tsx scripts/_decoupe_golden.ts → .product-architect/decoupe/golden-optimisation.html
 */
import { writeFileSync } from 'node:fs';
import { optimiserDecoupe } from '../src/lib/decoupe/optimiser';
import type { Vitre, ProduitDecoupe } from '../src/lib/decoupe/types';

const produits: Record<string, ProduitDecoupe> = {
	'p-sol70': { id: 'p-sol70', laizes_mm: [1520, 1830], orientation_imposee: false, jointage_autorise: true, nestable: true, marge_pose_mm: 0, recouvrement_mm: 0 },
	'p-sec': { id: 'p-sec', laizes_mm: [1830], orientation_imposee: false, jointage_autorise: false, nestable: true, marge_pose_mm: 0, recouvrement_mm: 0 },
	'p-disc': { id: 'p-disc', laizes_mm: [1270, 1520], orientation_imposee: true, jointage_autorise: false, nestable: true, marge_pose_mm: 0, recouvrement_mm: 0 },
	'p-vernis': { id: 'p-vernis', laizes_mm: [1000], orientation_imposee: false, jointage_autorise: false, nestable: false, marge_pose_mm: 0, recouvrement_mm: 0 }
};
const produitsInfo: Record<string, { reference: string; nom: string; famille: string }> = {
	'p-sol70': { reference: 'SOL-70', nom: 'Film solaire 70 %', famille: 'solaire' },
	'p-sec': { reference: 'SEC-100', nom: 'Film sécurité 100µ', famille: 'securite' },
	'p-disc': { reference: 'DISC-FR', nom: 'Dépoli discrétion', famille: 'discretion' },
	'p-vernis': { reference: 'VRN-AR', nom: 'Vernis anti-rayures', famille: 'securite' }
};
const vitres: Vitre[] = [
	{ id: 'v1', produit_id: 'p-sol70', largeur_mm: 1200, hauteur_mm: 800, quantite: 4, sur_mesure_fournisseur: false },
	{ id: 'v2', produit_id: 'p-sol70', largeur_mm: 900, hauteur_mm: 2100, quantite: 2, sur_mesure_fournisseur: false },
	{ id: 'v3', produit_id: 'p-sec', largeur_mm: 600, hauteur_mm: 600, quantite: 3, sur_mesure_fournisseur: false },
	{ id: 'v4', produit_id: 'p-sol70', largeur_mm: 2000, hauteur_mm: 1000, quantite: 1, sur_mesure_fournisseur: true },
	{ id: 'v5', produit_id: 'p-disc', largeur_mm: 1700, hauteur_mm: 900, quantite: 1, sur_mesure_fournisseur: false },
	{ id: 'v6', produit_id: 'p-vernis', largeur_mm: 800, hauteur_mm: 600, quantite: 2, sur_mesure_fournisseur: false }
];
const vitresInfo: Record<string, { largeur_mm: number; hauteur_mm: number; quantite: number; produit_id: string }> = {};
for (const v of vitres) vitresInfo[v.id] = { largeur_mm: v.largeur_mm, hauteur_mm: v.hauteur_mm, quantite: v.quantite, produit_id: v.produit_id };

const resultat = optimiserDecoupe(vitres, new Map(Object.entries(produits)));

// --- Helpers ---------------------------------------------------------------
const RAISON_LABEL: Record<string, string> = { sur_mesure_fournisseur: 'Sur-mesure fournisseur', non_nestable: 'Produit non nestable' };
const m = (mm: number) => (mm / 1000).toFixed(2).replace('.', ',') + ' m';
const m2 = (mm2: number) => (mm2 / 1e6).toFixed(2).replace('.', ',') + ' m²';
const pct = (t: number) => (t * 100).toFixed(0);
const refOf = (pid: string) => produitsInfo[pid]?.reference ?? '—';
const nomOf = (pid: string) => produitsInfo[pid]?.nom ?? '';
const vitreLabel = (id: string) => { const v = vitresInfo[id]; return v ? `${v.largeur_mm} × ${v.hauteur_mm} mm` : ''; };
const chuteClass = (t: number) => { const p = t * 100; return p <= 15 ? 'good' : p <= 30 ? 'mid' : 'high'; };

// Agrégats synthèse
const totalLong = resultat.plans.reduce((s, p) => s + p.longueur_consommee_mm, 0);
const rollSurf = resultat.plans.reduce((s, p) => s + p.laize_mm * p.longueur_consommee_mm, 0);
const pieceSurf = resultat.plans.reduce((s, p) => s + p.surface_pieces_mm2, 0);
const chuteMoy = rollSurf > 0 ? (rollSurf - pieceSurf) / rollSurf : 0;

// Liste de coupe groupée par (vitre, dims de coupe)
function cutGroups(plan: (typeof resultat.plans)[number]) {
	const g = new Map<string, { vitre_id: string; w: number; h: number; n: number; pivot: boolean; les: boolean }>();
	for (const pl of plan.placements) {
		const k = `${pl.vitre_id}|${pl.largeur_placee_mm}|${pl.hauteur_placee_mm}|${pl.pivotee}`;
		const e = g.get(k) ?? { vitre_id: pl.vitre_id, w: pl.largeur_placee_mm, h: pl.hauteur_placee_mm, n: 0, pivot: pl.pivotee, les: false };
		e.n++;
		if (pl.les_index !== undefined) e.les = true;
		g.set(k, e);
	}
	return [...g.values()];
}

function filmCard(plan: (typeof resultat.plans)[number]) {
	const groups = cutGroups(plan);
	const rows = groups.map((gr) => `<tr><td class="cut-qty">×${gr.n}</td><td class="cut-dim df-num">${gr.w} × ${gr.h} mm</td><td class="cut-from">${vitreLabel(gr.vitre_id)}${gr.pivot ? ' · pivotée' : ''}${gr.les ? ' · en lés' : ''}</td></tr>`).join('');
	const cls = chuteClass(plan.taux_chute);
	return `<article class="film">
	<header class="film-head">
		<div class="film-id"><span class="film-ref">${refOf(plan.produit_id)}</span><span class="film-nom">${nomOf(plan.produit_id)}</span></div>
		<span class="chute chute--${cls}">${pct(plan.taux_chute)} % de chute</span>
	</header>
	<div class="film-verdict"><span class="v-lbl">À découper</span><span class="v-val df-num">Laize ${plan.laize_mm} mm <span class="v-x">×</span> ${m(plan.longueur_consommee_mm)}</span></div>
	<p class="film-control">${plan.placements.length} pièce${plan.placements.length > 1 ? 's' : ''} · surface utile ${m2(plan.surface_pieces_mm2)} sur ${m2(plan.laize_mm * plan.longueur_consommee_mm)} de rouleau</p>
	<details class="cut"><summary>Liste de coupe<span class="cut-count">${plan.placements.length}</span></summary>
		<table class="cut-table"><tbody>${rows}</tbody></table>
	</details>
</article>`;
}

const alertes = resultat.alertes.length
	? `<section class="exc exc--alert"><h2 class="exc-title"><span class="exc-ico">!</span>À vérifier<span class="exc-count">${resultat.alertes.length}</span></h2><ul class="exc-list">${resultat.alertes.map((a) => `<li><span class="exc-strong">${a.type === 'piece_non_placable' ? 'Pièce non plaçable' : 'Incohérence nesting'}</span> — ${a.message}${vitreLabel(a.vitre_id) ? ` <span class="df-num exc-vit">(${vitreLabel(a.vitre_id)})</span>` : ''}</li>`).join('')}</ul></section>`
	: '';

const commande = resultat.commandes_fournisseur.length
	? `<section class="exc exc--order"><h2 class="exc-title">À commander chez le fournisseur<span class="exc-count">${resultat.commandes_fournisseur.length}</span></h2><ul class="exc-list">${resultat.commandes_fournisseur.map((c) => { const pid = vitresInfo[c.vitre_id]?.produit_id ?? ''; return `<li><span class="exc-strong">${refOf(pid)}</span> ${nomOf(pid)} · <span class="df-num">${vitreLabel(c.vitre_id)}</span> · ${RAISON_LABEL[c.raison] ?? c.raison}</li>`; }).join('')}</ul></section>`
	: '';

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Golden v3 · Bon de coupe Découpe Films</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{
--color-primary:#2F5A9E;--color-primary-light:#F0F4F8;--color-primary-hover:#264C85;
--color-surface:#FFFFFF;--color-surface-alt:#FBFBFA;--color-border:#ECEBE8;--color-border-strong:#DEDCD7;
--color-text:#1A1A18;--color-text-body:#3A3A36;--color-text-muted:#8A8881;
--c-red-bg:#FDEBEC;--c-red-tx:#9F2F2D;--c-amber-bg:#FBF3DB;--c-amber-tx:#956400;--c-green-bg:#EDF3EC;--c-green-tx:#346538;
--radius:10px;--ease:cubic-bezier(0.16,1,0.3,1);
}
*{box-sizing:border-box}
body{margin:0;font-family:'DM Sans',system-ui,sans-serif;background:var(--color-surface-alt);color:var(--color-text);-webkit-font-smoothing:antialiased}
.df-num{font-variant-numeric:tabular-nums}
.hdr{height:64px;display:flex;align-items:center;background:rgba(255,255,255,.85);backdrop-filter:saturate(180%) blur(8px);border-bottom:1px solid var(--color-border);position:sticky;top:0;z-index:20}
.hdr-in{max-width:880px;margin:0 auto;width:100%;padding:0 28px;display:flex;align-items:center;justify-content:space-between}
.brand{font-weight:700;letter-spacing:-.02em;color:#00003B;font-size:19px}
.avatar{width:30px;height:30px;border-radius:9999px;background:var(--color-primary-light);color:var(--color-primary);display:grid;place-items:center;font-size:11px;font-weight:600}
.toolbar{border-bottom:1px solid var(--color-border);background:#fff}
.toolbar-in{max-width:880px;margin:0 auto;padding:0 28px;height:52px;display:flex;align-items:center;gap:26px}
.tool-name{font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px}
.tool-ico{width:26px;height:26px;border-radius:7px;display:grid;place-items:center;background:var(--color-primary-light);color:var(--color-primary)}
.tool-nav a{font-size:13.5px;font-weight:500;color:var(--color-text-muted);text-decoration:none}
.tool-nav a.active{color:var(--color-text);font-weight:600}
main{max-width:880px;margin:0 auto;padding:40px 28px 80px}
.goldbar{max-width:880px;margin:14px auto 0;padding:0 28px;font-size:11.5px;color:var(--color-text-muted)}
.back{display:inline-flex;align-items:center;gap:5px;font-size:13px;color:var(--color-text-muted);text-decoration:none;margin-bottom:26px}
/* Hero synthèse */
.hero{margin-bottom:40px}
.kicker{font-size:11.5px;font-weight:600;letter-spacing:.13em;text-transform:uppercase;color:var(--color-text-muted);margin:0 0 8px}
.hero-title{font-size:30px;font-weight:600;letter-spacing:-.025em;margin:0 0 24px}
.hero-stats{display:flex;gap:48px;flex-wrap:wrap;padding-bottom:26px;border-bottom:1px solid var(--color-border)}
.stat{display:flex;flex-direction:column;gap:3px}
.stat-num{font-size:30px;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1}
.stat-num--warn{color:var(--c-amber-tx)}
.stat-lbl{font-size:13px;color:var(--color-text-muted)}
.hero-actions{display:flex;gap:12px;margin-top:26px}
.btn{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 20px;border-radius:8px;font-size:14px;font-weight:600;font-family:inherit;border:1px solid transparent;cursor:pointer;transition:transform .15s var(--ease),background .15s var(--ease)}
.btn:active{transform:scale(.985)}
.btn-primary{background:var(--color-text);color:#fff}.btn-primary:hover{background:#000}
.btn-ghost{background:#fff;border-color:var(--color-border-strong);color:var(--color-text-body)}.btn-ghost:hover{background:var(--color-surface-alt)}
/* Exceptions */
.exc{border-radius:var(--radius);padding:20px 24px;margin-bottom:16px;border:1px solid transparent}
.exc--alert{background:var(--c-red-bg);border-color:rgba(159,47,45,.16)}
.exc--order{background:#fff;border-color:var(--color-border)}
.exc-title{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600;margin:0 0 12px;color:var(--color-text)}
.exc--alert .exc-title{color:var(--c-red-tx)}
.exc-ico{width:20px;height:20px;border-radius:9999px;background:var(--c-red-tx);color:#fff;display:grid;place-items:center;font-size:13px;font-weight:700}
.exc-count{margin-left:auto;font-size:12px;font-weight:600;color:var(--color-text-muted);font-variant-numeric:tabular-nums}
.exc--alert .exc-count{color:var(--c-red-tx)}
.exc-list{margin:0;padding:0;list-style:none;display:grid;gap:9px}
.exc-list li{font-size:13.5px;line-height:1.55;color:var(--color-text-body)}
.exc--alert .exc-list li{color:var(--c-red-tx)}
.exc-strong{font-weight:600;color:var(--color-text)}
.exc--alert .exc-strong{color:var(--c-red-tx)}
.exc-vit,.exc-list .df-num{opacity:.8}
/* Film cards */
.section-h{font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--color-text-muted);margin:30px 0 14px}
.film{background:#fff;border:1px solid var(--color-border);border-radius:var(--radius);padding:26px 28px;margin-bottom:14px;transition:box-shadow .2s var(--ease)}
.film:hover{box-shadow:0 2px 10px rgba(20,20,18,.04)}
.film-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}
.film-id{display:flex;align-items:baseline;gap:10px;min-width:0}
.film-ref{font-size:15px;font-weight:700;letter-spacing:-.01em;font-variant-numeric:tabular-nums}
.film-nom{font-size:14px;color:var(--color-text-muted)}
.chute{font-size:11.5px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;padding:5px 11px;border-radius:9999px;white-space:nowrap;flex:none}
.chute--good{background:var(--c-green-bg);color:var(--c-green-tx)}
.chute--mid{background:var(--c-amber-bg);color:var(--c-amber-tx)}
.chute--high{background:var(--c-red-bg);color:var(--c-red-tx)}
.film-verdict{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
.v-lbl{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--color-text-muted)}
.v-val{font-size:26px;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.v-x{color:var(--color-text-muted);margin:0 2px}
.film-control{font-size:13px;color:var(--color-text-muted);margin:10px 0 0;font-variant-numeric:tabular-nums}
.cut{margin-top:18px;border-top:1px solid var(--color-border);padding-top:14px}
.cut summary{cursor:pointer;list-style:none;font-size:13px;font-weight:600;color:var(--color-text-body);display:flex;align-items:center;gap:9px}
.cut summary::-webkit-details-marker{display:none}
.cut summary::before{content:'+';font-size:16px;color:var(--color-text-muted);width:14px}
.cut[open] summary::before{content:'−'}
.cut-count{font-size:12px;font-weight:500;color:var(--color-text-muted);background:var(--color-surface-alt);border:1px solid var(--color-border);border-radius:9999px;padding:1px 8px;font-variant-numeric:tabular-nums}
.cut-table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13.5px}
.cut-table td{padding:8px 0;border-bottom:1px solid var(--color-border)}
.cut-table tr:last-child td{border-bottom:none}
.cut-qty{font-weight:700;width:52px;font-variant-numeric:tabular-nums}
.cut-dim{font-weight:500;width:42%}
.cut-from{color:var(--color-text-muted)}
</style></head>
<body>
<header class="hdr"><div class="hdr-in"><span class="brand">FilmPro</span><span class="avatar">PM</span></div></header>
<div class="toolbar"><div class="toolbar-in"><span class="tool-name"><span class="tool-ico"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/></svg></span>Découpe Films</span><nav class="tool-nav"><a href="#" class="active">Chantiers</a><a href="#">Base produit</a></nav></div></div>
<p class="goldbar">GOLDEN v3 — refonte « bon de travail » post-council. Sans diagramme. Plan calculé par le vrai algo. Principes minimalistes appliqués au système CRM (DM Sans, tokens projet).</p>
<main>
	<a href="#" class="back">‹ Villa Léman, étage 2</a>
	<section class="hero">
		<p class="kicker">Résultat de l'optimisation</p>
		<h1 class="hero-title">Villa Léman, étage 2</h1>
		<div class="hero-stats">
			<div class="stat"><span class="stat-num">${resultat.plans.length}</span><span class="stat-lbl">film${resultat.plans.length > 1 ? 's' : ''} à découper</span></div>
			<div class="stat"><span class="stat-num">${m(totalLong)}</span><span class="stat-lbl">de rouleau au total</span></div>
			<div class="stat"><span class="stat-num stat-num--warn">${pct(chuteMoy)} %</span><span class="stat-lbl">de chute moyenne</span></div>
		</div>
		<div class="hero-actions">
			<button class="btn btn-primary"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>Lancer la découpe</button>
			<button class="btn btn-ghost"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>Imprimer le bon de coupe</button>
		</div>
	</section>

	${alertes}
	${commande}

	<h2 class="section-h">Découpe interne — ${resultat.plans.length} film${resultat.plans.length > 1 ? 's' : ''}</h2>
	${resultat.plans.map(filmCard).join('\n')}
</main>
</body></html>`;

const out = new URL('../.product-architect/decoupe/golden-optimisation.html', import.meta.url);
writeFileSync(out, html, 'utf-8');
console.log('Plans:', resultat.plans.length, '| Commandes:', resultat.commandes_fournisseur.length, '| Alertes:', resultat.alertes.length, '| Chute moy:', pct(chuteMoy) + '%');
console.log('Golden v3 écrit:', out.pathname);

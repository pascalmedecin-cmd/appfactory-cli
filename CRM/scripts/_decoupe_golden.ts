/*
 * Golden v4 - Découpe Films, refonte UI premium (étape 3bis).
 * Direction : premium / moderne / RICHE en artefacts visuels (badges, pills, chips, icônes,
 * KPI mis en scène, strip de remplissage), homogène aux tokens CRM mais "élevé".
 * Issu du benchmark MÉTIER (optimiseurs de découpe + découpe sur rouleau : CutTool, CutList,
 * marker textile Gerber/Optitex). Plan calculé par le VRAI algo (src/lib/decoupe/optimiser).
 *
 * Conventions métier appliquées :
 *  - couleur par pièce/dimension (façon marker color-by-size) ; famille produit en accent de carte ;
 *  - taux = chiffre roi, % jumelé à l'absolu, feu tricolore (vert/ambre/rouge) ;
 *  - chute = vide qualifié (hachuré neutre), jamais rouge sur la matière ;
 *  - sous-titre "comment c'est calculé" sous chaque KPI (transparence, CutTool) ;
 *  - liste de coupe ordonnée = outil opérationnel (conservée) ;
 *  - strip de remplissage = différenciateur premium (compact, pas le diagramme dense rejeté).
 *
 * Usage : npx tsx scripts/_decoupe_golden.ts
 *   → .product-architect/decoupe/golden-optimisation.html  (écran résultat - le coeur)
 *   → .product-architect/decoupe/golden-saisie.html         (chantiers + base produit + fiche)
 */
import { writeFileSync } from 'node:fs';
import { optimiserDecoupe } from '../src/lib/decoupe/optimiser';
import type { Vitre, ProduitDecoupe } from '../src/lib/decoupe/types';

// --- Données de démonstration (mêmes qu'en v3, plan calculé réellement) --------------------
const produits: Record<string, ProduitDecoupe> = {
	'p-sol70': { id: 'p-sol70', laizes_mm: [1520, 1830], orientation_imposee: false, jointage_autorise: true, nestable: true, marge_pose_mm: 0, recouvrement_mm: 0 },
	'p-sec': { id: 'p-sec', laizes_mm: [1830], orientation_imposee: false, jointage_autorise: false, nestable: true, marge_pose_mm: 0, recouvrement_mm: 0 },
	'p-disc': { id: 'p-disc', laizes_mm: [1270, 1520], orientation_imposee: true, jointage_autorise: false, nestable: true, marge_pose_mm: 0, recouvrement_mm: 0 },
	'p-vernis': { id: 'p-vernis', laizes_mm: [1000], orientation_imposee: false, jointage_autorise: false, nestable: false, marge_pose_mm: 0, recouvrement_mm: 0 }
};
const produitsInfo: Record<string, { reference: string; nom: string; famille: 'solaire' | 'securite' | 'discretion'; fabricant: string }> = {
	'p-sol70': { reference: 'SOL-70', nom: 'Film solaire 70 %', famille: 'solaire', fabricant: '3M Prestige' },
	'p-sec': { reference: 'SEC-100', nom: 'Film sécurité 100µ', famille: 'securite', fabricant: 'Hanita SafetyZone' },
	'p-disc': { reference: 'DISC-FR', nom: 'Dépoli discrétion', famille: 'discretion', fabricant: 'Solar Screen' },
	'p-vernis': { reference: 'VRN-AR', nom: 'Vernis anti-rayures', famille: 'securite', fabricant: 'ClearShield' }
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

// --- Helpers de formatage --------------------------------------------------------------------
const RAISON_LABEL: Record<string, string> = { sur_mesure_fournisseur: 'Sur-mesure fournisseur', non_nestable: 'Produit non nestable' };
const FAMILLE_LABEL: Record<string, string> = { solaire: 'Solaire', securite: 'Sécurité', discretion: 'Discrétion' };
const m = (mm: number) => (mm / 1000).toFixed(2).replace('.', ',') + ' m';
const m2 = (mm2: number) => (mm2 / 1e6).toFixed(2).replace('.', ',') + ' m²';
const pct = (t: number) => (t * 100).toFixed(0);
const refOf = (pid: string) => produitsInfo[pid]?.reference ?? '—';
const nomOf = (pid: string) => produitsInfo[pid]?.nom ?? '';
const familleOf = (pid: string) => produitsInfo[pid]?.famille ?? 'securite';
const vitreLabel = (id: string) => { const v = vitresInfo[id]; return v ? `${v.largeur_mm} × ${v.hauteur_mm} mm` : ''; };
const chuteClass = (t: number) => { const p = t * 100; return p <= 15 ? 'good' : p <= 30 ? 'mid' : 'high'; };
const remplClass = (t: number) => chuteClass(1 - t); // remplissage = inverse de la chute

// Palette pièces (color-by-size, façon marker textile) - tons sourds/chauds FilmPro.
const PIECE_COLORS = ['#5A7190', '#538B6B', '#917548', '#7B6A9A', '#3F7C82', '#B07A5A', '#6F4F6E'];
const vitreColorMap = new Map<string, string>();
{
	let i = 0;
	for (const v of vitres) { if (!vitreColorMap.has(v.id)) vitreColorMap.set(v.id, PIECE_COLORS[i++ % PIECE_COLORS.length]); }
}
const colorOf = (vid: string) => vitreColorMap.get(vid) ?? '#5A7190';

// --- Agrégats de synthèse --------------------------------------------------------------------
const totalLong = resultat.plans.reduce((s, p) => s + p.longueur_consommee_mm, 0);
const rollSurf = resultat.plans.reduce((s, p) => s + p.laize_mm * p.longueur_consommee_mm, 0);
const pieceSurf = resultat.plans.reduce((s, p) => s + p.surface_pieces_mm2, 0);
const chuteMoy = rollSurf > 0 ? (rollSurf - pieceSurf) / rollSurf : 0;
const remplMoy = 1 - chuteMoy;
const chuteSurf = rollSurf - pieceSurf;
const nbPieces = resultat.plans.reduce((s, p) => s + p.placements.length, 0);
// Baseline honnête : "pose séquentielle" = chaque pièce sur sa propre longueur de laize (pas de regroupement en travers).
const baselineLong = resultat.plans.reduce((s, p) => s + p.placements.reduce((a, pl) => a + pl.hauteur_placee_mm, 0), 0);
const economieLong = Math.max(0, baselineLong - totalLong);
const statutGlobal = resultat.alertes.length ? 'attention' : 'ok';

// Liste de coupe groupée par (vitre, dims de coupe, rotation)
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

// --- Icônes (Lucide, stroke 1.75) ------------------------------------------------------------
const ic = {
	scissors: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/></svg>',
	check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>',
	printer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>',
	alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
	truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>',
	info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
	chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
	rotate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
	layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>',
	box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
	ruler: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></svg>'
};

// Logo FilmPro (asset de marque verbatim - cf. feedback_logo_svg_asset_verbatim).
const LOGO_SVG = `<svg class="logo" role="img" aria-label="FilmPro" xmlns="http://www.w3.org/2000/svg" viewBox="150 645 1200 212"><g><g><g><path fill="#00003B" d="M193.419,849.762h-38.175V662.449h119.879v35.163h-81.705v43.793h73.718v34.115h-73.718V849.762z M159.244,845.762h30.175v-74.241h73.718v-26.115h-73.718v-51.793h81.705v-27.163H159.244V845.762z"/></g><g><path fill="#00003B" d="M329.33,849.762h-37.651V714.824h37.651V849.762z M295.679,845.762h29.651V718.824h-29.651V845.762z M310.439,696.827c-6.233,0-11.698-2.017-16.244-5.994c-4.624-4.047-6.968-9.442-6.968-16.039c0-6.598,2.344-11.994,6.968-16.039c4.546-3.978,10.011-5.994,16.244-5.994s11.698,2.017,16.244,5.994c4.624,4.045,6.968,9.441,6.968,16.039c0,6.597-2.344,11.992-6.968,16.039C322.137,694.811,316.672,696.827,310.439,696.827z M310.439,656.761c-5.309,0-9.761,1.637-13.61,5.004c-3.77,3.299-5.602,7.561-5.602,13.029c0,5.468,1.833,9.729,5.602,13.029c3.848,3.367,8.3,5.004,13.61,5.004s9.761-1.637,13.61-5.004c3.77-3.3,5.602-7.562,5.602-13.029c0-5.469-1.833-9.73-5.602-13.029C320.2,658.397,315.749,656.761,310.439,656.761z"/></g><g><path fill="#00003B" d="M388.383,849.762h-37.651v-192.55h37.651V849.762z M354.731,845.762h29.651v-184.55h-29.651V845.762z"/></g><g><path fill="#00003B" d="M627.866,849.762h-37.65v-77.943c0-7.927-2.125-14.379-6.315-19.177c-4.18-4.781-10.24-7.105-18.527-7.105c-5.306,0-10.113,1.171-14.286,3.481c-4.163,2.303-7.481,5.476-9.861,9.429c-2.373,3.941-3.576,8.528-3.576,13.634v77.682H500v-77.943c0-7.927-2.125-14.379-6.315-19.177c-4.18-4.781-10.24-7.105-18.527-7.105c-5.306,0-10.113,1.171-14.286,3.481c-4.163,2.303-7.481,5.476-9.861,9.429c-2.373,3.941-3.576,8.528-3.576,13.634v77.682h-37.651V714.824h37.651v13.59c2.631-3.028,5.519-5.658,8.631-7.854c4.606-3.252,9.602-5.703,14.847-7.287c5.232-1.576,10.581-2.376,15.898-2.376c10.64,0,19.77,2.397,27.137,7.125c6.303,4.048,11.04,9.229,14.122,15.435c5.826-7.831,12.814-13.509,20.81-16.901c8.85-3.755,18.055-5.658,27.361-5.658c12.646,0,22.885,2.535,30.434,7.533c7.549,5.004,13.04,11.517,16.322,19.358c3.231,7.719,4.869,15.908,4.869,24.341V849.762z"/></g></g><g><g><path fill="#00003B" d="M676.095,847.762V664.449h68.873c13.18,0,24.878,2.292,35.091,6.875c10.214,4.582,18.222,11.194,24.027,19.837c5.805,8.642,8.707,19.03,8.707,31.163c0,12.396-2.684,22.871-8.052,31.425c-5.369,8.556-13.16,15.058-23.373,19.51s-22.609,6.678-37.186,6.678H710.27v67.825H676.095z M710.27,750.999h33.781c10.911,0,19.399-2.269,25.468-6.809c6.066-4.538,9.101-11.608,9.101-21.212c0-9.514-3.122-16.715-9.362-21.604c-6.242-4.888-14.557-7.333-24.943-7.333H710.27V750.999z"/></g><g><path fill="#00003B" d="M827.196,847.762V716.824h33.65v17.153c4.538-7.681,10.233-13.137,17.088-16.367c6.852-3.229,14.249-4.845,22.193-4.845c2.793,0,5.368,0.131,7.726,0.393c2.356,0.262,4.626,0.655,6.809,1.179l-4.189,34.567c-2.707-0.872-5.522-1.571-8.446-2.095c-2.925-0.524-5.826-0.786-8.707-0.786c-9.428,0-17.197,2.838-23.307,8.511c-6.111,5.676-9.166,13.532-9.166,23.569v69.658H827.196z"/></g><g><path fill="#00003B" d="M982.619,851.689c-13.968,0-26.341-3.165-37.121-9.492c-10.781-6.328-19.248-14.751-25.401-25.271c-6.154-10.518-9.231-22.062-9.231-34.633c0-9.251,1.768-18.069,5.303-26.449s8.511-15.777,14.927-22.193s13.988-11.478,22.718-15.189c8.728-3.709,18.331-5.564,28.807-5.564c13.879,0,26.208,3.143,36.989,9.428c10.78,6.285,19.248,14.688,25.402,25.205c6.154,10.521,9.23,22.108,9.23,34.764c0,9.254-1.768,18.049-5.303,26.384c-3.535,8.337-8.49,15.735-14.861,22.194c-6.373,6.461-13.924,11.545-22.652,15.254C1002.695,849.834,993.093,851.689,982.619,851.689z M982.488,822.36c7.418,0,14.01-1.637,19.771-4.91c5.761-3.273,10.299-7.899,13.617-13.88c3.316-5.979,4.976-13.071,4.976-21.277c0-8.204-1.637-15.319-4.91-21.343c-3.273-6.022-7.813-10.648-13.617-13.879c-5.807-3.229-12.419-4.845-19.837-4.845c-7.333,0-13.902,1.616-19.706,4.845c-5.807,3.23-10.345,7.856-13.618,13.879c-3.273,6.023-4.91,13.139-4.91,21.343c0,8.206,1.657,15.299,4.976,21.277c3.316,5.98,7.856,10.606,13.618,13.88C968.608,820.724,975.155,822.36,982.488,822.36z"/></g></g></g><g><g opacity="0.24"><rect x="1223.987" y="647.388" fill="#00003B" width="120" height="120"/></g><g opacity="0.62"><rect x="1182.781" y="687.575" fill="#00003B" width="120" height="120"/></g><g><rect x="1141.575" y="727.762" fill="#00003B" width="120" height="120"/></g></g></svg>`;

// --- CSS partagé (premium, tokens FilmPro) ---------------------------------------------------
const CSS = `
:root{
	--color-primary:#2F5A9E;--color-primary-light:#F0F4F8;--color-primary-hover:#264C85;
	--logo:#00003B;
	--surface:#FFFFFF;--surface-alt:#F9FAFB;--surface-sunken:#F3F4F6;
	--border:#E5E7EB;--border-strong:#D1D5DB;
	--text:#111827;--text-body:#374151;--text-muted:#6B7280;--text-faint:#9CA3AF;
	--green:#12B76A;--green-bg:#ECFDF3;--green-tx:#027A48;--green-bd:#A6F4C5;
	--amber:#F79009;--amber-bg:#FFFAEB;--amber-tx:#B54708;--amber-bd:#FEDF89;
	--red:#F04438;--red-bg:#FEF3F2;--red-tx:#B42318;--red-bd:#FECDCA;
	--fam-solaire:#d98a23;--fam-securite:#3d6b8a;--fam-discretion:#7b6a9a;
	--r-card:16px;--r-sub:12px;--r-sm:10px;--r-pill:9999px;
	--shadow-card:0 1px 0 rgba(17,24,39,.02),0 0 0 1px rgba(17,24,39,.04),0 8px 20px -12px rgba(17,24,39,.10);
	--shadow-hover:0 1px 3px rgba(17,24,39,.05),0 20px 40px -15px rgba(17,24,39,.10);
	--ease:cubic-bezier(0.16,1,0.3,1);--dur:240ms;
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',system-ui,-apple-system,sans-serif;color:var(--text-body);background:radial-gradient(1200px 600px at 50% -10%,#fff 0%,var(--surface-alt) 55%,var(--surface-alt) 100%);min-height:100vh;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.num{font-variant-numeric:tabular-nums}
.mono{font-family:'DM Mono','Consolas',monospace}
svg{display:block}

/* Bandeau golden (retirable) */
.goldbar{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.04em;color:var(--text-muted);text-align:center;padding:7px 16px;background:repeating-linear-gradient(45deg,var(--surface-alt),var(--surface-alt) 10px,#F3F4F6 10px,#F3F4F6 20px);border-bottom:1px dashed var(--border-strong)}

/* Header global */
.hdr{position:sticky;top:0;z-index:30;height:64px;background:rgba(255,255,255,.85);backdrop-filter:saturate(180%) blur(8px);-webkit-backdrop-filter:saturate(180%) blur(8px);border-bottom:1px solid var(--border);display:flex;align-items:center}
.hdr-in{width:100%;max-width:1080px;margin:0 auto;padding:0 28px;display:flex;align-items:center;justify-content:space-between}
.logo{height:34px;width:auto}
.hdr-right{display:flex;align-items:center;gap:16px}
.avatar{width:32px;height:32px;border-radius:var(--r-pill);background:var(--color-primary-light);color:var(--color-primary);display:grid;place-items:center;font-size:12px;font-weight:600;box-shadow:inset 0 0 0 1px rgba(47,90,158,.12)}

/* Barre outil */
.toolbar{border-bottom:1px solid var(--border);background:#fff}
.toolbar-in{max-width:1080px;margin:0 auto;padding:0 28px;height:54px;display:flex;align-items:center;gap:28px}
.tool-name{font-size:14.5px;font-weight:600;color:var(--text);display:flex;align-items:center;gap:10px}
.tool-ico{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--color-primary-light);color:var(--color-primary)}
.tool-ico svg{width:18px;height:18px}
.tool-nav{display:flex;gap:6px;margin-left:6px}
.tool-nav a{font-size:13.5px;font-weight:500;color:var(--text-muted);text-decoration:none;padding:7px 12px;border-radius:8px;transition:background var(--dur) var(--ease),color var(--dur) var(--ease)}
.tool-nav a:hover{background:var(--surface-alt);color:var(--text-body)}
.tool-nav a.active{color:var(--color-primary);background:var(--color-primary-light);font-weight:600}

main{max-width:1080px;margin:0 auto;padding:30px 28px 90px}

/* Fil + en-tête de page */
.back{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--text-muted);text-decoration:none;margin-bottom:18px}
.back svg{width:15px;height:15px;transform:rotate(180deg)}
.page-head{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:28px}
.ph-l{min-width:0}
.kicker{font-size:11.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--text-faint);margin-bottom:8px;display:flex;align-items:center;gap:8px}
.page-title{font-size:30px;font-weight:600;letter-spacing:-.025em;color:var(--text);line-height:1.1}
.page-meta{margin-top:9px;font-size:14px;color:var(--text-muted);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dot-sep{width:3px;height:3px;border-radius:50%;background:var(--border-strong)}
.ph-r{display:flex;align-items:center;gap:10px;flex-wrap:wrap}

/* Badge statut global */
.statepill{display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 13px 0 11px;border-radius:var(--r-pill);font-size:13px;font-weight:600}
.statepill svg{width:15px;height:15px}
.statepill--ok{background:var(--green-bg);color:var(--green-tx);box-shadow:inset 0 0 0 1px var(--green-bd)}
.statepill--warn{background:var(--amber-bg);color:var(--amber-tx);box-shadow:inset 0 0 0 1px var(--amber-bd)}

/* Boutons */
.btn{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 18px;border-radius:10px;font-size:14px;font-weight:600;font-family:inherit;border:1px solid transparent;cursor:pointer;transition:transform var(--dur) var(--ease),box-shadow var(--dur) var(--ease),background var(--dur) var(--ease)}
.btn svg{width:17px;height:17px}
.btn:active{transform:scale(.985)}
.btn-primary{background:var(--color-primary);color:#fff;box-shadow:0 1px 2px rgba(47,90,158,.25),0 6px 16px -8px rgba(47,90,158,.5)}
.btn-primary:hover{background:var(--color-primary-hover)}
.btn-ghost{background:#fff;border-color:var(--border-strong);color:var(--text-body)}
.btn-ghost:hover{background:var(--surface-alt)}
.btn-sm{height:34px;padding:0 13px;font-size:13px;border-radius:9px}

/* Bandeau KPI */
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
.kpi{background:var(--surface);border-radius:var(--r-card);box-shadow:var(--shadow-card);padding:18px 20px 16px;display:flex;flex-direction:column;gap:2px;position:relative;overflow:hidden}
.kpi-lbl{font-size:12.5px;font-weight:500;color:var(--text-muted);display:flex;align-items:center;gap:6px}
.kpi-lbl svg{width:14px;height:14px;color:var(--text-faint)}
.kpi-val{font-size:32px;font-weight:600;letter-spacing:-.02em;line-height:1.05;color:var(--text);margin-top:6px;display:flex;align-items:baseline;gap:8px}
.kpi-val .unit{font-size:18px;font-weight:600;color:var(--text-muted)}
.kpi-sub{font-size:12.5px;color:var(--text-faint);margin-top:6px;line-height:1.45}
.kpi-sub b{color:var(--text-body);font-weight:600}
.kpi--chute .kpi-val{color:var(--kpi-c)}
.kpi-spark{position:absolute;right:16px;top:16px;width:46px;height:46px}
/* mini barre de remplissage dans KPI */
.kpi-bar{height:6px;border-radius:var(--r-pill);background:var(--surface-sunken);margin-top:11px;overflow:hidden}
.kpi-bar i{display:block;height:100%;border-radius:var(--r-pill);background:var(--kpi-c)}

/* Sections */
.sec-h{display:flex;align-items:center;gap:10px;font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--text-faint);margin:34px 0 14px}
.sec-h .count{font-variant-numeric:tabular-nums;color:var(--text-muted)}

/* Callout alertes */
.callout{display:flex;gap:14px;padding:18px 20px;border-radius:var(--r-card);background:var(--amber-bg);box-shadow:inset 0 0 0 1px var(--amber-bd);border-left:3px solid var(--amber);margin-bottom:14px}
.callout-ico{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#fff;color:var(--amber-tx);box-shadow:inset 0 0 0 1px var(--amber-bd);flex:none}
.callout-ico svg{width:19px;height:19px}
.callout-body{min-width:0}
.callout-title{font-size:14px;font-weight:600;color:var(--amber-tx);margin-bottom:8px}
.callout-list{list-style:none;display:grid;gap:9px}
.callout-list li{font-size:13.5px;line-height:1.5;color:var(--text-body)}
.callout-list b{color:var(--text);font-weight:600}
.tagvit{display:inline-block;font-size:11.5px;font-weight:500;color:var(--text-muted);background:#fff;border-radius:6px;padding:1px 7px;box-shadow:inset 0 0 0 1px var(--border);margin-left:4px}

/* Carte commande */
.ordercard{background:var(--surface);border-radius:var(--r-card);box-shadow:var(--shadow-card);overflow:hidden;margin-bottom:14px}
.order-row{display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid var(--border)}
.order-row:last-child{border-bottom:none}
.order-ico{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;flex:none;color:#fff}
.order-ico svg{width:18px;height:18px}
.order-main{flex:1;min-width:0}
.order-ref{font-size:14px;font-weight:600;color:var(--text)}
.order-ref .nom{font-weight:400;color:var(--text-muted);margin-left:6px}
.order-dim{font-size:12.5px;color:var(--text-muted);margin-top:1px}
.order-foot{padding:11px 20px;font-size:12.5px;color:var(--text-muted);background:var(--surface-alt);display:flex;align-items:center;gap:8px}

/* Pastille famille */
.fam{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:500;color:var(--text-body)}
.fam::before{content:'';width:8px;height:8px;border-radius:50%;background:var(--fam-c,var(--text-muted))}
.fam--solaire{--fam-c:var(--fam-solaire)}.fam--securite{--fam-c:var(--fam-securite)}.fam--discretion{--fam-c:var(--fam-discretion)}

/* Chips */
.chip{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 9px;border-radius:var(--r-pill);font-size:11.5px;font-weight:500;background:var(--surface-alt);color:var(--text-body);box-shadow:inset 0 0 0 1px var(--border);white-space:nowrap}
.chip svg{width:12px;height:12px}
.chip--rot{background:#EEF2FF;color:#4338CA;box-shadow:inset 0 0 0 1px #C7D2FE}
.chip--les{background:#F0ECF5;color:#5C4E78;box-shadow:inset 0 0 0 1px #D9CEE8}

/* Carte film */
.film{background:var(--surface);border-radius:var(--r-card);box-shadow:var(--shadow-card);padding:22px 22px 8px;margin-bottom:14px;transition:box-shadow var(--dur) var(--ease)}
.film:hover{box-shadow:var(--shadow-hover)}
.film-head{display:flex;align-items:center;gap:14px;margin-bottom:16px}
.film-tile{width:42px;height:42px;border-radius:11px;display:grid;place-items:center;color:#fff;flex:none;box-shadow:0 1px 2px rgba(17,24,39,.15)}
.film-tile svg{width:22px;height:22px}
.film-id{flex:1;min-width:0}
.film-ref{font-size:16px;font-weight:700;letter-spacing:-.01em;color:var(--text)}
.film-ref .fab{font-size:12px;font-weight:500;color:var(--text-faint);margin-left:8px}
.film-sub{display:flex;align-items:center;gap:10px;margin-top:3px}
.film-nom{font-size:13px;color:var(--text-muted)}
.chute{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border-radius:var(--r-pill);font-size:12.5px;font-weight:600;white-space:nowrap;flex:none}
.chute .big{font-size:14px}
.chute--good{background:var(--green-bg);color:var(--green-tx);box-shadow:inset 0 0 0 1px var(--green-bd)}
.chute--mid{background:var(--amber-bg);color:var(--amber-tx);box-shadow:inset 0 0 0 1px var(--amber-bd)}
.chute--high{background:var(--red-bg);color:var(--red-tx);box-shadow:inset 0 0 0 1px var(--red-bd)}

/* Strip de remplissage (la bande, vue de dessus) */
.strip-wrap{margin-bottom:14px}
.strip-top{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:7px}
.strip-verdict{font-size:13px;color:var(--text-muted)}
.strip-verdict b{font-size:15px;font-weight:600;color:var(--text);letter-spacing:-.01em}
.strip-fill{font-size:12px;font-weight:600;color:var(--text-muted)}
.strip{position:relative;display:inline-block;max-width:100%;background:var(--surface-sunken);border-radius:var(--r-sub);box-shadow:inset 0 0 0 1px var(--border);padding:8px;overflow-x:auto;vertical-align:top}
.strip svg{height:96px;width:auto;border-radius:6px;overflow:visible}
.strip-legend{display:flex;align-items:center;gap:16px;margin-top:9px;font-size:11.5px;color:var(--text-faint);flex-wrap:wrap}
.lg{display:inline-flex;align-items:center;gap:6px}
.lg .sw{width:11px;height:11px;border-radius:3px}
.lg .sw--chute{background:repeating-linear-gradient(45deg,#fff,#fff 3px,var(--surface-sunken) 3px,var(--surface-sunken) 6px);box-shadow:inset 0 0 0 1px var(--border)}

/* Footer métrique + liste de coupe */
.film-foot{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12.5px;color:var(--text-muted);padding:6px 0 14px;border-top:1px solid var(--border);margin-top:4px}
.film-foot .strong{color:var(--text-body);font-weight:600}
details.cut{border-top:1px solid var(--border)}
.cut summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:9px;padding:14px 0;font-size:13px;font-weight:600;color:var(--text-body)}
.cut summary::-webkit-details-marker{display:none}
.cut summary .chev{width:15px;height:15px;color:var(--text-faint);transition:transform var(--dur) var(--ease)}
.cut[open] summary .chev{transform:rotate(90deg)}
.cut summary .ct{margin-left:auto;font-size:12px;font-weight:600;color:var(--text-muted);background:var(--surface-alt);box-shadow:inset 0 0 0 1px var(--border);border-radius:var(--r-pill);padding:1px 9px}
.cuttable{width:100%;border-collapse:collapse;margin-bottom:14px}
.cuttable th{text-align:left;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-faint);padding:0 0 8px;border-bottom:1px solid var(--border)}
.cuttable td{padding:11px 0;border-bottom:1px solid var(--border);font-size:13.5px;vertical-align:middle}
.cuttable tr:last-child td{border-bottom:none}
.cuttable .c-sw{width:26px}
.cuttable .sw{width:14px;height:14px;border-radius:4px;display:inline-block}
.cuttable .c-qty{font-weight:700;width:54px}
.cuttable .c-dim{font-weight:500}
.cuttable .c-src{color:var(--text-muted)}
.cuttable .c-tag{text-align:right}

/* === Saisie === */
.toolbar2{margin-bottom:6px}
.lead{font-size:14px;color:var(--text-muted);max-width:64ch;margin-bottom:24px}
.dtable{background:var(--surface);border-radius:var(--r-card);box-shadow:var(--shadow-card);overflow:hidden;margin-bottom:14px}
.dtable table{width:100%;border-collapse:collapse}
.dtable th{text-align:left;font-size:11.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--text-faint);padding:14px 18px;background:var(--surface-alt);border-bottom:1px solid var(--border);white-space:nowrap}
.dtable td{padding:14px 18px;border-bottom:1px solid var(--border);font-size:14px;color:var(--text-body);vertical-align:middle}
.dtable tr:last-child td{border-bottom:none}
.dtable tbody tr{transition:background var(--dur) var(--ease)}
.dtable tbody tr:hover{background:var(--surface-alt)}
.td-strong{font-weight:600;color:var(--text)}
.td-ref{display:inline-flex;align-items:center;gap:10px}
.ref-tile{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;color:#fff;flex:none}
.ref-tile svg{width:16px;height:16px}
.badge-st{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:var(--r-pill);font-size:12px;font-weight:600}
.badge-st--saisie{background:var(--surface-alt);color:var(--text-muted);box-shadow:inset 0 0 0 1px var(--border)}
.badge-st--lancee{background:var(--green-bg);color:var(--green-tx);box-shadow:inset 0 0 0 1px var(--green-bd)}
.attrs{display:inline-flex;gap:5px;flex-wrap:wrap}
.laizechips{display:inline-flex;gap:5px}
.lz{font-size:11.5px;font-weight:500;font-variant-numeric:tabular-nums;color:var(--text-body);background:var(--surface-alt);box-shadow:inset 0 0 0 1px var(--border);border-radius:6px;padding:2px 7px}
.linkish{color:var(--color-primary);font-weight:600;text-decoration:none}

/* Bloc de saisie rapide (fiche chantier) */
.savecard{background:var(--surface);border-radius:var(--r-card);box-shadow:var(--shadow-card);padding:20px 22px;margin-bottom:18px}
.savecard h3{font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px}
.savecard p{font-size:12.5px;color:var(--text-muted);margin-bottom:16px}
.saverow{display:grid;grid-template-columns:1fr 1fr 80px 1.4fr auto auto;gap:12px;align-items:end}
.field label{display:block;font-size:12px;font-weight:500;color:var(--text-body);margin-bottom:6px}
.field input,.field select{width:100%;height:40px;padding:0 12px;border:1px solid var(--border-strong);border-radius:var(--r-sm);font-size:14px;font-family:inherit;color:var(--text);background:#fff}
.field input:focus,.field select:focus{outline:none;border-color:var(--color-primary);box-shadow:0 0 0 3px rgba(47,90,158,.14)}
.check-inline{display:flex;align-items:center;gap:8px;height:40px;font-size:13px;color:var(--text-body);white-space:nowrap}
.check-inline input{width:17px;height:17px;accent-color:var(--color-primary)}

@media(max-width:880px){.kpis{grid-template-columns:1fr 1fr}.saverow{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.kpis{grid-template-columns:1fr}.page-title{font-size:25px}}
`;

// --- Strip de remplissage (SVG) --------------------------------------------------------------
function strip(plan: (typeof resultat.plans)[number]) {
	const H = 88; // hauteur d'affichage de la laize, px (rangées homogènes)
	const s = H / plan.laize_mm; // px par mm
	const W = Math.max(40, Math.round(plan.longueur_consommee_mm * s));
	const rects = plan.placements.map((pl) => {
		const x = Math.round(pl.y_mm * s);
		const y = Math.round(pl.x_mm * s);
		const w = Math.max(1, Math.round(pl.hauteur_placee_mm * s));
		const h = Math.max(1, Math.round(pl.largeur_placee_mm * s));
		const c = colorOf(pl.vitre_id);
		const showLbl = w > 30 && h > 22;
		const lbl = showLbl
			? `<text x="${x + w / 2}" y="${y + h / 2}" fill="${c}" font-size="9" font-weight="600" text-anchor="middle" dominant-baseline="central" font-family="'DM Mono',monospace">${pl.largeur_placee_mm}×${pl.hauteur_placee_mm}${pl.pivotee ? ' ↻' : ''}</text>`
			: '';
		return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" fill="${c}" fill-opacity="0.16" stroke="${c}" stroke-width="1.25"/>${lbl}</g>`;
	}).join('');
	// séparateurs de lés (lignes pointillées verticales aux frontières de bandes)
	const laizeLine = `<line x1="0" y1="${H}" x2="${W}" y2="${H}" stroke="#D1D5DB" stroke-width="1"/>`;
	return `<div class="strip"><svg viewBox="0 0 ${W} ${H + 1}" preserveAspectRatio="xMinYMin meet" role="img" aria-label="Plan de remplissage du film ${refOf(plan.produit_id)} : laize ${plan.laize_mm} mm sur ${m(plan.longueur_consommee_mm)}">
		<defs><pattern id="hatch-${plan.produit_id}" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#fff"/><line x1="0" y1="0" x2="0" y2="6" stroke="#EEF0F2" stroke-width="3"/></pattern></defs>
		<rect x="0" y="0" width="${W}" height="${H}" rx="4" fill="url(#hatch-${plan.produit_id})" stroke="#E5E7EB" stroke-width="1"/>
		${rects}${laizeLine}
	</svg></div>`;
}

// --- Carte film ------------------------------------------------------------------------------
function filmCard(plan: (typeof resultat.plans)[number]) {
	const fam = familleOf(plan.produit_id);
	const famColor = fam === 'solaire' ? '#d98a23' : fam === 'discretion' ? '#7b6a9a' : '#3d6b8a';
	const cls = chuteClass(plan.taux_chute);
	const rollSurfP = plan.laize_mm * plan.longueur_consommee_mm;
	const remplP = rollSurfP > 0 ? plan.surface_pieces_mm2 / rollSurfP : 0;
	const groups = cutGroups(plan);
	const rows = groups.map((g) => {
		const tags = [g.pivot ? `<span class="chip chip--rot">${ic.rotate}pivotée</span>` : '', g.les ? `<span class="chip chip--les">${ic.layers}en lés</span>` : ''].filter(Boolean).join(' ');
		return `<tr><td class="c-sw"><span class="sw" style="background:${colorOf(g.vitre_id)};opacity:.85"></span></td><td class="c-qty num">×${g.n}</td><td class="c-dim num">${g.w} × ${g.h} mm</td><td class="c-src num">${vitreLabel(g.vitre_id)}</td><td class="c-tag">${tags}</td></tr>`;
	}).join('');
	return `<article class="film">
	<div class="film-head">
		<span class="film-tile" style="background:${famColor}">${ic.scissors}</span>
		<div class="film-id">
			<div class="film-ref">${refOf(plan.produit_id)}<span class="fab">${produitsInfo[plan.produit_id]?.fabricant ?? ''}</span></div>
			<div class="film-sub"><span class="film-nom">${nomOf(plan.produit_id)}</span><span class="fam fam--${fam}">${FAMILLE_LABEL[fam]}</span></div>
		</div>
		<span class="chute chute--${cls}">${ic.scissors}<span class="big num">${pct(plan.taux_chute)} %</span>&nbsp;de chute</span>
	</div>
	<div class="strip-wrap">
		<div class="strip-top">
			<span class="strip-verdict">À découper&nbsp;&nbsp;<b class="num">Laize ${plan.laize_mm} mm × ${m(plan.longueur_consommee_mm)}</b></span>
			<span class="strip-fill num">remplissage ${pct(remplP)} %</span>
		</div>
		${strip(plan)}
		<div class="strip-legend">
			<span class="lg"><span class="sw" style="background:#5A7190;opacity:.35"></span>pièces posées</span>
			<span class="lg"><span class="sw sw--chute"></span>chute</span>
			<span class="lg">échelle : la longueur du film est à l'échelle de la consommation</span>
		</div>
	</div>
	<div class="film-foot"><span class="strong">${plan.placements.length} pièce${plan.placements.length > 1 ? 's' : ''}</span><span class="dot-sep"></span><span class="num">${m2(plan.surface_pieces_mm2)} utiles</span><span class="dot-sep"></span><span class="num">${m2(rollSurfP - plan.surface_pieces_mm2)} de chute</span></div>
	<details class="cut">
		<summary>${ic.chevron && `<span class="chev">${ic.chevron}</span>`}Liste de coupe ordonnée<span class="ct num">${plan.placements.length}</span></summary>
		<table class="cuttable"><thead><tr><th></th><th>Qté</th><th>Dimension de coupe</th><th>Vitre source</th><th></th></tr></thead><tbody>${rows}</tbody></table>
	</details>
</article>`;
}

// --- Bloc alertes / commande -----------------------------------------------------------------
const alertesHtml = resultat.alertes.length
	? `<section><div class="callout"><span class="callout-ico">${ic.alert}</span><div class="callout-body"><div class="callout-title">${resultat.alertes.length} point${resultat.alertes.length > 1 ? 's' : ''} à vérifier avant de lancer</div><ul class="callout-list">${resultat.alertes.map((a) => `<li><b>${a.type === 'piece_non_placable' ? 'Pièce non plaçable' : 'Produit non nestable'}</b> — ${a.message}${vitreLabel(a.vitre_id) ? `<span class="tagvit num">${vitreLabel(a.vitre_id)}</span>` : ''}</li>`).join('')}</ul></div></div></section>`
	: '';

const commandeHtml = resultat.commandes_fournisseur.length
	? `<section><h2 class="sec-h">${ic.truck && ''}À commander chez le fournisseur<span class="count">· ${resultat.commandes_fournisseur.length}</span></h2><div class="ordercard">${resultat.commandes_fournisseur.map((c) => {
			const pid = vitresInfo[c.vitre_id]?.produit_id ?? '';
			const fam = familleOf(pid);
			const famColor = fam === 'solaire' ? '#d98a23' : fam === 'discretion' ? '#7b6a9a' : '#3d6b8a';
			return `<div class="order-row"><span class="order-ico" style="background:${famColor}">${ic.box}</span><div class="order-main"><div class="order-ref">${refOf(pid)}<span class="nom">${nomOf(pid)}</span></div><div class="order-dim num">${vitreLabel(c.vitre_id)}</div></div><span class="chip">${RAISON_LABEL[c.raison] ?? c.raison}</span></div>`;
		}).join('')}<div class="order-foot">${ic.info && ''}Ces pièces sortent de la découpe interne (sur-mesure ou produit non nestable).</div></div></section>`
	: '';

// --- Document : écran résultat ---------------------------------------------------------------
const sparkChute = (() => {
	// petit arc-jauge pour le KPI chute
	const r = 18, cx = 23, cy = 23, circ = 2 * Math.PI * r;
	const frac = Math.min(1, chuteMoy);
	const cClr = chuteMoy * 100 <= 15 ? 'var(--green)' : chuteMoy * 100 <= 30 ? 'var(--amber)' : 'var(--red)';
	return `<svg class="kpi-spark" viewBox="0 0 46 46"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--surface-sunken)" stroke-width="5"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${cClr}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(circ * frac).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/></svg>`;
})();
const chuteColorVar = chuteMoy * 100 <= 15 ? 'var(--green-tx)' : chuteMoy * 100 <= 30 ? 'var(--amber-tx)' : 'var(--red-tx)';

const optimisationHtml = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Golden v4 · Résultat Découpe Films</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${CSS}</style></head>
<body>
<div class="goldbar">GOLDEN v4 — Résultat Découpe Films · refonte premium issue du benchmark métier (CutTool, CutList, marker textile) · plan calculé par le vrai algo · ne pas déployer tel quel</div>
<header class="hdr"><div class="hdr-in">${LOGO_SVG}<div class="hdr-right"><span class="avatar">PM</span></div></div></header>
<div class="toolbar"><div class="toolbar-in"><span class="tool-name"><span class="tool-ico">${ic.scissors}</span>Découpe Films</span><nav class="tool-nav"><a href="golden-saisie.html">Chantiers</a><a href="golden-saisie.html">Base produit</a><a href="#" class="active">Résultat</a></nav></div></div>
<main>
	<a href="golden-saisie.html" class="back">${ic.chevron}Villa Léman, étage 2</a>
	<div class="page-head">
		<div class="ph-l">
			<div class="kicker">Résultat de l'optimisation</div>
			<h1 class="page-title">Villa Léman, étage 2</h1>
			<div class="page-meta"><span>${vitres.length} vitres saisies</span><span class="dot-sep"></span><span>${resultat.plans.length} films · ${resultat.commandes_fournisseur.length} à commander</span><span class="dot-sep"></span><span class="num">calculé à 14:32</span></div>
		</div>
		<div class="ph-r">
			<span class="statepill statepill--${statutGlobal === 'ok' ? 'ok' : 'warn'}">${statutGlobal === 'ok' ? ic.check : ic.alert}${statutGlobal === 'ok' ? 'Prêt à découper' : 'À vérifier'}</span>
			<button class="btn btn-ghost">${ic.printer}Exporter en PDF</button>
			<button class="btn btn-primary">${ic.check}Lancer la découpe</button>
		</div>
	</div>

	<div class="kpis">
		<div class="kpi kpi--chute" style="--kpi-c:${chuteColorVar}">${sparkChute}
			<div class="kpi-lbl">${ic.scissors && '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/></svg>'}Taux de chute</div>
			<div class="kpi-val num">${pct(chuteMoy)} <span class="unit">%</span></div>
			<div class="kpi-sub">remplissage <b class="num">${pct(remplMoy)} %</b> · <span class="num">${m2(pieceSurf)}</span> utiles sur <span class="num">${m2(rollSurf)}</span></div>
		</div>
		<div class="kpi" style="--kpi-c:var(--color-primary)">
			<div class="kpi-lbl">${ic.ruler}Film à découper</div>
			<div class="kpi-val num">${(totalLong / 1000).toFixed(2).replace('.', ',')} <span class="unit">m</span></div>
			<div class="kpi-sub">${economieLong > 0 ? `<b class="num">${(economieLong / 1000).toFixed(1).replace('.', ',')} m économisés</b> vs pose séquentielle` : 'aucun regroupement possible'}</div>
		</div>
		<div class="kpi" style="--kpi-c:var(--color-primary)">
			<div class="kpi-lbl">${ic.layers}Films · pièces</div>
			<div class="kpi-val num">${resultat.plans.length} <span class="unit">films</span></div>
			<div class="kpi-sub"><b class="num">${nbPieces} pièces</b> posées en découpe interne</div>
		</div>
		<div class="kpi" style="--kpi-c:var(--amber-tx)">
			<div class="kpi-lbl">${ic.truck}À commander</div>
			<div class="kpi-val num">${resultat.commandes_fournisseur.length} <span class="unit">pièces</span></div>
			<div class="kpi-sub">sur-mesure ou produit non nestable</div>
		</div>
	</div>

	${alertesHtml}
	${commandeHtml}

	<h2 class="sec-h">Découpe interne<span class="count">· ${resultat.plans.length} film${resultat.plans.length > 1 ? 's' : ''}</span></h2>
	${resultat.plans.map(filmCard).join('\n')}
</main>
</body></html>`;

// --- Document : écran de saisie (chantiers + base produit + fiche) ---------------------------
const chantiersDemo = [
	{ nom: 'Villa Léman, étage 2', client: 'Régie Dupont', nb: 6, statut: 'saisie', fams: ['solaire', 'securite', 'discretion'], date: '5 juin' },
	{ nom: 'Bureaux Acacias', client: 'Facility CH', nb: 12, statut: 'lancee', fams: ['solaire', 'securite'], date: '3 juin' },
	{ nom: 'Clinique du Parc', client: 'BE Architectes', nb: 21, statut: 'saisie', fams: ['discretion', 'securite'], date: '1 juin' }
];
const baseProduitDemo = Object.entries(produitsInfo).map(([id, info]) => ({ id, ...info, p: produits[id] }));

function famTile(fam: string) {
	const c = fam === 'solaire' ? '#d98a23' : fam === 'discretion' ? '#7b6a9a' : '#3d6b8a';
	return { c };
}

const chantierRows = chantiersDemo.map((c) => `<tr>
	<td><a class="linkish" href="golden-optimisation.html">${c.nom}</a></td>
	<td>${c.client}</td>
	<td class="num td-strong">${c.nb}</td>
	<td><span class="attrs">${c.fams.map((f) => `<span class="fam fam--${f}">${FAMILLE_LABEL[f]}</span>`).join('')}</span></td>
	<td><span class="badge-st badge-st--${c.statut}">${c.statut === 'lancee' ? ic.check + 'Lancée' : 'En saisie'}</span></td>
	<td class="num c-src" style="color:var(--text-muted)">${c.date}</td>
</tr>`).join('');

const produitRows = baseProduitDemo.map((p) => {
	const t = famTile(p.famille);
	const attrs = [
		p.p.orientation_imposee ? `<span class="chip">${ic.rotate}orientation imposée</span>` : `<span class="chip">rotation libre</span>`,
		p.p.jointage_autorise ? `<span class="chip chip--les">${ic.layers}jointage</span>` : '',
		p.p.nestable ? `<span class="chip" style="background:var(--green-bg);color:var(--green-tx);box-shadow:inset 0 0 0 1px var(--green-bd)">${ic.check}nestable</span>` : `<span class="chip" style="background:var(--amber-bg);color:var(--amber-tx);box-shadow:inset 0 0 0 1px var(--amber-bd)">non nestable</span>`
	].filter(Boolean).join(' ');
	return `<tr>
		<td><span class="td-ref"><span class="ref-tile" style="background:${t.c}">${ic.scissors}</span><span class="td-strong">${p.reference}</span></span></td>
		<td>${p.nom}</td>
		<td><span class="fam fam--${p.famille}">${FAMILLE_LABEL[p.famille]}</span></td>
		<td class="c-src">${p.fabricant}</td>
		<td><span class="laizechips">${p.p.laizes_mm.map((l) => `<span class="lz">${l}</span>`).join('')}</span></td>
		<td><span class="attrs">${attrs}</span></td>
	</tr>`;
}).join('');

const vitreRows = vitres.map((v) => {
	const fam = familleOf(v.produit_id);
	const tags = v.sur_mesure_fournisseur ? `<span class="chip" style="background:var(--amber-bg);color:var(--amber-tx);box-shadow:inset 0 0 0 1px var(--amber-bd)">${ic.truck}sur-mesure fournisseur</span>` : '';
	return `<tr>
		<td class="num td-strong">${v.largeur_mm} × ${v.hauteur_mm} mm</td>
		<td class="num">×${v.quantite}</td>
		<td><span class="td-ref"><span class="sw" style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${colorOf(v.id)};opacity:.85;margin-right:8px"></span>${refOf(v.produit_id)} <span class="c-src" style="color:var(--text-muted)">${nomOf(v.produit_id)}</span></span></td>
		<td><span class="fam fam--${fam}">${FAMILLE_LABEL[fam]}</span></td>
		<td>${tags}</td>
	</tr>`;
}).join('');

const produitOptions = baseProduitDemo.map((p) => `<option>${p.reference} — ${p.nom}</option>`).join('');

const saisieHtml = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Golden v4 · Saisie Découpe Films</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${CSS}</style></head>
<body>
<div class="goldbar">GOLDEN v4 — Saisie Découpe Films (chantiers · base produit · fiche) · même langage premium que le résultat · ne pas déployer tel quel</div>
<header class="hdr"><div class="hdr-in">${LOGO_SVG}<div class="hdr-right"><span class="avatar">PM</span></div></div></header>
<div class="toolbar"><div class="toolbar-in"><span class="tool-name"><span class="tool-ico">${ic.scissors}</span>Découpe Films</span><nav class="tool-nav"><a href="#" class="active">Chantiers</a><a href="#chap-produits">Base produit</a><a href="golden-optimisation.html">Résultat</a></nav></div></div>
<main>
	<div class="page-head"><div class="ph-l"><div class="kicker">Découpe Films</div><h1 class="page-title">Chantiers</h1></div><div class="ph-r"><button class="btn btn-primary">${ic.scissors}Nouveau chantier</button></div></div>
	<p class="lead">Saisissez les vitres d'un chantier, l'outil calcule le plan de découpe qui limite les chutes.</p>
	<div class="dtable"><table><thead><tr><th>Chantier</th><th>Client</th><th>Vitres</th><th>Familles</th><th>Statut</th><th>Maj</th></tr></thead><tbody>${chantierRows}</tbody></table></div>

	<h2 class="sec-h" id="chap-fiche">Fiche chantier · saisie des vitres</h2>
	<div class="page-head"><div class="ph-l"><div class="kicker">Régie Dupont · en saisie</div><h2 class="page-title" style="font-size:24px">Villa Léman, étage 2</h2></div><div class="ph-r"><button class="btn btn-primary">${ic.check}Optimiser ce chantier</button></div></div>
	<div class="savecard">
		<h3>Ajouter une vitre</h3>
		<p>Saisie rapide : la ligne reste prête pour la vitre suivante.</p>
		<div class="saverow">
			<div class="field"><label>Largeur (mm)</label><input value="1200" inputmode="numeric"></div>
			<div class="field"><label>Hauteur (mm)</label><input value="800" inputmode="numeric"></div>
			<div class="field"><label>Qté</label><input value="4" inputmode="numeric"></div>
			<div class="field"><label>Produit</label><select>${produitOptions}</select></div>
			<label class="check-inline"><input type="checkbox"> Sur-mesure</label>
			<button class="btn btn-primary btn-sm">Ajouter</button>
		</div>
	</div>
	<div class="dtable"><table><thead><tr><th>Dimensions</th><th>Qté</th><th>Produit</th><th>Famille</th><th></th></tr></thead><tbody>${vitreRows}</tbody></table></div>

	<h2 class="sec-h" id="chap-produits">Base produit</h2>
	<div class="dtable"><table><thead><tr><th>Réf.</th><th>Nom</th><th>Famille</th><th>Fabricant</th><th>Laizes (mm)</th><th>Attributs</th></tr></thead><tbody>${produitRows}</tbody></table></div>
</main>
</body></html>`;

// --- Écriture --------------------------------------------------------------------------------
const outOpt = new URL('../.product-architect/decoupe/golden-optimisation.html', import.meta.url);
const outSai = new URL('../.product-architect/decoupe/golden-saisie.html', import.meta.url);
writeFileSync(outOpt, optimisationHtml, 'utf-8');
writeFileSync(outSai, saisieHtml, 'utf-8');
console.log('Plans:', resultat.plans.length, '| Pièces:', nbPieces, '| Commandes:', resultat.commandes_fournisseur.length, '| Alertes:', resultat.alertes.length);
console.log('Chute moy:', pct(chuteMoy) + '%', '| Remplissage:', pct(remplMoy) + '%', '| Long:', m(totalLong), '| Économie:', m(economieLong));
console.log('Golden v4 résultat :', outOpt.pathname);
console.log('Golden v4 saisie   :', outSai.pathname);

// QA increment "CTAs desktop Prospection" (cohérence UI, flag ff_ui_coherence). Objectif ZÉRO ANGLE MORT :
// tout invariant est MESURÉ sur le rendu DOM réel (dev server + supabase local), rien n'est "raisonné".
//
// Dimensions couvertes :
//   États flags : off (coherence null) · on (coherence seul) · mixed (coherence ON + page_bandeau ON = prod pascal@).
//   Largeurs : 767 (mobile double-hidden) → 1920 (au-delà du cap d1 1440).
//   Accessibilité : prefers-reduced-motion:reduce (la primitive .ws-btn coupe sa transition ; on aligne).
//   Boutons dormants : le CTA violet « Enrichir » est coupé en config → injecté live pour prouver la teinte.
//
// Invariants vérifiés :
//   1. FAUX-VERT display : none@767 / flex@≥768, IDENTIQUE off==on==mixed (l'override ne touche pas display).
//   2. Effet ON/mixed : padding-x==16, font-weight==600 sur chaque CTA rendu.
//   3. OFF inerte (byte-identical) : padding/poids == valeurs utilities d'origine.
//   4. Teinte préservée : color+border IDENTIQUES off==on==mixed (le violet enrich et le bleu ne bougent pas)
//      + preuve dormant : bouton enrich injecté AVEC vs SANS le hook → même color/border.
//   5. Collision onglets↔CTA=false ET débordement page=false (3 onglets réels) à chaque largeur, on ET mixed ;
//      5 onglets simulés : collision reste false ; le débordement page 5-onglets est un latent tabs-bar
//      pré-existant (watch simap/regbl) → exigé seulement "pas aggravé vs OFF".
//   6. Focus ring : keyboard-focus → outline 2px (fourni globalement par app.css:311-325, off comme on).
//   7. reduced-motion : ON, transition-duration == 0s (garde alignée sur .ws-btn).
// Usage : node tests/_qa-coherence-cta-prospection.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const email = 'pascal@filmpro.ch';
function le(p){const o={};for(const l of readFileSync(p,'utf8').split('\n')){const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(!m)continue;let v=m[2].trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);v=v.replace(/(\\n|\s)+$/,'');o[m[1]]=v;}return o;}
const env = le(new URL('../.env.development.local', import.meta.url).pathname);
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(env.PUBLIC_SUPABASE_URL)) throw new Error('non-local');
const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
const u = list.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
const storage = JSON.parse(readFileSync(new URL('./.auth.local.json', import.meta.url).pathname, 'utf8'));

// états : coherence + bandeau (mixed = prod pascal@)
async function setFlags(coherence, bandeau) {
	const meta = { ...(u.app_metadata || {}) };
	meta.ff_crm_listes_v2 = true;
	meta.ff_ui_coherence = coherence ? true : null;
	meta.ff_page_bandeau = bandeau ? true : null;
	await admin.auth.admin.updateUserById(u.id, { app_metadata: meta });
}

function measureCtas() {
	return [...document.querySelectorAll('.coh-prosp-cta')].map((b) => {
		const cs = getComputedStyle(b);
		return {
			label: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
			tag: b.tagName.toLowerCase(),
			display: cs.display,
			pl: Math.round(parseFloat(cs.paddingLeft)),
			pr: Math.round(parseFloat(cs.paddingRight)),
			pt: Math.round(parseFloat(cs.paddingTop)),
			pb: Math.round(parseFloat(cs.paddingBottom)),
			h: Math.round(b.getBoundingClientRect().height),
			fw: cs.fontWeight,
			color: cs.color,
			border: cs.borderColor,
			transDur: cs.transitionDuration,
		};
	});
}

function measureLayout(inject5) {
	const bar = document.querySelector('.tabs-bar');
	const actions = document.querySelector('.tabs-actions');
	if (!bar || !actions) return { absent: true };
	if (inject5) {
		const src = bar.querySelector('.tab');
		['Marchés publics', 'Chantiers'].forEach((lbl) => {
			const c = src.cloneNode(true);
			const l = c.querySelector('.tab-label'); if (l) l.textContent = lbl;
			bar.appendChild(c);
		});
	}
	const barR = bar.getBoundingClientRect();
	const actR = actions.getBoundingClientRect();
	const tabs = [...bar.querySelectorAll('.tab')];
	const lastR = tabs.length ? tabs[tabs.length - 1].getBoundingClientRect() : null;
	const wrapped = actR.top - barR.top > 20;
	const collision = !wrapped && lastR ? actR.left < lastR.right - 1 : false;
	const de = document.documentElement;
	return { tabCount: tabs.length, wrapped, collision, pageOverflow: de.scrollWidth > de.clientWidth + 1, sw: de.scrollWidth, cw: de.clientWidth };
}

// injecte un bouton "Enrichir" (dormant en config) avec les MÊMES classes utilities que le vrai + le hook,
// vs un jumeau SANS le hook → prouve (non-vacue) que l'override S'APPLIQUE (padding 16) mais ne re-teinte
// PAS le violet enrich (color/border). NB : l'override Svelte est scopé (.coh-prosp-cta.svelte-HASH) → on
// copie le hash de scope d'un vrai bouton hooké sur l'injecté, sinon l'override ne matcherait pas (vacue).
function measureDormantEnrich() {
	const actions = document.querySelector('.tabs-actions');
	const proto = document.querySelector('.coh-prosp-cta'); // vrai bouton hooké → porte le hash de scope svelte
	if (!actions || !proto) return { absent: true };
	const svelteCls = [...proto.classList].find((c) => /^svelte-/.test(c)) || '';
	const enrichCls = 'hidden md:inline-flex items-center gap-2 h-10 px-3 box-border text-sm font-medium border rounded-lg cursor-pointer transition-colors text-prosp-enrich-deep border-prosp-enrich-border hover:bg-prosp-enrich-bg';
	const mk = (withHook) => {
		const b = document.createElement('button');
		b.className = enrichCls + (svelteCls ? ' ' + svelteCls : '') + (withHook ? ' coh-prosp-cta' : '');
		b.textContent = 'Enrichir cette page';
		actions.appendChild(b);
		const cs = getComputedStyle(b);
		const r = { color: cs.color, border: cs.borderColor, pl: Math.round(parseFloat(cs.paddingLeft)), fw: cs.fontWeight };
		b.remove();
		return r;
	};
	return { withHook: mk(true), without: mk(false), svelteCls };
}

const WIDTHS = [767, 768, 1024, 1200, 1280, 1366, 1440, 1920];
const browser = await chromium.launch();
const out = { cta: { off: {}, on: {}, mixed: {} }, layout: { off: {}, on: {}, mixed: {} }, special: {} };

const STATES = [
	{ key: 'off', coh: false, band: false },
	{ key: 'on', coh: true, band: false },
	{ key: 'mixed', coh: true, band: true },
];

for (const st of STATES) {
	await setFlags(st.coh, st.band);
	for (const w of WIDTHS) {
		const ctx = await browser.newContext({ storageState: storage, viewport: { width: w, height: 900 } });
		const pg = await ctx.newPage();
		await pg.goto('http://localhost:5173/crm/prospection', { waitUntil: 'networkidle' });
		await pg.waitForTimeout(250);
		out.cta[st.key][w] = await pg.evaluate(measureCtas);
		out.layout[st.key][w] = { t3: await pg.evaluate(measureLayout, false), t5: await pg.evaluate(measureLayout, true) };
		if (st.key === 'on' && w === 1440) {
			out.special.dormantEnrich = await pg.evaluate(measureDormantEnrich);
			let ring = null;
			for (let i = 0; i < 60; i++) {
				await pg.keyboard.press('Tab');
				const r = await pg.evaluate(() => {
					const a = document.activeElement;
					if (a?.classList?.contains('coh-prosp-cta')) { const cs = getComputedStyle(a); return { label: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30), outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor }; }
					return null;
				});
				if (r) { ring = r; break; }
			}
			out.special.focusRing = ring;
		}
		await ctx.close();
	}
}

// reduced-motion : coherence ON, prefers-reduced-motion:reduce → transition doit être coupée (0s)
{
	await setFlags(true, false);
	const ctx = await browser.newContext({ storageState: storage, viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
	const pg = await ctx.newPage();
	await pg.goto('http://localhost:5173/crm/prospection', { waitUntil: 'networkidle' });
	await pg.waitForTimeout(250);
	out.special.reducedMotion = await pg.evaluate(() => {
		const b = document.querySelector('.coh-prosp-cta');
		return b ? { transDur: getComputedStyle(b).transitionDuration } : { absent: true };
	});
	await ctx.close();
}

await setFlags(false, false); // resting state propre
await browser.close();

// ---------------- verdict déterministe ----------------
const errs = [];
const knownLatent = [];
const REND_STATES = ['on', 'mixed'];

for (const w of WIDTHS) {
	const off = out.cta.off[w] || [];
	// 1+4 : off/on/mixed IDENTIQUES sur display + color + border (faux-vert + teinte)
	for (const s of REND_STATES) {
		const cur = out.cta[s][w] || [];
		if (off.length !== cur.length) { errs.push(`w${w} ${s}: nb CTA off ${off.length} != ${cur.length}`); continue; }
		for (let i = 0; i < cur.length; i++) {
			const a = off[i], b = cur[i];
			if (a.display !== b.display) errs.push(`w${w} ${s} "${b.label}": display off ${a.display} != ${b.display} (FAUX-VERT)`);
			if (a.color !== b.color) errs.push(`w${w} ${s} "${b.label}": color off ${a.color} != ${b.color} (teinte modifiee)`);
			if (a.border !== b.border) errs.push(`w${w} ${s} "${b.label}": border off ${a.border} != ${b.border} (teinte modifiee)`);
			if (b.display !== 'none') { // 2 : effet visible ON/mixed - ASSERTÉ, pas transitif
				if (b.pl !== 16 || b.pr !== 16) errs.push(`w${w} ${s} "${b.label}": padding-x ${b.pl}/${b.pr} != 16`);
				if (b.pt !== 8 || b.pb !== 8) errs.push(`w${w} ${s} "${b.label}": padding-y ${b.pt}/${b.pb} != 8 (dimension verticale)`);
				if (b.h !== 40) errs.push(`w${w} ${s} "${b.label}": hauteur ${b.h} != 40 (clipping/désalignement des jumeaux)`);
				if (b.fw !== '600') errs.push(`w${w} ${s} "${b.label}": font-weight ${b.fw} != 600`);
				if (!/^0\.22s/.test(b.transDur)) errs.push(`w${w} ${s} "${b.label}": transition-duration ${b.transDur} != 0.22s (override transition non appliqué)`);
			}
		}
	}
	// 3 : OFF inerte ABSOLU (pas seulement off==?) - prouve que ni le padding ni la transition de l'override
	//     ne s'appliquent OFF (l'invariant « OFF byte-identical » devient ASSERTÉ, pas seulement architectural).
	for (const b of (out.cta.off[w] || [])) {
		if (b.display === 'none') continue;
		if (/^0\.22s/.test(b.transDur)) errs.push(`w${w} off "${b.label}": transition 0.22s appliquée OFF (override non inerte)`);
		if (b.h !== 40) errs.push(`w${w} off "${b.label}": hauteur ${b.h} != 40`);
		if (/Exporter CSV/.test(b.label) && b.pl !== 12) errs.push(`w${w} off "Exporter CSV": padding-x ${b.pl} != 12 (px-3 d'origine ; override appliqué OFF ?)`);
	}
	// 5 : layout on + mixed (t3 dur, t5 latent)
	for (const s of REND_STATES) {
		const on = out.layout[s][w], offL = out.layout.off[w];
		if (!on) continue;
		if (!on.t3.absent) {
			if (on.t3.collision) errs.push(`w${w} ${s} 3 onglets: COLLISION`);
			if (on.t3.pageOverflow) errs.push(`w${w} ${s} 3 onglets: DEBORDEMENT page sw${on.t3.sw}>cw${on.t3.cw}`);
		} else if (w >= 768) errs.push(`w${w} ${s} 3 onglets: tabs-shell absente`);
		if (!on.t5.absent) {
			if (on.t5.collision) errs.push(`w${w} ${s} 5 onglets: COLLISION (wrap ne protege plus)`);
			if (offL && !offL.t5.absent && on.t5.sw > offL.t5.sw + 1) errs.push(`w${w} ${s} 5 onglets: increment AGGRAVE debordement (${on.t5.sw} > off ${offL.t5.sw})`);
			else if (on.t5.pageOverflow && s === 'on') knownLatent.push(`w${w} 5 onglets: debordement pre-existant sw${on.t5.sw}>cw${on.t5.cw} (== baseline, latent tabs-bar/watch simap-regbl)`);
		}
	}
}
// 4 (dormant) : bouton enrich AVEC hook == SANS hook sur color+border (teinte violette intacte), padding 16 avec hook
const de = out.special.dormantEnrich;
if (!de || de.absent) errs.push('dormant enrich: non mesurable (actions absente)');
else {
	if (de.withHook.color !== de.without.color) errs.push(`dormant enrich: color avec-hook ${de.withHook.color} != sans ${de.without.color} (violet altere)`);
	if (de.withHook.border !== de.without.border) errs.push(`dormant enrich: border avec-hook ${de.withHook.border} != sans ${de.without.border} (violet altere)`);
	if (de.withHook.pl !== 16) errs.push(`dormant enrich: padding avec-hook ${de.withHook.pl} != 16`);
}
// 6 focus ring
if (!out.special.focusRing) errs.push('focus ring : aucun CTA atteint au clavier');
else if (!/^2px$/.test(out.special.focusRing.outlineWidth)) errs.push(`focus ring : outline ${out.special.focusRing.outlineWidth} != 2px`);
// 7 reduced-motion : transition coupee ON
const rm = out.special.reducedMotion;
if (!rm || rm.absent) errs.push('reduced-motion: CTA non mesurable');
else if (!/^0s$/.test(rm.transDur)) errs.push(`reduced-motion: transition-duration ${rm.transDur} != 0s (garde absente)`);

console.log(JSON.stringify(out, null, 2));
console.log('\n=== VERDICT ===');
if (out.special.focusRing) console.log(`focus ring : "${out.special.focusRing.label}" ${out.special.focusRing.outlineWidth} ${out.special.focusRing.outlineColor}`);
if (rm && !rm.absent) console.log(`reduced-motion ON : transition-duration ${rm.transDur}`);
if (de && !de.absent) console.log(`dormant enrich : hook color ${de.withHook.color} == sans ${de.without.color} ? ${de.withHook.color === de.without.color}`);
if (knownLatent.length) { console.log('LATENT PRE-EXISTANT (non regressif, hors scope) :'); knownLatent.forEach((e) => console.log(' ~ ' + e)); }
if (errs.length === 0) console.log('OK : tous les invariants CTA prospection verts (off/on/mixed, 767-1920, reduced-motion, dormant enrich).');
else { console.log(`${errs.length} PROBLEME(S) :`); errs.forEach((e) => console.log(' - ' + e)); }
process.exit(errs.length === 0 ? 0 : 1);

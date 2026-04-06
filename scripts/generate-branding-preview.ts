#!/usr/bin/env npx tsx
/**
 * Genere une page HTML de presentation des themes branding depuis _catalogue.yaml.
 * Usage : npx tsx scripts/generate-branding-preview.ts [--output dir]
 * Par defaut : sortie dans previews/branding.html
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const outputIdx = args.indexOf('--output');
let outputDir: string | undefined;
if (outputIdx !== -1) {
	outputDir = args[outputIdx + 1];
	args.splice(outputIdx, 2);
}

const PREVIEWS = outputDir ? resolve(outputDir) : resolve(ROOT, 'previews');

interface ThemeColors {
	primary: string;
	primary_hover?: string;
	accent: string;
	background: string;
	surface: string;
	surface_raised: string;
	text_primary: string;
	text_body: string;
	status: { success: string; warning: string; danger: string; info: string };
}

interface Theme {
	nom: string;
	ambiance: string;
	style: string;
	couleurs: ThemeColors;
	typographie: { font: string; mono: string; font_url: string };
}

interface Catalogue {
	themes: Record<string, Theme>;
}

const cataloguePath = resolve(ROOT, 'branding', '_catalogue.yaml');
const catalogue = yaml.load(readFileSync(cataloguePath, 'utf-8')) as Catalogue;

function fontLinks(themes: Record<string, Theme>): string {
	const urls = new Set<string>();
	for (const t of Object.values(themes)) {
		urls.add(t.typographie.font_url);
	}
	return [...urls].map(u => `<link href="${u}" rel="stylesheet">`).join('\n    ');
}

function themeCard(key: string, theme: Theme, isDefault: boolean): string {
	const c = theme.couleurs;
	const font = theme.typographie.font;
	const mono = theme.typographie.mono;
	const defaultBadge = isDefault ? `<span style="background:${c.accent};color:#fff;font-size:11px;padding:2px 8px;border-radius:9999px;margin-left:8px;">Par défaut</span>` : '';

	return `
    <div style="border:1px solid ${c.text_body}20;border-radius:12px;overflow:hidden;background:${c.background};">
      <!-- Header -->
      <div style="background:${c.primary};padding:20px 24px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <h2 style="margin:0;font-family:'${font}',sans-serif;font-size:20px;font-weight:700;color:#fff;">${theme.nom}${defaultBadge}</h2>
          <p style="margin:4px 0 0;font-family:'${font}',sans-serif;font-size:13px;color:#ffffffcc;">${theme.ambiance}</p>
        </div>
        <span style="font-family:'${font}',sans-serif;font-size:11px;color:#ffffff99;background:#ffffff15;padding:4px 10px;border-radius:6px;">${theme.style}</span>
      </div>

      <!-- Body -->
      <div style="padding:24px;">
        <!-- Color swatches -->
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
          ${colorSwatch(c.primary, 'Primary')}
          ${colorSwatch(c.accent, 'Accent')}
          ${colorSwatch(c.background, 'Background', c.text_body)}
          ${colorSwatch(c.surface, 'Surface', c.text_body)}
          ${colorSwatch(c.text_primary, 'Text')}
          ${colorSwatch(c.status.success, 'Success')}
          ${colorSwatch(c.status.warning, 'Warning')}
          ${colorSwatch(c.status.danger, 'Danger')}
        </div>

        <!-- Typography sample -->
        <div style="margin-bottom:16px;">
          <h3 style="font-family:'${font}',sans-serif;font-size:16px;font-weight:600;color:${c.text_primary};margin:0 0 4px;">Titre en ${font}</h3>
          <p style="font-family:'${font}',sans-serif;font-size:14px;color:${c.text_body};margin:0 0 8px;line-height:1.5;">
            Corps de texte — Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus.
          </p>
          <code style="font-family:'${mono}',monospace;font-size:13px;background:${c.surface};padding:4px 8px;border-radius:4px;color:${c.accent};">code: ${mono}</code>
        </div>

        <!-- Mini UI mockup -->
        <div style="background:${c.surface};border-radius:8px;padding:16px;display:flex;gap:12px;align-items:center;">
          <div style="width:40px;height:40px;border-radius:8px;background:${c.primary};"></div>
          <div style="flex:1;">
            <div style="font-family:'${font}',sans-serif;font-size:13px;font-weight:600;color:${c.text_primary};">Sidebar + Content</div>
            <div style="font-family:'${font}',sans-serif;font-size:12px;color:${c.text_body};">Aperçu de la mise en page</div>
          </div>
          <button style="font-family:'${font}',sans-serif;font-size:12px;font-weight:500;background:${c.accent};color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;">Action</button>
        </div>

        <!-- Mini sidebar preview -->
        <div style="margin-top:12px;display:flex;border-radius:8px;overflow:hidden;height:120px;border:1px solid ${c.text_body}15;">
          <div style="width:180px;background:${c.primary};padding:12px;display:flex;flex-direction:column;gap:6px;">
            <div style="font-family:'${font}',sans-serif;font-size:11px;font-weight:600;color:#ffffffcc;text-transform:uppercase;letter-spacing:0.5px;">Navigation</div>
            ${sidebarItem(font, 'Dashboard', true)}
            ${sidebarItem(font, 'Contacts', false)}
            ${sidebarItem(font, 'Pipeline', false)}
          </div>
          <div style="flex:1;background:${c.background};padding:12px;">
            <div style="font-family:'${font}',sans-serif;font-size:14px;font-weight:600;color:${c.text_primary};margin-bottom:8px;">Dashboard</div>
            <div style="display:flex;gap:8px;">
              ${statCard(font, c, '24', 'Contacts')}
              ${statCard(font, c, '8', 'En cours')}
              ${statCard(font, c, '3', 'Alertes')}
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function colorSwatch(hex: string, label: string, border?: string): string {
	const borderStyle = border ? `border:1px solid ${border}30;` : '';
	return `<div style="text-align:center;">
        <div style="width:36px;height:36px;border-radius:6px;background:${hex};${borderStyle}"></div>
        <div style="font-size:9px;color:#888;margin-top:3px;">${label}</div>
        <div style="font-size:9px;color:#aaa;">${hex}</div>
      </div>`;
}

function sidebarItem(font: string, label: string, active: boolean): string {
	const bg = active ? '#ffffff15' : 'transparent';
	return `<div style="font-family:'${font}',sans-serif;font-size:12px;color:#ffffffdd;padding:4px 8px;border-radius:4px;background:${bg};">${label}</div>`;
}

function statCard(font: string, c: ThemeColors, value: string, label: string): string {
	return `<div style="background:${c.surface};border-radius:6px;padding:8px 10px;flex:1;text-align:center;">
        <div style="font-family:'${font}',sans-serif;font-size:16px;font-weight:700;color:${c.text_primary};">${value}</div>
        <div style="font-family:'${font}',sans-serif;font-size:10px;color:${c.text_body};">${label}</div>
      </div>`;
}

function generateHTML(catalogue: Catalogue): string {
	const themes = catalogue.themes;
	const keys = Object.keys(themes);

	const cards = keys.map((key, i) => themeCard(key, themes[key], i === 0)).join('\n');

	return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AppFactory — Catalogue Branding</title>
    ${fontLinks(themes)}
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 40px 24px; background: #f5f5f5; font-family: system-ui, sans-serif; }
      .container { max-width: 900px; margin: 0 auto; }
      h1 { font-size: 28px; font-weight: 800; color: #111; margin: 0 0 8px; }
      .subtitle { font-size: 15px; color: #666; margin: 0 0 32px; }
      .grid { display: flex; flex-direction: column; gap: 24px; }
    </style>
</head>
<body>
  <div class="container">
    <h1>Catalogue Branding</h1>
    <p class="subtitle">5 thèmes disponibles — choisissez un point de départ, personnalisable ensuite.</p>
    <div class="grid">
      ${cards}
    </div>
    <p style="text-align:center;color:#999;font-size:12px;margin-top:32px;">
      AppFactory — Chaque thème est entièrement personnalisable (couleurs, typo, logo, page login).
    </p>
  </div>
</body>
</html>`;
}

mkdirSync(PREVIEWS, { recursive: true });
const html = generateHTML(catalogue);
const outPath = resolve(PREVIEWS, 'branding.html');
writeFileSync(outPath, html, 'utf-8');
console.log(`Branding preview: ${outPath}`);

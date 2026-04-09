#!/usr/bin/env npx tsx
/**
 * Scaffold un nouveau projet SvelteKit depuis le template + project.yaml.
 * Usage : npx tsx scripts/scaffold.ts <project.yaml> <output-dir>
 *
 * Etapes :
 * 1. Copie template/ vers output-dir (sans node_modules, .env, etc.)
 * 2. Remplace project.yaml par celui du client
 * 3. Lance yaml-to-config.ts pour generer config.ts
 * 4. Remplace le placeholder {{APP_NAME}} dans app.html
 * 5. Met a jour package.json (nom du projet)
 */

import { cpSync, readFileSync, writeFileSync, existsSync, rmSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const TEMPLATE = resolve(ROOT, 'template');

// --- Args ---
const args = process.argv.slice(2);
if (args.length < 2) {
	console.error('Usage : npx tsx scripts/scaffold.ts <project.yaml> <output-dir>');
	console.error('Exemple : npx tsx scripts/scaffold.ts ./mon-projet.yaml ../clients/mon-projet');
	process.exit(1);
}

const yamlSource = resolve(args[0]);
const outputDir = resolve(args[1]);

// --- Validations ---
if (!existsSync(yamlSource)) {
	console.error(`Erreur : fichier YAML introuvable : ${yamlSource}`);
	process.exit(1);
}

if (existsSync(outputDir)) {
	console.error(`Erreur : le dossier cible existe deja : ${outputDir}`);
	console.error('Supprimez-le ou choisissez un autre chemin.');
	process.exit(1);
}

// Parse YAML
const rawYaml = readFileSync(yamlSource, 'utf-8');
const config = yaml.load(rawYaml) as {
	app: { name: string; slug: string };
	pipeline?: unknown;
	prospection?: unknown;
	signaux?: unknown;
	scoring?: unknown;
};
if (!config?.app?.name) {
	console.error('Erreur : project.yaml doit contenir app.name');
	process.exit(1);
}

const appName = config.app.name;
const appSlug = config.app.slug || config.app.name.toLowerCase().replace(/\s+/g, '-');

console.log(`\nScaffold : ${appName} (${appSlug})`);
console.log(`Template : ${TEMPLATE}`);
console.log(`Sortie   : ${outputDir}\n`);

// --- Step 1 : Copy template ---
console.log('1/7  Copie du template...');
cpSync(TEMPLATE, outputDir, {
	recursive: true,
	filter: (src) => {
		const name = basename(src);
		return name !== 'node_modules' && name !== '.svelte-kit' && name !== '.vercel' && name !== '.env';
	},
});

// --- Step 2 : Replace project.yaml ---
console.log('2/7  Injection du project.yaml...');
cpSync(yamlSource, resolve(outputDir, 'project.yaml'));

// --- Step 3 : Generate config.ts ---
console.log('3/7  Generation de config.ts...');
const yamlToConfig = resolve(ROOT, 'scripts', 'yaml-to-config.ts');
execSync(`npx tsx "${yamlToConfig}" "${outputDir}"`, { cwd: ROOT, stdio: 'inherit' });

// --- Step 4 : Replace {{APP_NAME}} in app.html ---
console.log('4/7  Personnalisation app.html...');
const appHtmlPath = resolve(outputDir, 'src', 'app.html');
const appHtml = readFileSync(appHtmlPath, 'utf-8');
writeFileSync(appHtmlPath, appHtml.replace('{{APP_NAME}}', appName), 'utf-8');

// --- Step 5 : Remove modules absent from YAML ---
console.log('5/7  Nettoyage des modules absents du YAML...');
const removals: { condition: boolean; paths: string[]; label: string }[] = [
	{
		condition: !config.pipeline,
		paths: ['src/routes/(app)/pipeline'],
		label: 'pipeline',
	},
	{
		condition: !config.prospection,
		paths: [
			'src/routes/(app)/prospection',
			'src/routes/api/prospection',
			'src/lib/components/prospection',
		],
		label: 'prospection',
	},
	{
		condition: !config.signaux,
		paths: ['src/routes/(app)/signaux', 'src/routes/api/cron/signaux'],
		label: 'signaux',
	},
	{
		condition: !config.scoring,
		paths: ['src/lib/scoring.ts', 'src/lib/scoring.test.ts'],
		label: 'scoring',
	},
];

for (const { condition, paths, label } of removals) {
	if (condition) {
		for (const p of paths) {
			const full = resolve(outputDir, p);
			if (existsSync(full)) {
				rmSync(full, { recursive: true });
				console.log(`       - ${label} : ${p} supprime`);
			}
		}
	}
}

// --- Step 6 : Update package.json ---
console.log('6/7  Mise a jour package.json...');
const pkgPath = resolve(outputDir, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
pkg.name = appSlug;
writeFileSync(pkgPath, JSON.stringify(pkg, null, '\t') + '\n', 'utf-8');

// --- Step 6b : Clean vercel.json crons for removed modules ---
const vercelJsonPath = resolve(outputDir, 'vercel.json');
if (existsSync(vercelJsonPath)) {
	const vercelJson = JSON.parse(readFileSync(vercelJsonPath, 'utf-8'));
	if (vercelJson.crons && Array.isArray(vercelJson.crons)) {
		const before = vercelJson.crons.length;
		vercelJson.crons = vercelJson.crons.filter((cron: { path: string }) => {
			const cronRoute = resolve(outputDir, 'src', 'routes', cron.path.replace(/^\//, ''));
			return existsSync(cronRoute);
		});
		const removed = before - vercelJson.crons.length;
		if (removed > 0) {
			writeFileSync(vercelJsonPath, JSON.stringify(vercelJson, null, '\t') + '\n', 'utf-8');
			console.log(`       - vercel.json : ${removed} cron(s) orphelin(s) supprime(s)`);
		}
	}
}

console.log('7/7  Verification finale...');
console.log(`\nScaffold termine !`);
console.log(`\nProchaines etapes :`);
console.log(`  cd ${outputDir}`);
console.log(`  cp .env.example .env   # Configurer Supabase + auth`);
console.log(`  npm install`);
console.log(`  npm run dev`);

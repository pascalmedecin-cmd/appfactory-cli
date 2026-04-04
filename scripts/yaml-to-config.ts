#!/usr/bin/env npx tsx
/**
 * Genere config.ts depuis project.yaml.
 * Usage : npx tsx scripts/yaml-to-config.ts [project-dir]
 * Par defaut : template/
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = process.argv[2]
	? resolve(process.argv[2])
	: resolve(__dirname, '..', 'template');
const YAML_PATH = resolve(ROOT, 'project.yaml');
const CONFIG_PATH = resolve(ROOT, 'src', 'lib', 'config.ts');

// snake_case → camelCase
function camel(s: string): string {
	return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// Paths where keys should NOT be camelCased (they're identifiers, not config keys)
const KEEP_KEYS_PATHS = new Set([
	'prospection.sources',
	'prospection.secteur_keywords',
]);

// Deep-convert all object keys from snake_case to camelCase
function camelKeys(obj: unknown, path = ''): unknown {
	if (Array.isArray(obj)) return obj.map((v, i) => camelKeys(v, path));
	if (obj !== null && typeof obj === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
			const keepKey = KEEP_KEYS_PATHS.has(path);
			const newKey = keepKey ? k : camel(k);
			const childPath = path ? `${path}.${k}` : k;
			out[newKey] = camelKeys(v, childPath);
		}
		return out;
	}
	return obj;
}

// Serialize value to TS literal
function toTS(value: unknown, indent: number = 1): string {
	const pad = '\t'.repeat(indent);
	const padInner = '\t'.repeat(indent + 1);

	if (value === null || value === undefined) return 'null';
	if (typeof value === 'string') {
		// Use single quotes, escape internal single quotes
		return `'${value.replace(/'/g, "\\'")}'`;
	}
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);

	if (Array.isArray(value)) {
		if (value.length === 0) return '[]';
		// Simple array of primitives on one line
		if (value.every(v => typeof v === 'string' || typeof v === 'number')) {
			return `[${value.map(v => toTS(v, 0)).join(', ')}]`;
		}
		// Array of objects
		const items = value.map(v => `${padInner}${toTS(v, indent + 1)}`);
		return `[\n${items.join(',\n')},\n${pad}]`;
	}

	if (typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>);
		if (entries.length === 0) return '{}';
		const lines = entries.map(([k, v]) => {
			// Quote keys that contain special chars
			const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `'${k}'`;
			return `${padInner}${key}: ${toTS(v, indent + 1)},`;
		});
		return `{\n${lines.join('\n')}\n${pad}}`;
	}

	return String(value);
}

// --- Main ---

const raw = readFileSync(YAML_PATH, 'utf-8');
const doc = yaml.load(raw) as Record<string, unknown>;

// Convert keys to camelCase
const config = camelKeys(doc) as Record<string, unknown>;

// Remove fields that don't belong in the frontend config
delete config.auth;
delete config.cron;

// Remove technical fields from prospection sources (endpoint, type, requiresAuth, requiresApiKey)
const prosp = config.prospection as Record<string, unknown> | undefined;
if (prosp?.sources && typeof prosp.sources === 'object') {
	for (const src of Object.values(prosp.sources as Record<string, Record<string, unknown>>)) {
		delete src.type;
		delete src.endpoint;
		delete src.requiresAuth;
		delete src.requiresApiKey;
	}
}

// Add loginBackground if it exists in current config (not in YAML, managed manually)
const branding = config.branding as Record<string, unknown> | undefined;
if (branding && !branding.loginBackground) {
	// Check current config.ts for loginBackground
	try {
		const currentConfig = readFileSync(CONFIG_PATH, 'utf-8');
		const match = currentConfig.match(/loginBackground:\s*'([^']+)'/);
		if (match) {
			branding.loginBackground = match[1];
		}
	} catch {
		// First generation, no existing config
	}
}

// Build output
const sections = Object.entries(config).map(([key, value]) => {
	return `\t${key}: ${toTS(value, 1)},`;
});

const output = `/**
 * Configuration specifique client — FICHIER GENERE AUTOMATIQUEMENT.
 * Ne pas modifier a la main. Editer project.yaml puis lancer :
 *   npx tsx scripts/yaml-to-config.ts
 */

export const config = {
${sections.join('\n\n')}
} as const;
`;

writeFileSync(CONFIG_PATH, output, 'utf-8');
console.log(`config.ts genere depuis ${YAML_PATH}`);

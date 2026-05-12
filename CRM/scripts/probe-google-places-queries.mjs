/**
 * Probe one-shot : teste chaque query candidate du champ « Type d'activité » contre
 * l'API Google Places (New) Text Search, sur 2 cantons (GE, VD), et reporte le nombre
 * de résultats + 3 exemples. Sert à valider que les libellés ne sont pas trop restrictifs.
 * Usage : node scripts/probe-google-places-queries.mjs
 */
import fs from 'node:fs';

function loadEnv() {
	const t = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf-8');
	for (const line of t.split(/\r?\n/)) {
		if (!line || line.startsWith('#') || !line.includes('=')) continue;
		const [k, ...rest] = line.split('=');
		process.env[k.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '');
	}
}
loadEnv();
const KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!KEY) { console.error('clé absente'); process.exit(1); }

const RECTS = {
	GE: { low: { latitude: 46.12, longitude: 5.95 }, high: { latitude: 46.37, longitude: 6.32 } },
	VD: { low: { latitude: 46.18, longitude: 6.05 }, high: { latitude: 47.00, longitude: 7.25 } },
};
const NAMES = { GE: 'Genève', VD: 'Vaud' };

// Candidats : [key, keywordSansCanton, includedTypeOuNull]
const CANDIDATES = [
	['regies_syndics', 'régie immobilière syndic de copropriété', 'real_estate_agency'],
	['regies_syndics_kw', 'régie immobilière syndic de copropriété', null],
	['facility_management', 'facility management gestion technique de bâtiment property management', null],
	['bureaux_etudes', "bureau d'études thermique énergie bâtiment", null],
	['architectes_designers', "architecte architecte d'intérieur agence d'architecture", null],
	['cvc_hvac', 'climatisation ventilation CVC chauffage entreprise HVAC', null],
	['entreprises_generales', 'entreprise générale du bâtiment rénovation', 'general_contractor'],
	['entreprises_generales_kw', 'entreprise générale du bâtiment rénovation', null],
	['securite_batiment', "sécurité bâtiment alarme contrôle d'accès vidéosurveillance", null],
	['commerce', 'magasin boutique commerce de détail vitrine', null],
];

const FIELD_MASK = 'places.id,places.displayName,places.businessStatus';

async function probe(query, canton, includedType) {
	const body = {
		textQuery: `${query} ${NAMES[canton]} Suisse`,
		languageCode: 'fr', regionCode: 'CH', pageSize: 20,
		locationRestriction: { rectangle: RECTS[canton] },
	};
	if (includedType) body.includedType = includedType;
	const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': FIELD_MASK },
		body: JSON.stringify(body),
	});
	if (!resp.ok) return { err: `${resp.status} ${(await resp.text()).slice(0, 200)}` };
	const j = await resp.json();
	const places = (j.places ?? []).filter((p) => !p.businessStatus || p.businessStatus === 'OPERATIONAL');
	return { n: places.length, ex: places.slice(0, 3).map((p) => p.displayName?.text) };
}

for (const [key, query, it] of CANDIDATES) {
	for (const canton of ['GE', 'VD']) {
		const r = await probe(query, canton, it);
		const tag = it ? `[type=${it}]` : '[kw]';
		if (r.err) console.log(`${key.padEnd(28)} ${canton} ${tag.padEnd(28)} ERREUR ${r.err}`);
		else console.log(`${key.padEnd(28)} ${canton} ${tag.padEnd(28)} ${String(r.n).padStart(2)} résultats — ex: ${r.ex.join(' · ')}`);
		await new Promise((res) => setTimeout(res, 250));
	}
}

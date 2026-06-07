/**
 * Seed / purge ÉPHÉMÈRE pour le re-audit live CRM (Bloc 1, 2026-06-07).
 * Cible = DB PROD (service_role du .env.local). Données marquées de façon redondante :
 *   - id préfixé `seedaudit-*`   → purge fiable (delete where id like 'seedaudit-%')
 *   - suffixe `[SEED]` visible    → repérable à l'écran si un fondateur se connecte
 *   - source = 'seed-audit', tags = 'SEED-AUDIT'
 * FK toutes ON DELETE SET NULL ; seul CHECK = opportunites.etape_pipeline (6 valeurs).
 *
 * Usage : node scripts/_audit_seed.mjs seed|purge|status
 * Purge garantie après usage : `node scripts/_audit_seed.mjs purge`.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
	const out = {};
	for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
		const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
		if (!m) continue;
		let v = m[2].trim();
		if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
		out[m[1]] = v.replace(/(\\n|\s)+$/, '');
	}
	return out;
}
const env = loadEnv();
const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
	auth: { autoRefreshToken: false, persistSession: false }
});

const PREFIX = 'seedaudit-';
const DAY = 86400000;
const now = Date.now();
const iso = (ms) => new Date(ms).toISOString();
const eid = (i) => `${PREFIX}ent-${String(i).padStart(2, '0')}`;
const cid = (i) => `${PREFIX}ct-${String(i).padStart(2, '0')}`;
const oid = (i) => `${PREFIX}opp-${String(i).padStart(2, '0')}`;

// --- 15 entreprises (clients FilmPro : régies, architectes, FM, bureaux d'études, bâtiment pro)
// statut_qualification : qualifie / en_cours / nouveau / null. withContact=false → filtre « sans-contact ».
const ENT_RAW = [
	['Régie Duceltis SA', 'Gérance immobilière', 'regie', 'GE', 'Genève', 'duceltis.ch', 'moyenne', 'qualifie', 9],
	['Atelier Verroux Architectes', "Bureau d'architectes", 'architecte', 'VD', 'Lausanne', 'verroux-archi.ch', 'petite', 'qualifie', 8],
	['Helvetia Facility Management', 'Facility management', 'facility', 'GE', 'Carouge', 'helvetia-fm.ch', 'grande', 'en_cours', 7],
	['Bureau Léman Ingénierie', "Bureau d'études", 'bureau_etudes', 'VD', 'Nyon', 'leman-ing.ch', 'moyenne', 'qualifie', 8],
	['Régie du Rhône', 'Gérance immobilière', 'regie', 'VS', 'Sion', 'regie-rhone.ch', 'moyenne', 'nouveau', 5],
	['Concept Vitré Sàrl', 'Menuiserie / vitrerie', 'partenaire', 'FR', 'Fribourg', 'concept-vitre.ch', 'petite', 'en_cours', 6],
	['Patrimoine Genevois SA', 'Gérance immobilière', 'regie', 'GE', 'Genève', 'patrimoine-ge.ch', 'grande', 'qualifie', 9],
	['Studio Acanthe Architecture', "Bureau d'architectes", 'architecte', 'NE', 'Neuchâtel', 'acanthe-archi.ch', 'petite', 'nouveau', 5],
	['Foncia Romandie', 'Gérance immobilière', 'regie', 'VD', 'Montreux', 'foncia-romandie.ch', 'grande', 'en_cours', 7],
	['Tech Bâtiment Jura', 'Entreprise générale', 'batiment', 'JU', 'Delémont', 'techbat-jura.ch', 'moyenne', null, 4],
	['Immo Conseil Léman', 'Gérance immobilière', 'regie', 'VD', 'Vevey', 'immoconseil-leman.ch', 'moyenne', 'qualifie', 8],
	['Espace Lumière Architectes', "Bureau d'architectes", 'architecte', 'GE', 'Plan-les-Ouates', 'espace-lumiere.ch', 'petite', 'nouveau', 5],
	// sans contact rattaché → filtre « sans-contact »
	['Domaine Viticole Bonvin', 'Hôtellerie / privé', 'prive', 'VS', 'Martigny', 'domaine-bonvin.ch', 'petite', null, 3],
	['Clinique des Grangettes', 'Santé / établissement', 'etablissement', 'GE', 'Chêne-Bougeries', 'grangettes.ch', 'grande', 'en_cours', 7],
	['École Internationale Vaud', 'Éducation / établissement', 'etablissement', 'VD', 'Le Mont', 'eiv.ch', 'grande', 'nouveau', 6]
];
const ENT = ENT_RAW.map((r, i) => ({
	id: eid(i),
	raison_sociale: `${r[0]} [SEED]`,
	secteur_activite: r[1],
	segment_cible: r[2],
	canton: r[3],
	adresse_siege: `Rue de l'Exemple ${10 + i}, ${1200 + i * 7} ${r[4]}`,
	site_web: `https://www.${r[5]}`,
	taille_estimee: r[6],
	statut_qualification: r[7],
	score_priorite: r[8],
	numero_ide: `CHE-${100 + i}.${200 + i}.${300 + i}`,
	source: 'seed-audit',
	tags: 'SEED-AUDIT',
	responsable_filmpro: i % 2 ? 'Antoine' : 'Pascal',
	notes_libres: 'Donnée de re-audit (éphémère).',
	statut_archive: false,
	date_derniere_modification: iso(now - i * 3 * DAY) // étale le tri par défaut
}));

// --- 22 contacts. entMap : index entreprise (null = sans entreprise → filtre « sans-entreprise »).
// Entreprises 12,13,14 jamais référencées → restent « sans-contact ».
const entMap = [0, 0, 1, 2, 3, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, null, null, null, 2, 4, 6];
const PRENOMS = ['Sophie', 'Marc', 'Élise', 'Julien', 'Camille', 'Nicolas', 'Laure', 'David', 'Anne', 'Thomas', 'Céline', 'Pierre', 'Nadia', 'Olivier', 'Sandra', 'Frédéric', 'Valérie', 'Loïc', 'Isabelle', 'Yann', 'Mireille', 'Bastien'];
const NOMS = ['Berthod', 'Favre', 'Rochat', 'Müller', 'Girard', 'Dubois', 'Stauffer', 'Mercier', 'Conti', 'Aebischer', 'Pittet', 'Moret', 'Henchoz', 'Délèze', 'Roux', 'Schmid', 'Jaquet', 'Bonnard', 'Curchod', 'Perret', 'Décosterd', 'Gex'];
const ROLES = ['Architecte', 'Régisseur', 'Facility Manager', 'Directeur technique', 'Chef de projet', 'Responsable bâtiment', 'Ingénieur', 'Gérant'];
// est_prescripteur sur architectes + bureaux d'études (indices choisis), statut variés.
const CT_STATUT = ['qualifie', 'nouveau', 'en_cours', null];
const ENT_CANTON = ENT.map((e) => e.canton);
const CT = entMap.map((eIdx, i) => {
	const nom = NOMS[i % NOMS.length];
	const role = ROLES[i % ROLES.length];
	const presc = role === 'Architecte' || role === 'Ingénieur' || i === 3;
	return {
		id: cid(i),
		prenom: PRENOMS[i % PRENOMS.length],
		nom,
		entreprise_id: eIdx === null ? null : eid(eIdx),
		role_fonction: role,
		segment: eIdx === null ? null : ENT[eIdx].segment_cible,
		email_professionnel: `${PRENOMS[i % PRENOMS.length].toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}.${nom.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}@exemple-seed.ch`,
		telephone: `+41 ${21 + (i % 6)} ${600 + i} ${10 + i} ${20 + i}`,
		canton: eIdx === null ? ENT_CANTON[i % ENT_CANTON.length] : ENT[eIdx].canton,
		statut_qualification: CT_STATUT[i % CT_STATUT.length],
		score_priorite: 3 + (i % 7),
		est_prescripteur: presc,
		source: 'seed-audit',
		tags: 'SEED-AUDIT',
		responsable_filmpro: i % 2 ? 'Antoine' : 'Pascal',
		statut_archive: false,
		date_derniere_modification: iso(now - i * 2 * DAY)
	};
});

// --- 30 opportunités : 5 par étape × 6 étapes. FK entreprise (0..11) + contact.
const ETAPES = ['identification', 'qualification', 'proposition', 'negociation', 'gagne', 'perdu'];
const PROJETS = [
	'Films solaires - tour de bureaux',
	'Vitrage de sécurité - hall',
	'Film anti-chaleur - open space',
	'Vernis de protection - façade',
	'Films de confidentialité - salles',
	'Contrôle solaire - verrière',
	'Film anti-UV - showroom',
	'Sécurité bris de glace - école',
	'Film décoratif dépoli - cloisons',
	'Protection thermique - véranda'
];
const MOTIFS = ['Budget reporté', 'Concurrent retenu', 'Projet annulé', 'Pas de suite donnée', 'Hors délai'];
const OPP = [];
let oi = 0;
for (let s = 0; s < ETAPES.length; s++) {
	const etape = ETAPES[s];
	for (let k = 0; k < 5; k++, oi++) {
		const entIdx = oi % 12;
		const ctIdx = oi % CT.length;
		const closed = etape === 'gagne' || etape === 'perdu';
		// gagne → clôture ce mois (wonThisMonth) ; perdu → clôture passée ; actives → relance mix passé/futur.
		const overdue = !closed && k % 2 === 0; // ~moitié des actives en retard
		OPP.push({
			id: oid(oi),
			titre: `${PROJETS[oi % PROJETS.length]} - ${ENT_RAW[entIdx][4]} [SEED]`,
			entreprise_id: eid(entIdx),
			contact_id: cid(ctIdx),
			etape_pipeline: etape,
			montant_estime: 4000 + ((oi * 1373) % 46000),
			date_relance_prevue: closed ? null : iso(now + (overdue ? -1 : 1) * (3 + k) * DAY),
			date_cloture_effective:
				etape === 'gagne' ? iso(now - (k + 1) * DAY) : etape === 'perdu' ? iso(now - (20 + k * 5) * DAY) : null,
			motif_perte: etape === 'perdu' ? MOTIFS[k % MOTIFS.length] : null,
			responsable: oi % 2 ? 'Antoine' : 'Pascal',
			tags: 'SEED-AUDIT',
			notes_libres: 'Opportunité de re-audit (éphémère).',
			date_creation: iso(now - (10 + oi) * DAY),
			date_derniere_modification: iso(now - oi * DAY)
		});
	}
}

async function purge() {
	let total = 0;
	for (const tbl of ['opportunites', 'contacts', 'entreprises']) {
		const { error, count } = await admin.from(tbl).delete({ count: 'exact' }).like('id', `${PREFIX}%`);
		if (error) throw new Error(`purge ${tbl}: ${error.message}`);
		total += count ?? 0;
		console.log(`  purge ${tbl}: ${count ?? 0}`);
	}
	return total;
}

async function insertAll(tbl, rows) {
	const { error } = await admin.from(tbl).insert(rows);
	if (error) throw new Error(`insert ${tbl}: ${error.message}`);
	console.log(`  insert ${tbl}: ${rows.length}`);
}

async function status() {
	for (const tbl of ['entreprises', 'contacts', 'opportunites']) {
		const { count } = await admin.from(tbl).select('id', { count: 'exact', head: true }).like('id', `${PREFIX}%`);
		console.log(`  ${tbl} seedaudit-*: ${count ?? 0}`);
	}
}

const cmd = process.argv[2];
if (cmd === 'seed') {
	console.log('purge préalable (idempotence)…');
	await purge();
	console.log('seed…');
	await insertAll('entreprises', ENT);
	await insertAll('contacts', CT);
	await insertAll('opportunites', OPP);
	console.log(`OK seed : ${ENT.length} entreprises, ${CT.length} contacts, ${OPP.length} opportunités.`);
} else if (cmd === 'purge') {
	console.log('purge…');
	const n = await purge();
	console.log(`OK purge : ${n} lignes supprimées.`);
} else if (cmd === 'status') {
	await status();
} else {
	console.error('Usage : node scripts/_audit_seed.mjs seed|purge|status');
	process.exit(1);
}

import { json, type RequestEvent } from '@sveltejs/kit';
import { calculerScore } from '$lib/scoring';
import { randomUUID } from 'crypto';

// RegBL -Registre fédéral des bâtiments et logements
// Source : opendata.swiss CSV exports
// On utilise l'API geo.admin.ch pour interroger le dataset RegBL

const GEOADMIN_BASE = 'https://api3.geo.admin.ch/rest/services/api/MapServer';
const REGBL_LAYER = 'ch.bfs.gebaeude_wohnungs_register'; // GWR layer

const CANTON_MAP: Record<string, string> = {
	GE: 'GE', VD: 'VD', VS: 'VS', NE: 'NE', FR: 'FR', JU: 'JU',
};

// Statut bâtiment RegBL : 1004 = autorisé, 1005 = en construction
const STATUTS_CHANTIER = [1004, 1005];

// Catégorie bâtiment : 1020 = résidentiel, 1030 = mixte, 1040 = non-résidentiel
// On cible tous pour maximiser les leads construction

interface RegblFeature {
	id: number;
	attributes: {
		egid: number;
		gdename?: string; // Commune
		gdenr?: number; // N° commune OFS
		gkat?: number; // Catégorie bâtiment
		gstat?: number; // Statut (1004=autorisé, 1005=en construction)
		garea?: number; // Surface au sol
		gastw?: number; // Nombre d'étages
		gbauj?: number; // Année de construction
		gbaum?: number; // Mois de construction
		gabbj?: number; // Année de démolition
		strname?: string;
		deinr?: string; // Numéro de rue
		plz4?: number; // NPA
		plzz?: number; // Complément NPA
		label?: string;
	};
}

export const POST = async ({ request, locals }: RequestEvent) => {
	const { session } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });

	const body = await request.json();
	const cantons: string[] = body.cantons ?? ['GE', 'VD'];
	const limit: number = Math.min(body.limit ?? 50, 200);

	const validCantons = cantons.filter((c) => CANTON_MAP[c]);
	if (validCantons.length === 0) {
		return json({ error: 'Au moins un canton romand requis (GE, VD, VS, NE, FR, JU)' }, { status: 400 });
	}

	let allFeatures: RegblFeature[] = [];

	for (const canton of validCantons) {
		try {
			// geo.admin.ch find endpoint with attribute filter
			const params = new URLSearchParams({
				layer: REGBL_LAYER,
				searchField: 'gdekt',
				searchText: canton,
				returnGeometry: 'false',
				contains: 'false',
			});

			const resp = await fetch(`${GEOADMIN_BASE}/find?${params}`, {
				headers: { Accept: 'application/json' },
			});

			if (!resp.ok) {
				console.error(`RegBL ${canton}: HTTP ${resp.status}`);
				continue;
			}

			const data = await resp.json();
			const features: RegblFeature[] = data.results ?? [];

			// Filter: only buildings in construction phase (autorisé ou en construction)
			const relevant = features.filter((f) =>
				STATUTS_CHANTIER.includes(f.attributes.gstat ?? 0)
			);

			allFeatures.push(...relevant);
		} catch (err) {
			console.error(`RegBL ${canton}: ${String(err)}`);
		}
	}

	if (allFeatures.length === 0) {
		return json({ imported: 0, skipped: 0, message: 'Aucun bâtiment en phase de construction trouvé.' });
	}

	// Limit results
	if (allFeatures.length > limit) {
		allFeatures = allFeatures.slice(0, limit);
	}

	// Dedup against existing leads
	const egids = allFeatures.map((f) => String(f.attributes.egid)).filter(Boolean);
	const existingIds = new Set<string>();
	if (egids.length > 0) {
		const { data: existing } = await locals.supabase
			.from('prospect_leads')
			.select('source_id')
			.eq('source', 'regbl')
			.in('source_id', egids);
		if (existing) {
			for (const e of existing) existingIds.add(e.source_id);
		}
	}

	const { data: dismissed } = await locals.supabase
		.from('prospect_leads')
		.select('source_id, statut')
		.eq('source', 'regbl')
		.in('statut', ['ecarte', 'transfere']);
	const dismissedIds = new Set<string>();
	if (dismissed) {
		for (const d of dismissed) if (d.source_id) dismissedIds.add(d.source_id);
	}

	const now = new Date().toISOString();
	let imported = 0;
	let skipped = 0;
	const inserts = [];

	for (const feature of allFeatures) {
		const a = feature.attributes;
		const egid = String(a.egid);
		if (existingIds.has(egid) || dismissedIds.has(egid)) { skipped++; continue; }

		const commune = a.gdename ?? '';
		const npa = a.plz4 ? String(a.plz4) : null;
		const adresse = [a.strname, a.deinr].filter(Boolean).join(' ') || null;
		const statut = a.gstat === 1004 ? 'Autorisé' : 'En construction';
		const description = [
			`Bâtiment ${statut.toLowerCase()}`,
			a.gastw ? `${a.gastw} étages` : '',
			a.garea ? `${a.garea} m² au sol` : '',
			commune ? `Commune : ${commune}` : '',
		].filter(Boolean).join(' - ');

		// Determine canton from NPA or commune
		// Since we search by canton, we know it
		const cantonCode = validCantons.find(() => true) ?? 'GE';

		const scoreResult = calculerScore({
			canton: cantonCode,
			description,
			raison_sociale: `Chantier ${commune} (EGID ${egid})`,
			source: 'regbl',
			date_publication: null,
			telephone: null,
			montant: null,
		});

		inserts.push({
			id: randomUUID(),
			source: 'regbl' as const,
			source_id: egid,
			source_url: `https://www.housing-stat.ch/fr/query/egid.html?egid=${egid}`,
			raison_sociale: `Chantier ${commune}${npa ? ` (${npa})` : ''}`,
			nom_contact: null,
			adresse,
			npa,
			localite: commune || null,
			canton: cantonCode,
			telephone: null,
			site_web: null,
			email: null,
			secteur_detecte: 'construction',
			description,
			montant: null,
			date_publication: null,
			score_pertinence: scoreResult.total,
			statut: 'nouveau',
			date_import: now,
			date_modification: now,
		});

		existingIds.add(egid);
	}

	if (inserts.length > 0) {
		const batchSize = 500;
		for (let i = 0; i < inserts.length; i += batchSize) {
			const batch = inserts.slice(i, i + batchSize);
			const { error } = await locals.supabase.from('prospect_leads').insert(batch);
			if (error) {
				return json({
					error: `Erreur insertion : ${error.message}`,
					imported,
					skipped,
				}, { status: 500 });
			}
			imported += batch.length;
		}
	}

	return json({
		imported,
		skipped,
		total_features: allFeatures.length,
		message: `${imported} chantier${imported > 1 ? 's' : ''} importé${imported > 1 ? 's' : ''} depuis le RegBL, ${skipped} ignoré${skipped > 1 ? 's' : ''}.`,
	});
};

import { json, type RequestEvent } from '@sveltejs/kit';
import { calculerScore } from '$lib/scoring';
import { randomUUID } from 'crypto';

// Minergie -Bâtiments certifiés via geo.admin.ch STAC/WFS
// Dataset SFOE : ch.bfe.minergiegebaeude (bâtiments Minergie)

const GEOADMIN_BASE = 'https://api3.geo.admin.ch/rest/services/api/MapServer';
const MINERGIE_LAYER = 'ch.bfe.minergiegebaeude';

const CANTON_MAP: Record<string, string> = {
	GE: 'GE', VD: 'VD', VS: 'VS', NE: 'NE', FR: 'FR', JU: 'JU',
};

// Standard Minergie → valeur scoring (noms réels de l'API geo.admin.ch)
const PREMIUM_STANDARDS = ['Minergie_P', 'Minergie_A', 'Minergie_P_Eco', 'Minergie_A_Eco'];

interface MinergieFeature {
	id: number;
	attributes: {
		certificate?: string; // Numéro de certification (ex: "GE-412")
		standard?: string; // Minergie, Minergie_P, Minergie_A, Minergie_P_Eco, etc.
		canton?: string; // Abréviation canton
		ebf?: number | null; // Surface de référence énergétique
		buildinginfo_fr?: string | null;
		buildinginfo_de?: string | null;
		http_fr?: string; // Deep link vers fiche bâtiment
		http_de?: string;
		label?: number; // ID numérique interne (pas le type de certification)
	};
}

export const POST = async ({ request, locals }: RequestEvent) => {
	const { session } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });

	const body = await request.json();
	const cantons: string[] = body.cantons ?? ['GE', 'VD'];
	const limit: number = Math.min(body.limit ?? 50, 200);
	const premiumOnly: boolean = body.premiumOnly ?? false; // Filtrer sur P/A/ECO uniquement

	const validCantons = cantons.filter((c) => CANTON_MAP[c]);
	if (validCantons.length === 0) {
		return json({ error: 'Au moins un canton romand requis (GE, VD, VS, NE, FR, JU)' }, { status: 400 });
	}

	let allFeatures: MinergieFeature[] = [];

	for (const canton of validCantons) {
		try {
			const params = new URLSearchParams({
				layer: MINERGIE_LAYER,
				searchField: 'canton',
				searchText: canton,
				returnGeometry: 'false',
				contains: 'false',
			});

			const resp = await fetch(`${GEOADMIN_BASE}/find?${params}`, {
				headers: { Accept: 'application/json' },
			});

			if (!resp.ok) {
				console.error(`Minergie ${canton}: HTTP ${resp.status}`);
				continue;
			}

			const data = await resp.json();
			const features: MinergieFeature[] = data.results ?? [];
			allFeatures.push(...features);
		} catch (err) {
			console.error(`Minergie ${canton}: ${String(err)}`);
		}
	}

	if (allFeatures.length === 0) {
		return json({ imported: 0, skipped: 0, message: 'Aucun bâtiment Minergie trouvé pour ces cantons.' });
	}

	// Filter premium standards if requested
	if (premiumOnly) {
		allFeatures = allFeatures.filter((f) =>
			PREMIUM_STANDARDS.includes(f.attributes.standard ?? '')
		);
	}

	// Sort by certificate number descending (higher = more recent)
	allFeatures.sort((a, b) => {
		const certA = a.attributes.certificate ?? '';
		const certB = b.attributes.certificate ?? '';
		return certB.localeCompare(certA);
	});

	// Limit results
	if (allFeatures.length > limit) {
		allFeatures = allFeatures.slice(0, limit);
	}

	// Dedup against existing leads
	const certNumbers = allFeatures
		.map((f) => f.attributes.certificate ?? String(f.id))
		.filter(Boolean);
	const existingIds = new Set<string>();
	if (certNumbers.length > 0) {
		const { data: existing } = await locals.supabase
			.from('prospect_leads')
			.select('source_id')
			.eq('source', 'minergie')
			.in('source_id', certNumbers);
		if (existing) {
			for (const e of existing) existingIds.add(e.source_id);
		}
	}

	const { data: dismissed } = await locals.supabase
		.from('prospect_leads')
		.select('source_id, statut')
		.eq('source', 'minergie')
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
		const certNum = a.certificate ?? String(feature.id);
		if (existingIds.has(certNum) || dismissedIds.has(certNum)) { skipped++; continue; }

		const standard = a.standard ?? 'Minergie';
		const isPremium = PREMIUM_STANDARDS.includes(standard);
		const canton = a.canton ?? '';
		if (!CANTON_MAP[canton]) { skipped++; continue; }

		const buildingInfo = a.buildinginfo_fr ?? a.buildinginfo_de ?? '';
		const description = [
			`Bâtiment certifié ${standard}`,
			buildingInfo ? buildingInfo : '',
			a.ebf ? `Surface : ${a.ebf} m²` : '',
		].filter(Boolean).join(' - ');

		const scoreResult = calculerScore({
			canton,
			description,
			raison_sociale: `${standard} ${certNum}`,
			source: 'minergie',
			date_publication: null,
			telephone: null,
			montant: null,
		});

		// Bonus scoring for premium Minergie standards
		const bonusScore = isPremium ? 2 : 0;

		const sourceUrl = a.http_fr ?? `https://www.minergie.ch/fr/batiments/details/?gid=${certNum}`;

		inserts.push({
			id: randomUUID(),
			source: 'minergie' as const,
			source_id: certNum,
			source_url: sourceUrl,
			raison_sociale: `${standard} ${certNum}`,
			nom_contact: null,
			adresse: null,
			npa: null,
			localite: null,
			canton,
			telephone: null,
			site_web: null,
			email: null,
			secteur_detecte: 'construction',
			description,
			montant: null,
			date_publication: null,
			score_pertinence: scoreResult.total + bonusScore,
			statut: 'nouveau',
			date_import: now,
			date_modification: now,
		});

		existingIds.add(certNum);
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
		message: `${imported} bâtiment${imported > 1 ? 's' : ''} Minergie importé${imported > 1 ? 's' : ''}, ${skipped} ignoré${skipped > 1 ? 's' : ''}.`,
	});
};

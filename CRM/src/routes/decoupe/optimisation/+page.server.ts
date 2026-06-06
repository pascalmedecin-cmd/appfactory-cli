import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { optimiserDecoupe } from '$lib/decoupe/optimiser';
import type { Vitre as AlgoVitre, ProduitDecoupe } from '$lib/decoupe/types';
import { buildChantierLancementUpdate } from '$lib/server/decoupe/builders';
import { buildHub, type HubChantierRow } from '$lib/decoupe/hub';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseIds(raw: string | null): string[] {
	if (!raw) return [];
	const seen = new Set<string>();
	for (const s of raw.split(',').map((x) => x.trim())) {
		if (UUID_RE.test(s)) seen.add(s);
	}
	return [...seen];
}

export const load: PageServerLoad = async ({ url, locals }) => {
	const ids = parseIds(url.searchParams.get('chantiers'));
	if (ids.length === 0) {
		// Onglet « Découpe » (hub atelier) : aucune sélection → on liste tous les chantiers
		// et on suggère les consolidations (films nestable partagés). Voir lib/decoupe/hub.ts.
		const { data: rows } = await locals.supabase
			.from('decoupe_chantiers')
			.select(
				'id, nom, client, statut, updated_at, decoupe_vitres(produit_id, sur_mesure_fournisseur, decoupe_produits(reference, nom, famille, nestable))'
			)
			.order('updated_at', { ascending: false });
		const hub = buildHub((rows ?? []) as unknown as HubChantierRow[]);
		return { ok: false as const, hub };
	}

	const { data: chantiers } = await locals.supabase
		.from('decoupe_chantiers')
		.select('id, nom, statut')
		.in('id', ids);

	const selection = chantiers ?? [];
	if (selection.length === 0) {
		return { ok: false as const, hub: null };
	}

	const { data: vitresRows } = await locals.supabase
		.from('decoupe_vitres')
		.select('id, chantier_id, produit_id, largeur_mm, hauteur_mm, quantite, sur_mesure_fournisseur')
		.in('chantier_id', ids)
		.order('created_at', { ascending: true }); // ordre stable → couleurs de pièce déterministes
	const vitres = vitresRows ?? [];

	const produitIds = [...new Set(vitres.map((v) => v.produit_id))];
	const { data: produitsRows } = produitIds.length
		? await locals.supabase
				.from('decoupe_produits')
				.select(
					'id, reference, nom, famille, fabricant, laizes_mm, orientation_imposee, jointage_autorise, nestable, marge_pose_mm, recouvrement_mm'
				)
				.in('id', produitIds)
		: { data: [] };
	const produits = produitsRows ?? [];

	// Construit les entrées du cœur algo (types purs).
	const produitMap = new Map<string, ProduitDecoupe>();
	const produitsInfo: Record<
		string,
		{ reference: string; nom: string; famille: string; fabricant: string }
	> = {};
	const nestableInterneProduits = new Set<string>();
	for (const p of produits) {
		produitMap.set(p.id, {
			id: p.id,
			laizes_mm: p.laizes_mm,
			orientation_imposee: p.orientation_imposee,
			jointage_autorise: p.jointage_autorise,
			nestable: p.nestable,
			marge_pose_mm: p.marge_pose_mm,
			recouvrement_mm: p.recouvrement_mm
		});
		produitsInfo[p.id] = {
			reference: p.reference,
			nom: p.nom,
			famille: p.famille,
			fabricant: p.fabricant ?? ''
		};
		if (p.nestable) nestableInterneProduits.add(p.id);
	}

	const algoVitres: AlgoVitre[] = vitres.map((v) => ({
		id: v.id,
		produit_id: v.produit_id,
		largeur_mm: v.largeur_mm,
		hauteur_mm: v.hauteur_mm,
		quantite: v.quantite,
		sur_mesure_fournisseur: v.sur_mesure_fournisseur
	}));

	const resultat = optimiserDecoupe(algoVitres, produitMap);

	// Repli accessible : id vitre → dimensions/quantité (lisible sans le SVG).
	const vitresInfo: Record<
		string,
		{ produit_id: string; largeur_mm: number; hauteur_mm: number; quantite: number }
	> = {};
	for (const v of vitres) {
		vitresInfo[v.id] = {
			produit_id: v.produit_id,
			largeur_mm: v.largeur_mm,
			hauteur_mm: v.hauteur_mm,
			quantite: v.quantite
		};
	}

	// Consolidation suggérée (Q3 / AC-014) : autres chantiers 'en_saisie' (hors sélection)
	// partageant un produit nestable posé en interne dans la sélection courante.
	const internesUtilises = new Set<string>();
	for (const v of algoVitres) {
		if (!v.sur_mesure_fournisseur && nestableInterneProduits.has(v.produit_id)) {
			internesUtilises.add(v.produit_id);
		}
	}
	let suggestions: { id: string; nom: string; produits: string[] }[] = [];
	if (internesUtilises.size > 0) {
		const { data: autresVitres } = await locals.supabase
			.from('decoupe_vitres')
			.select('chantier_id, produit_id')
			.in('produit_id', [...internesUtilises]);

		// Chantiers candidats (hors sélection) → produits partagés.
		const parChantier = new Map<string, Set<string>>();
		for (const v of autresVitres ?? []) {
			if (ids.includes(v.chantier_id)) continue;
			if (!parChantier.has(v.chantier_id)) parChantier.set(v.chantier_id, new Set());
			parChantier.get(v.chantier_id)!.add(v.produit_id);
		}

		if (parChantier.size > 0) {
			const { data: candidats } = await locals.supabase
				.from('decoupe_chantiers')
				.select('id, nom, statut')
				.in('id', [...parChantier.keys()])
				.eq('statut', 'en_saisie');

			suggestions = (candidats ?? []).map((c) => ({
				id: c.id,
				nom: c.nom,
				produits: [...(parChantier.get(c.id) ?? [])]
					.map((pid) => produitsInfo[pid]?.reference)
					.filter((r): r is string => Boolean(r))
			}));
		}
	}

	return {
		ok: true as const,
		hub: null,
		ids,
		selection,
		toutesLancees: selection.every((c) => c.statut === 'lancee'),
		nbVitres: vitres.length,
		calculeA: new Date().toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' }),
		resultat,
		produitsInfo,
		vitresInfo,
		suggestions
	};
};

export const actions: Actions = {
	lancer: async ({ request, locals }) => {
		const form = await request.formData();
		const ids = parseIds(form.get('chantiers') as string);
		if (ids.length === 0) return fail(400, { error: 'Sélection de chantiers invalide' });

		const { error } = await locals.supabase
			.from('decoupe_chantiers')
			.update(buildChantierLancementUpdate())
			.in('id', ids)
			.eq('statut', 'en_saisie'); // n'agit que sur les chantiers encore en saisie (idempotent)

		if (error) {
			console.error('Erreur lancement découpe:', error.message);
			return fail(400, { error: 'Erreur lors du lancement' });
		}
		return { success: true };
	}
};

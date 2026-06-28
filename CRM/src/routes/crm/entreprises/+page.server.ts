import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { EntrepriseCreateSchema, EntrepriseUpdateSchema, EntrepriseDeleteSchema, ENTREPRISE_FIELDS, extractForm, validate } from '$lib/schemas';
import { dbFail, now } from '$lib/server/db-helpers';
import type { TablesUpdate } from '$lib/database.types';
import { buildEntrepriseInsert, buildEntrepriseUpdate } from '$lib/server/referentiel/entreprises';
import { buildActiveStageByEntreprise } from '$lib/utils/entreprisesFormat';
import {
	parseEntreprisesQuery,
	applyEntreprisesBaseFilter,
	applyEntreprisesTabFilter,
	applyEntreprisesSansCantonFilter,
	entreprisesSearchPattern,
	ENTREPRISES_SEARCH_FIELDS,
	type EntreprisesTabKey,
} from '$lib/server/entreprises-query';

interface ZefixSearchResult {
	name: string;
	uid: string;
	legalSeat: string;
	canton: { cantonAbbreviation: string };
	purpose?: { fr?: string; de?: string; it?: string };
	address?: { street?: string; houseNumber?: string; swissZipCode?: string; city?: string };
}

/** Borne dure de l'union de recherche (par champ) : au-delà, l'utilisateur doit affiner. */
const SEARCH_UNION_CAP = 500;

/**
 * Comparateur stable pour le tri en mémoire de l'union de recherche : clé demandée (comparaison
 * texte null-safe) + tiebreaker `id` unique. Toutes les clés de tri whitelistées sont des
 * colonnes texte/date comparables en chaîne ; `null`/vide trié en premier (immatériel sur une
 * recherche). Le tiebreaker `id` garantit une pagination déterministe (parité avec le tri SQL).
 */
function compareBySortKey<T extends { id: string }>(key: string, asc: boolean): (a: T, b: T) => number {
	const dir = asc ? 1 : -1;
	return (a, b) => {
		const av = (a as Record<string, unknown>)[key];
		const bv = (b as Record<string, unknown>)[key];
		const c = (av == null ? '' : String(av)).localeCompare(bv == null ? '' : String(bv));
		if (c !== 0) return c * dir;
		return String(a.id).localeCompare(String(b.id));
	};
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const q = parseEntreprisesQuery(url);

	// INVARIANT (cadrage Bloc A) : contacts + opportunités CHARGÉS ENTIERS — la fiche SlideOut et
	// les pastilles par ligne (contact count, étape pipeline, source) en dépendent, et le set
	// `idsWithContact` (anti-join `sans-contact` + KPI) en est dérivé. La pagination ne porte que
	// sur les ENTREPRISES (la table qui croît le plus).
	const [contactsRes, oppsRes] = await Promise.all([
		locals.supabase
			.from('contacts')
			.select('id, nom, prenom, role_fonction, entreprise_id, email_professionnel, telephone')
			.eq('statut_archive', false),
		// On ne charge que les opportunités non terminées : F4 PipelineQuickAdvance opère
		// uniquement sur les pipelines actifs. Borne de sécurité contre la croissance linéaire
		// du payload côté SlideOut entreprise.
		locals.supabase
			.from('opportunites')
			.select('id, titre, entreprise_id, etape_pipeline, montant_estime, date_relance_prevue, notes_libres, date_derniere_modification')
			.not('etape_pipeline', 'in', '(gagne,perdu)')
			.order('date_derniere_modification', { ascending: false })
			.limit(500),
	]);

	const contacts = contactsRes.data ?? [];
	const opportunites = oppsRes.data ?? [];

	// Set des ids entreprise ayant ≥1 contact non archivé → filtre d'onglet `sans-contact` + KPI.
	const idsWithContact = [...new Set(contacts.map((c) => c.entreprise_id).filter((x): x is string => !!x))];
	// Ids entreprise portant ≥1 affaire active (étape valide) → KPI « affaires en cours ». Réutilise
	// le helper des pastilles pipeline pour garantir une sémantique IDENTIQUE à l'affichage.
	const affairesIds = [...buildActiveStageByEntreprise(opportunites).keys()];

	// Query principale : non archivées + filtre d'onglet + recherche + tri + pagination.
	const buildBase = () =>
		applyEntreprisesTabFilter(
			applyEntreprisesBaseFilter(locals.supabase.from('entreprises').select('*', { count: 'exact' })),
			q.tab,
			idsWithContact,
		);

	type EntRow = NonNullable<Awaited<ReturnType<typeof buildBase>>['data']>[number];

	const runMain = async (): Promise<{ data: EntRow[]; count: number; error: { message: string } | null }> => {
		if (q.search) {
			// Recherche = OR sur 3 champs. On évite le `.or()` interpolé (injection PostgREST,
			// cf. memory/feedback_postgrest_or_filter_injection) via 3 `.ilike()` PARAMÉTRÉS en
			// parallèle, bornés au CAP, puis UNION dédupliquée triée + paginée EN MÉMOIRE. Donne un
			// count EXACT (≤ CAP) et une pagination STABLE au-delà de la page 0 — contrairement à
			// l'ancienne approche range-par-champ (count `max()` approximatif, lignes sautées/
			// dupliquées d'une page à l'autre). Borne : une recherche matchant +CAP entreprises sur
			// un champ est tronquée (à affiner par l'utilisateur ; un tel résultat n'aide personne).
			const pattern = entreprisesSearchPattern(q.search);
			const queries = ENTREPRISES_SEARCH_FIELDS.map((field) =>
				buildBase().ilike(field, pattern).range(0, SEARCH_UNION_CAP - 1),
			);
			const results = await Promise.all(queries);
			const firstError = results.find((r) => r.error)?.error ?? null;
			if (firstError) return { data: [], count: 0, error: firstError };
			const seen = new Set<string>();
			const merged: EntRow[] = [];
			for (const r of results) {
				for (const row of (r.data ?? []) as EntRow[]) {
					if (!seen.has(row.id)) {
						seen.add(row.id);
						merged.push(row);
					}
				}
			}
			merged.sort(compareBySortKey(q.sortKey, q.sortAsc));
			const start = q.page * q.pageSize;
			return { data: merged.slice(start, start + q.pageSize), count: merged.length, error: null };
		}
		// Tri stable : clé demandée + tiebreaker `id` unique. Sans lui, des lignes à valeur de tri
		// égale (canton, statut, même date) peuvent changer de page entre deux chargements (l'ordre
		// Postgres sur des ex æquo n'est pas garanti) → lignes vues deux fois ou jamais en paginant.
		const r = await buildBase()
			.order(q.sortKey, { ascending: q.sortAsc })
			.order('id', { ascending: true })
			.range(q.page * q.pageSize, (q.page + 1) * q.pageSize - 1);
		return { data: (r.data ?? []) as EntRow[], count: r.count ?? 0, error: r.error };
	};

	// Counts d'onglet : requêtes `count:'exact', head:true` séparées, SANS limit. Ce sont des
	// comptes globaux par catégorie (indépendants de la recherche en cours — parité avec l'ancien
	// `entreprisesCountsByTab`, qui comptait sur la liste complète, pas sur la vue filtrée/cherchée).
	const tabCountBase = () =>
		applyEntreprisesBaseFilter(locals.supabase.from('entreprises').select('*', { count: 'exact', head: true }));
	const runTabCount = async (tab: EntreprisesTabKey): Promise<number> => {
		const r = await applyEntreprisesTabFilter(tabCountBase(), tab, idsWithContact);
		return r.count ?? 0;
	};

	const [mainRes, total, qualifiees, aQualifier, sansContact, sansCantonRes, affairesRes] = await Promise.all([
		runMain(),
		runTabCount('toutes'),
		runTabCount('qualifiees'),
		runTabCount('a-qualifier'),
		runTabCount('sans-contact'),
		// KPI : requêtes SÉPARÉES, sans filtre d'onglet ni pagination.
		applyEntreprisesSansCantonFilter(tabCountBase()),
		affairesIds.length > 0
			? applyEntreprisesBaseFilter(
					locals.supabase.from('entreprises').select('*', { count: 'exact', head: true }),
			  ).in('id', affairesIds)
			: Promise.resolve({ count: 0, error: null }),
	]);

	if (mainRes.error) {
		console.error('Erreur chargement entreprises:', mainRes.error.message);
	}

	const sansCanton = sansCantonRes.count ?? 0;
	const affairesEnCours = affairesRes.count ?? 0;
	// avecContact = total - sansContact (chaque entreprise non archivée a un contact, ou non).
	const avecContact = Math.max(0, total - sansContact);

	return {
		entreprises: mainRes.data,
		totalEntreprises: mainRes.count,
		tab: q.tab,
		page: q.page,
		pageSize: q.pageSize,
		sort: q.sortKey,
		sortAsc: q.sortAsc,
		search: q.search,
		tabCounts: { toutes: total, qualifiees, 'a-qualifier': aQualifier, 'sans-contact': sansContact },
		kpi: { total, qualifiees, avecContact, sansCanton, affairesEnCours, sansContact },
		contacts,
		opportunites,
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const raw = extractForm(form, [...ENTREPRISE_FIELDS]);
		const parsed = validate(EntrepriseCreateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('entreprises')
			.insert(buildEntrepriseInsert(parsed.data));

		return dbFail(error) ?? { success: true };
	},

	update: async ({ request, locals }) => {
		const form = await request.formData();
		const raw = extractForm(form, ['id', ...ENTREPRISE_FIELDS]);
		const parsed = validate(EntrepriseUpdateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('entreprises')
			.update(buildEntrepriseUpdate(parsed.data))
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},

	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(EntrepriseDeleteSchema, extractForm(form, ['id']));
		if (!parsed.success) return fail(400, { error: parsed.error });
		// `force` = l'utilisateur a confirmé la perte des données terrain (étape 2).
		const force = form.get('force') === 'true';

		// REG-01 cause 1 : garde dépendances DÉTACHABLES (contacts/opportunités)
		// CONSERVÉE (décision Pascal 2026-06-07). On charge la LISTE (pas le compte)
		// pour alimenter la modale UI qui invite à les détacher d'abord. JAMAIS
		// contournée par `force` : ces entités ne sont pas des données filles de
		// l'entreprise (FK SET NULL côté DB), on refuse de les orpheliner en masse.
		//
		// REG-01bis (fix bug « contact inexistant attaché ») : la garde ne compte que
		// les dépendances réellement DÉTACHABLES PAR L'UTILISATEUR, c.-à-d. visibles
		// dans la fiche. Le `load` n'affiche que les contacts non archivés (l.32) et
		// les opportunités actives (SlideOut exclut `gagne`/`perdu`). Compter ici un
		// contact archivé ou une opportunité clôturée — invisibles donc impossibles à
		// détacher depuis l'UI — produisait un blocage fantôme (« un contact inexistant
		// est attaché », entreprise « Film »). On aligne donc la garde sur l'UI : la FK
		// `ON DELETE SET NULL` détache proprement ces archives à la suppression.
		const [contactsRes, oppsRes] = await Promise.all([
			locals.supabase
				.from('contacts')
				.select('id, nom, prenom')
				.eq('entreprise_id', parsed.data.id)
				.eq('statut_archive', false),
			locals.supabase
				.from('opportunites')
				.select('id, titre')
				.eq('entreprise_id', parsed.data.id)
				.not('etape_pipeline', 'in', '(gagne,perdu)'),
		]);

		// I-1 (fail-secure) : une erreur de lecture des dépendances ne doit JAMAIS
		// laisser filer le DELETE (sinon suppression décidée sur une garde incomplète).
		if (contactsRes.error || oppsRes.error) return dbFail(contactsRes.error ?? oppsRes.error);
		const contacts = contactsRes.data ?? [];
		const opportunites = oppsRes.data ?? [];
		if (contacts.length > 0 || opportunites.length > 0) {
			const deps: string[] = [];
			if (contacts.length > 0) deps.push(`${contacts.length} contact(s)`);
			if (opportunites.length > 0) deps.push(`${opportunites.length} opportunite(s)`);
			return fail(409, {
				success: false as const,
				blocked: true as const,
				contacts,
				opportunites,
				error: `Impossible de supprimer : ${deps.join(' et ')} rattache(s)`,
			});
		}

		// I-2 (décision Pascal 2026-06-07) : les données TERRAIN (photos, visites,
		// suggestions de contact) ont une FK `ON DELETE CASCADE` → elles seraient
		// effacées AVEC l'entreprise. Comme elles lui appartiennent (pas
		// « détachables »), on ne BLOQUE pas, mais on exige une confirmation qui
		// chiffre la perte (zéro effacement silencieux). Tant que l'utilisateur n'a
		// pas confirmé (`force`), on ne supprime rien et on renvoie le décompte.
		const [photosRes, visitsRes, suggestionsRes] = await Promise.all([
			locals.supabase.from('prospect_photos').select('id', { count: 'exact', head: true }).eq('entreprise_id', parsed.data.id),
			locals.supabase.from('prospect_visits').select('id', { count: 'exact', head: true }).eq('entreprise_id', parsed.data.id),
			locals.supabase.from('contact_suggestions').select('id', { count: 'exact', head: true }).eq('entreprise_id', parsed.data.id),
		]);
		// I-1 (fail-secure) : un échec de comptage cascade bloque aussi le DELETE.
		if (photosRes.error || visitsRes.error || suggestionsRes.error) {
			return dbFail(photosRes.error ?? visitsRes.error ?? suggestionsRes.error);
		}
		const cascade = {
			photos: photosRes.count ?? 0,
			visites: visitsRes.count ?? 0,
			suggestions: suggestionsRes.count ?? 0,
		};

		// Étape 1 : tant que l'utilisateur n'a pas confirmé, on renvoie le décompte
		// sans rien supprimer (la modale chiffre la perte terrain).
		if (!force) {
			return fail(409, { success: false as const, needsConfirm: true as const, cascade });
		}

		// Étape 2 (confirmé) : suppression. La cascade DB efface les données terrain.
		const { error } = await locals.supabase
			.from('entreprises')
			.delete()
			.eq('id', parsed.data.id);
		const failed = dbFail(error);
		if (failed) return failed;

		// I-3 : traçabilité applicative de la perte cascade (cohérence avec les
		// DELETE photos/visits déjà journalisés côté endpoints terrain).
		const totalCascade = cascade.photos + cascade.visites + cascade.suggestions;
		if (totalCascade > 0) {
			console.log(
				`[REG-01] Entreprise ${parsed.data.id} supprimée avec ${cascade.photos} photo(s), ${cascade.visites} visite(s), ${cascade.suggestions} suggestion(s) terrain en cascade.`
			);
		}
		return { success: true };
	},

	enrichir: async ({ request, locals }) => {
		const form = await request.formData();
		const id = form.get('id') as string;
		const raison_sociale = form.get('raison_sociale') as string;
		if (!id || !raison_sociale) return fail(400, { error: 'Données manquantes' });

		const u = env.ZEFIX_USERNAME;
		const p = env.ZEFIX_PASSWORD;
		if (!u || !p) return fail(400, { error: 'Credentials Zefix non configurés' });

		// Audit 360 V2b H-02 : ne jamais écraser des notes_libres déjà saisies
		// par l'utilisateur. On charge la fiche existante avant l'update et on
		// ne réécrit `notes_libres` que si le champ est vide en DB.
		const { data: existing, error: existingErr } = await locals.supabase
			.from('entreprises')
			.select('notes_libres')
			.eq('id', id)
			.single();
		if (existingErr || !existing) return fail(400, { error: 'Entreprise introuvable' });

		try {
			const resp = await fetch('https://www.zefix.admin.ch/ZefixPublicREST/api/v1/company/search', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64'),
					'Accept': 'application/json',
				},
				body: JSON.stringify({ name: raison_sociale, maxEntries: 5 }),
			});

			if (!resp.ok) return fail(400, { error: `Zefix HTTP ${resp.status}` });
			const companies: ZefixSearchResult[] = await resp.json();
			if (!Array.isArray(companies) || companies.length === 0) {
				return fail(400, { error: 'Aucun résultat Zefix' });
			}

			const best = companies[0];
			const addr = best.address;
			const adresse = addr
				? [addr.street, addr.houseNumber, addr.swissZipCode, addr.city].filter(Boolean).join(' ')
				: null;
			const purpose = best.purpose?.fr || best.purpose?.de || best.purpose?.it || null;

			const updates: TablesUpdate<'entreprises'> = {
				numero_ide: best.uid || null,
				canton: best.canton?.cantonAbbreviation || null,
				date_derniere_modification: now(),
			};
			if (adresse) updates.adresse_siege = adresse;
			// H-02 : preserve user-entered notes_libres si existant et non vide.
			if (purpose && !existing.notes_libres) updates.notes_libres = purpose;

			const { error } = await locals.supabase
				.from('entreprises')
				.update(updates)
				.eq('id', id);

			return dbFail(error) ?? { success: true };
		} catch (err) {
			console.error('Erreur enrichissement Zefix:', err);
			return fail(500, { error: 'Erreur lors de la requête Zefix' });
		}
	},
};

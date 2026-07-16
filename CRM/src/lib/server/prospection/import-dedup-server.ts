/**
 * I/O de la dédup multi-axes de l'import de liste (Run 3 Atelier 209).
 *
 * Sépare l'accès base (impur) des fonctions pures de `import-dedup.ts` (stress-testées). Charge
 * les 4 ensembles de clés de dédup (nom+localité / téléphone / e-mail / domaine) des leads
 * EXISTANTS de la marque active, tous sources confondus. MARQUE-SCOPÉ : un import LED ne peut
 * jamais matcher un lead FilmPro (invariant dur, cf. spec §2). Tolérant aux erreurs DB (sets vides
 * → l'index unique `(marque,'manuel',source_id)` reste le dernier filet côté base pour l'axe 1).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Marque } from '$lib/marque';
import { addKeysToSets, buildLeadDedupKeys, emptyDedupSets, type LeadDedupSets } from './import-dedup';

type ReadClient = Pick<SupabaseClient, 'from'>;

interface ExistingLeadRow {
	raison_sociale: string | null;
	localite: string | null;
	npa: string | null;
	telephone: string | null;
	email: string | null;
	site_web: string | null;
}

/**
 * Cap PostgREST par défaut : un SELECT non borné est plafonné (1000 lignes). La dédup multi-axes
 * (téléphone/e-mail/domaine) n'étant PAS protégée par l'index unique (marque,'manuel',source_id),
 * une troncature silencieuse ferait entrer des doublons cross-source dès qu'une marque dépasse le
 * cap. On PAGINE donc jusqu'à épuisement (même parade que `campagnes.ts`), pour ne jamais tronquer.
 */
const PG_PAGE = 1000;

/**
 * Charge les ensembles de dédup depuis `prospect_leads` (marque active), TOUS leads confondus,
 * paginé (jamais tronqué). Sélectionne uniquement les 6 colonnes nécessaires. Robuste : une
 * erreur/absence de données interrompt proprement (sets partiels/vides, pas d'exception).
 */
export async function fetchLeadDedupSets(supabase: ReadClient, marque: Marque): Promise<LeadDedupSets> {
	const sets = emptyDedupSets();
	for (let from = 0; ; from += PG_PAGE) {
		const { data, error } = await supabase
			.from('prospect_leads')
			.select('raison_sociale, localite, npa, telephone, email, site_web')
			.eq('marque', marque)
			.order('id', { ascending: true }) // ordre stable pour une pagination sans trou ni doublon
			.range(from, from + PG_PAGE - 1);
		if (error || !data) return sets;
		for (const row of data as ExistingLeadRow[]) {
			addKeysToSets(sets, buildLeadDedupKeys({
				raison_sociale: row.raison_sociale ?? '',
				localite: row.localite,
				npa: row.npa,
				telephone: row.telephone,
				email: row.email,
				site_web: row.site_web,
			}));
		}
		if (data.length < PG_PAGE) return sets; // dernière page
	}
}

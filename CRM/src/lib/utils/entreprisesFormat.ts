/**
 * Helpers de formatage / rendu pour la page /entreprises (refonte v9 S176bis ; refonte serveur
 * Bloc A 2026-06-28). Les agrégats de page (KPI, counts d'onglet, filtre) sont passés CÔTÉ
 * SERVEUR (`+page.server.ts` + `$lib/server/entreprises-query`) ; ce module ne garde que les
 * helpers PURS de rendu par ligne (jamais throw) + les types de valeurs des composants KPI :
 * - emptyMessageForTab : message contextualisé d'EmptyState selon l'onglet
 * - readPersistedView / persistView : persistance vue table/cards (localStorage, SSR-safe)
 * - contactCountForEntreprise : nb de contacts rattachés (pastille par ligne)
 * - buildActiveStageByEntreprise : etape pipeline active la plus avancee par entreprise (pastille + KPI serveur)
 * - sourceMetaFor : pill source (zefix/google/terrain/...) sans inventer de sens
 * - relativeTimeFr : temps relatif FR compact, robuste (jamais throw)
 * - types EntreprisesIndicatorsValues / EntreprisesPremiumIndicatorsValues : props des KPI
 */

import { etapeLabel } from '$lib/utils/pipelineFormat';

export type EntreprisesTab = 'toutes' | 'qualifiees' | 'a-qualifier' | 'sans-contact';

export type EntreprisesView = 'table' | 'cards';

export type ContactForEntrepriseLite = {
	entreprise_id: string | null;
};

export type EntreprisesIndicatorsValues = {
	total: number;
	qualifiees: number;
	avecContact: number;
	sansCanton: number;
};

// Refonte serveur Bloc A (2026-06-28) : les agrégats `entreprisesIndicators`,
// `filterEntreprisesByTab`, `entreprisesCountsByTab` et `entreprisesPremiumIndicators` ont été
// retirés — KPI, counts d'onglet et filtre/pagination sont désormais calculés CÔTÉ SERVEUR
// (requêtes `count:'exact'` séparées) dans `+page.server.ts` via `$lib/server/entreprises-query`.
// Les TYPES de valeurs (EntreprisesIndicatorsValues, EntreprisesPremiumIndicatorsValues) restent
// ici car les composants KPI (EntreprisesIndicators / EntreprisesKpiStrip) les consomment.

/**
 * Message contextualisé pour l'EmptyState selon le tab actif.
 */
export function emptyMessageForTab(tab: EntreprisesTab): string {
	switch (tab) {
		case 'qualifiees':
			return 'Aucune entreprise qualifiée pour le moment.';
		case 'a-qualifier':
			return 'Toutes vos entreprises sont qualifiées. Bravo.';
		case 'sans-contact':
			return 'Toutes vos entreprises ont au moins un contact rattaché.';
		case 'toutes':
		default:
			return 'Aucune entreprise. Ajoutez-en une manuellement ou rattachez-en via un contact.';
	}
}

/**
 * Lit la vue persistée depuis localStorage (SSR-safe).
 * Default : 'table' (efficacité workspace).
 */
export function readPersistedView(storage: Pick<Storage, 'getItem'> | null | undefined): EntreprisesView {
	if (!storage) return 'table';
	try {
		const raw = storage.getItem('crm.entreprises.view');
		return raw === 'cards' ? 'cards' : 'table';
	} catch {
		return 'table';
	}
}

/**
 * Persiste la vue choisie en localStorage (SSR-safe, no-op si indispo).
 */
export function persistView(storage: Pick<Storage, 'setItem'> | null | undefined, view: EntreprisesView): void {
	if (!storage) return;
	try {
		storage.setItem('crm.entreprises.view', view);
	} catch {
		// ignore quota / privacy mode
	}
}

/**
 * Compte le nombre de contacts rattachés à une entreprise donnée.
 */
export function contactCountForEntreprise<C extends ContactForEntrepriseLite>(
	entrepriseId: string,
	contacts: ReadonlyArray<C>
): number {
	let n = 0;
	for (const c of contacts) {
		if (c.entreprise_id === entrepriseId) n += 1;
	}
	return n;
}

/* ============================================================================
 * Vague 2 - ligne premium (flag ffCrmListesV2). Helpers PURS, stress-testables.
 * ========================================================================== */

/** Variante de couleur d'une etape, alignee sur la palette workflow (app.css). */
export type StageVariant = 'import' | 'enrich' | 'qualify' | 'convert';

export type StageMeta = { key: string; label: string; variant: StageVariant };

/**
 * Etape active -> variante palette workflow, dans l'ordre de progression
 * (slate -> violet -> ambre -> vert). Source des cles : config.pipeline.etapes.
 * Les etapes closes (gagne/perdu) ne sont jamais chargees dans la liste entreprises
 * (cf. +page.server.ts) : absentes de ce mapping -> ignorees.
 */
const STAGE_VARIANT_BY_ETAPE: Record<string, StageVariant> = {
	identification: 'import',
	qualification: 'enrich',
	proposition: 'qualify',
	negociation: 'convert',
};

/** Rang d'avancement (pour retenir l'affaire la plus avancee par entreprise). */
const ETAPE_RANK: Record<string, number> = {
	identification: 1,
	qualification: 2,
	proposition: 3,
	negociation: 4,
};

export type OppForStage = {
	entreprise_id: string | null;
	etape_pipeline: string | null;
};

/**
 * Map entreprise_id -> etape active la PLUS AVANCEE (StageMeta).
 * Une entreprise sans opportunite active (ou avec etape inconnue/close) est absente
 * de la map. O(n) sur les opportunites. Jamais throw.
 */
export function buildActiveStageByEntreprise<O extends OppForStage>(
	opps: ReadonlyArray<O>
): Map<string, StageMeta> {
	const best = new Map<string, { rank: number; key: string }>();
	for (const o of opps) {
		const eid = o?.entreprise_id;
		const key = o?.etape_pipeline;
		if (!eid || !key) continue;
		const rank = ETAPE_RANK[key] ?? 0;
		if (rank === 0) continue; // etape inconnue ou close -> ignore (pas d'invention)
		const cur = best.get(eid);
		if (!cur || rank > cur.rank) best.set(eid, { rank, key });
	}
	const out = new Map<string, StageMeta>();
	for (const [eid, { key }] of best) {
		out.set(eid, { key, label: etapeLabel(key), variant: STAGE_VARIANT_BY_ETAPE[key] ?? 'import' });
	}
	return out;
}

/** Pill source. `neutral` = source connue sans couleur dediee ou inconnue (affichee telle quelle). */
export type SourceVariant = 'zefix' | 'google' | 'terrain' | 'veille' | 'neutral';
export type SourceMeta = { label: string; variant: SourceVariant };

/**
 * Metadonnees d'affichage d'une source d'entreprise. Le champ `source` est libre
 * (pas un enum DB) : on mappe les valeurs connues, et pour une valeur inconnue on
 * l'affiche telle quelle (tronquee) en neutre -> jamais d'invention de sens.
 * `null`/vide -> null (pas de pill). Jamais throw.
 */
export function sourceMetaFor(source: string | null | undefined): SourceMeta | null {
	if (typeof source !== 'string') return null;
	const raw = source.trim();
	if (!raw) return null;
	const s = raw.toLowerCase();
	if (s === 'zefix') return { label: 'Zefix', variant: 'zefix' };
	if (s === 'google' || s === 'google_places') return { label: 'Google', variant: 'google' };
	if (s === 'lead_express' || s === 'terrain') return { label: 'Terrain', variant: 'terrain' };
	if (s === 'veille') return { label: 'Veille', variant: 'veille' };
	if (s === 'search_ch' || s === 'search.ch') return { label: 'search.ch', variant: 'neutral' };
	if (s === 'simap') return { label: 'SIMAP', variant: 'neutral' };
	if (s === 'manuel' || s === 'manual' || s === 'import') return { label: 'Manuel', variant: 'neutral' };
	return { label: raw.length > 18 ? `${raw.slice(0, 17)}…` : raw, variant: 'neutral' };
}

/**
 * Temps relatif FR compact a partir d'une date ISO (ex. date_derniere_modification).
 * "a l'instant" (futur/<1min) | "aujourd'hui" | "hier" | "il y a N j" (2-6) |
 * "il y a N sem" (1-4) | "il y a N mois" (1-11) | "il y a N an(s)".
 * Entree invalide/absente -> '' . Jamais throw (invariant stress test).
 */
export function relativeTimeFr(iso: string | null | undefined, now: Date = new Date()): string {
	if (!iso) return '';
	const t = new Date(iso).getTime();
	if (Number.isNaN(t)) return '';
	const base = now instanceof Date ? now.getTime() : Date.now();
	if (Number.isNaN(base)) return '';
	const diffMs = base - t;
	if (diffMs < 60_000) return "à l'instant";
	const days = Math.floor(diffMs / 86_400_000);
	if (days <= 0) return "aujourd'hui";
	if (days === 1) return 'hier';
	if (days < 7) return `il y a ${days} j`;
	const weeks = Math.floor(days / 7);
	if (weeks < 5) return `il y a ${weeks} sem`;
	const months = Math.floor(days / 30);
	if (months < 12) return `il y a ${Math.max(1, months)} mois`;
	const years = Math.floor(days / 365);
	return `il y a ${Math.max(1, years)} an${years > 1 ? 's' : ''}`;
}

/** Valeurs du KPI premium (calculées côté serveur, cf. `+page.server.ts`). */
export type EntreprisesPremiumIndicatorsValues = {
	total: number;
	qualifiees: number;
	affairesEnCours: number;
	sansContact: number;
};

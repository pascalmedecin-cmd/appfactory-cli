/**
 * Helpers de formatage et calculs pour la page /entreprises (refonte v9 S176bis page 4/6).
 * - entreprisesIndicators : 4 KPIs flat premium (total, qualifiees, avecContact, sansCanton)
 * - filterEntreprisesByTab : filtre selon tab actif (toutes, qualifiees, a-qualifier, sans-contact)
 * - entreprisesCountsByTab : counts par tab pour pills
 *
 * Vague 2 (listes premium) : helpers PURS pour la « ligne riche » (flag ffCrmListesV2).
 * - buildActiveStageByEntreprise : etape pipeline active la plus avancee par entreprise
 * - sourceMetaFor : pill source (zefix/google/terrain/...) sans inventer de sens
 * - relativeTimeFr : temps relatif FR compact, robuste (jamais throw)
 * - entreprisesPremiumIndicators : 4 chips KPI (total, qualifiees, affairesEnCours, sansContact)
 */

import { etapeLabel } from '$lib/utils/pipelineFormat';

export type EntreprisesTab = 'toutes' | 'qualifiees' | 'a-qualifier' | 'sans-contact';

export type EntreprisesView = 'table' | 'cards';

export type EntrepriseLite = {
	id: string;
	statut_qualification: string | null;
	canton: string | null;
};

export type ContactForEntrepriseLite = {
	entreprise_id: string | null;
};

export type EntreprisesIndicatorsValues = {
	total: number;
	qualifiees: number;
	avecContact: number;
	sansCanton: number;
};

/**
 * Calcule l'ensemble des entreprise_id ayant au moins un contact rattaché.
 * Utilisé par indicators + filter pour éviter recalcul O(n*m).
 */
function buildEntrepriseIdsWithContact<C extends ContactForEntrepriseLite>(
	contacts: ReadonlyArray<C>
): Set<string> {
	const set = new Set<string>();
	for (const c of contacts) {
		if (c.entreprise_id) set.add(c.entreprise_id);
	}
	return set;
}

/**
 * Indicateurs flat premium en haut de page /entreprises.
 * - total : count entreprises
 * - qualifiees : statut_qualification='qualifie'
 * - avecContact : count entreprises ayant ≥1 contact rattaché
 * - sansCanton : count canton=null/vide
 */
export function entreprisesIndicators<E extends EntrepriseLite, C extends ContactForEntrepriseLite>(
	entreprises: ReadonlyArray<E>,
	contacts: ReadonlyArray<C>
): EntreprisesIndicatorsValues {
	const idsWithContact = buildEntrepriseIdsWithContact(contacts);

	let total = 0;
	let qualifiees = 0;
	let avecContact = 0;
	let sansCanton = 0;

	for (const e of entreprises) {
		total += 1;
		if (e.statut_qualification === 'qualifie') qualifiees += 1;
		if (idsWithContact.has(e.id)) avecContact += 1;
		if (!e.canton) sansCanton += 1;
	}

	return { total, qualifiees, avecContact, sansCanton };
}

/**
 * Filtre les entreprises selon le tab actif.
 * - toutes : aucun filtre supplémentaire
 * - qualifiees : statut_qualification='qualifie'
 * - a-qualifier : statut_qualification='nouveau' OU null (à qualifier = pas encore traité)
 * - sans-contact : aucun contact rattaché
 */
export function filterEntreprisesByTab<E extends EntrepriseLite, C extends ContactForEntrepriseLite>(
	entreprises: ReadonlyArray<E>,
	contacts: ReadonlyArray<C>,
	tab: EntreprisesTab
): E[] {
	if (tab === 'toutes') return [...entreprises];
	if (tab === 'qualifiees') {
		return entreprises.filter((e) => e.statut_qualification === 'qualifie');
	}
	if (tab === 'a-qualifier') {
		return entreprises.filter(
			(e) => e.statut_qualification === 'nouveau' || e.statut_qualification === null
		);
	}
	// sans-contact
	const idsWithContact = buildEntrepriseIdsWithContact(contacts);
	return entreprises.filter((e) => !idsWithContact.has(e.id));
}

/**
 * Counts par tab pour les pills compteur des onglets ARIA.
 */
export function entreprisesCountsByTab<E extends EntrepriseLite, C extends ContactForEntrepriseLite>(
	entreprises: ReadonlyArray<E>,
	contacts: ReadonlyArray<C>
): Record<EntreprisesTab, number> {
	const idsWithContact = buildEntrepriseIdsWithContact(contacts);
	let qualifiees = 0;
	let aQualifier = 0;
	let sansContact = 0;
	for (const e of entreprises) {
		if (e.statut_qualification === 'qualifie') qualifiees += 1;
		if (e.statut_qualification === 'nouveau' || e.statut_qualification === null) aQualifier += 1;
		if (!idsWithContact.has(e.id)) sansContact += 1;
	}
	return {
		toutes: entreprises.length,
		qualifiees,
		'a-qualifier': aQualifier,
		'sans-contact': sansContact,
	};
}

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
 * Logo Clearbit pour un site web. Retourne null si site_web invalide.
 * Utilisé en cards + table cellule logo.
 * Note GDPR : envoie hostname domaine prospect à Clearbit (Watchlist S176bis).
 */
export function logoUrlForSite(siteWeb: string | null | undefined): string | null {
	if (!siteWeb) return null;
	try {
		const url = new URL(siteWeb);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
		return `https://logo.clearbit.com/${url.hostname}`;
	} catch {
		return null;
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

export type EntreprisesPremiumIndicatorsValues = {
	total: number;
	qualifiees: number;
	affairesEnCours: number;
	sansContact: number;
};

/**
 * KPI chips premium (Vague 2) : total, qualifiees, affaires en cours (>=1 opp active),
 * sans contact. O(n). Reutilise les memes index que les indicateurs flat. Jamais throw.
 */
export function entreprisesPremiumIndicators<
	E extends EntrepriseLite,
	C extends ContactForEntrepriseLite,
	O extends OppForStage
>(
	entreprises: ReadonlyArray<E>,
	contacts: ReadonlyArray<C>,
	opps: ReadonlyArray<O>
): EntreprisesPremiumIndicatorsValues {
	const idsWithContact = buildEntrepriseIdsWithContact(contacts);
	const stageByEnt = buildActiveStageByEntreprise(opps);
	let total = 0;
	let qualifiees = 0;
	let affairesEnCours = 0;
	let sansContact = 0;
	for (const e of entreprises) {
		total += 1;
		if (e.statut_qualification === 'qualifie') qualifiees += 1;
		if (stageByEnt.has(e.id)) affairesEnCours += 1;
		if (!idsWithContact.has(e.id)) sansContact += 1;
	}
	return { total, qualifiees, affairesEnCours, sansContact };
}

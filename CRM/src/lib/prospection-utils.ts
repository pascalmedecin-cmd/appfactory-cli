/**
 * Utilitaires partagés pour le module Prospection.
 * Labels, variants, options de filtrage - source unique (pas de duplication).
 */
import { config } from '$lib/config';

// === Phase 2 2026-05-01 : 4 onglets par nature de signal — source unique ===

export const PROSPECTION_TABS = ['simap', 'regbl', 'entreprises', 'terrain'] as const;
export type ProspectionTabKey = typeof PROSPECTION_TABS[number];

// Sources DB (prospect_leads.source) appartenant à chaque onglet.
// `lead_express` = saisie terrain (cf. createExpress action).
// `veille` = leads créés via integration Veille→Prospection (cf. project_veille_prospection_integration_s120).
export const TAB_SOURCE_MAP: Record<ProspectionTabKey, readonly string[]> = {
	simap: ['simap'],
	regbl: ['regbl'],
	entreprises: ['zefix', 'search_ch'],
	terrain: ['lead_express', 'veille'],
} as const;

// Champs de tri exposés à l'utilisateur (cohérent avec VALID_SORT_KEYS côté serveur).
export const SORT_FIELDS = [
	{ value: 'score_pertinence', label: 'Priorité (score)' },
	{ value: 'raison_sociale', label: 'Entreprise (A-Z)' },
	{ value: 'date_import', label: 'Date ajout' },
	{ value: 'date_publication', label: 'Date publication' },
	{ value: 'montant', label: 'Montant' },
	{ value: 'canton', label: 'Canton' },
	{ value: 'statut', label: 'Statut' },
	{ value: 'localite', label: 'Localité' },
	{ value: 'source', label: 'Source' },
] as const;
export const VALID_SORT_KEYS = SORT_FIELDS.map((s) => s.value);


const { labels: scoreLabels } = config.scoring;

// --- Canton noms ---

export const cantonNoms: Record<string, string> = {
	GE: 'Genève',
	VD: 'Vaud',
	VS: 'Valais',
	NE: 'Neuchâtel',
	FR: 'Fribourg',
	JU: 'Jura',
};

// --- Score ---

// Phase 0 : tags métier orientés action commerciale (remplace "Chaud / Tiède / Froid"
// jugé pas pro et pas explicite). Cohérent avec le pattern Linear Priority.
export function scoreLabel(score: number): string {
	if (score >= scoreLabels.chaud) return 'Prioritaire';
	if (score >= scoreLabels.tiede) return 'À qualifier';
	return 'Faible signal';
}

export function scoreBadgeVariant(score: number): 'danger' | 'warning' | 'muted' {
	if (score >= scoreLabels.chaud) return 'danger';
	if (score >= scoreLabels.tiede) return 'warning';
	return 'muted';
}

export function scoreToCategory(score: number): string {
	if (score >= scoreLabels.chaud) return 'chaud';
	if (score >= scoreLabels.tiede) return 'tiede';
	return 'froid';
}

// Glyphe Lucide à associer au tag : flame (Prioritaire), target (À qualifier), eye (Faible signal).
// Cohérent avec le mockup validé 2026-05-01.
export function scoreIcon(score: number): 'flame' | 'target' | 'eye' {
	if (score >= scoreLabels.chaud) return 'flame';
	if (score >= scoreLabels.tiede) return 'target';
	return 'eye';
}

// --- Statut ---

export function statutLabel(statut: string): string {
	const labels: Record<string, string> = {
		nouveau: 'Nouveau',
		interesse: 'Intéressé',
		ecarte: 'Écarté',
		transfere: 'Converti',
	};
	return labels[statut] ?? statut;
}

export function statutBadgeVariant(statut: string): 'default' | 'info' | 'success' | 'warning' | 'danger' | 'muted' {
	switch (statut) {
		case 'nouveau': return 'warning';
		case 'interesse': return 'info';
		case 'ecarte': return 'muted';
		case 'transfere': return 'success';
		default: return 'default';
	}
}

// --- Source ---

export function sourceLabel(s: string): string {
	const labels: Record<string, string> = {
		zefix: 'Registre du commerce',
		simap: 'Marchés publics',
		regbl: 'Registre des bâtiments',
		search_ch: 'Annuaire',
		lead_express: 'Saisie terrain',
	};
	return labels[s] ?? s;
}

// --- Options de filtrage (source unique) ---

export const sourceOptions = [
	{ value: 'zefix', label: 'Zefix (registre du commerce)' },
	{ value: 'simap', label: 'SIMAP (marchés publics)' },
	{ value: 'regbl', label: 'RegBL (registre des bâtiments)' },
	{ value: 'search_ch', label: 'search.ch (annuaire)' },
	{ value: 'lead_express', label: 'Saisie terrain (mobile)' },
];

const cantons = [...config.scoring.cantonsPrioritaires.values, ...config.scoring.cantonsSecondaires.values];

export const cantonOptions = cantons.map(c => ({ value: c, label: `${cantonNoms[c] ?? c} (${c})` }));

export const temperatureOptions = [
	{ value: 'chaud', label: 'Chaud', dotColor: 'bg-danger' },
	{ value: 'tiede', label: 'Tiède', dotColor: 'bg-warning' },
	{ value: 'froid', label: 'Froid', dotColor: 'bg-text-muted' },
];

export const statutOptions = [
	{ value: 'nouveau', label: 'Nouveau' },
	{ value: 'interesse', label: 'Intéressé' },
	{ value: 'ecarte', label: 'Écarté' },
	{ value: 'transfere', label: 'Converti' },
];

// --- Date relative ---

export function relativeDate(dateStr: string | null): string {
	if (!dateStr) return '–';
	const date = new Date(dateStr);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	if (diffDays === 0) return "Aujourd'hui";
	if (diffDays === 1) return 'Hier';
	if (diffDays < 7) return `Il y a ${diffDays} j`;
	if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`;
	if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
	return `Il y a ${Math.floor(diffDays / 365)} an${Math.floor(diffDays / 365) > 1 ? 's' : ''}`;
}

// --- Phase 1 : helper context queue triage matin ---
// Une phrase courte qui contextualise le lead pour scan rapide dans la queue.
// Format adapté à chaque source : montant SIMAP, taille bâtiment RegBL, ancienneté Zefix, etc.
type LeadContextInput = {
	source: string;
	montant?: number | null;
	date_publication?: string | null;
	canton?: string | null;
	localite?: string | null;
	adresse?: string | null;
	telephone?: string | null;
	description?: string | null;
};

function formatMontantK(montant: number): string {
	return montant >= 1000 ? `${Math.round(montant / 1000)} k CHF` : `${montant} CHF`;
}
function formatDateShort(dateStr: string): string {
	const d = new Date(dateStr);
	if (Number.isNaN(d.getTime())) return '';
	return d.toLocaleDateString('fr-CH', { day: '2-digit', month: 'short' });
}
function daysSince(dateStr: string): number | null {
	const d = new Date(dateStr).getTime();
	if (Number.isNaN(d)) return null;
	return Math.floor((Date.now() - d) / 86_400_000);
}

export function formatLeadContext(lead: LeadContextInput): string {
	if (lead.source === 'simap') {
		// Montant 0 = lot non valorisé / donnée manquante côté SIMAP : afficher "n/d", pas "0 CHF"
		const montant = typeof lead.montant === 'number' && lead.montant > 0 ? formatMontantK(lead.montant) : 'montant n/d';
		const cloture = lead.date_publication ? formatDateShort(lead.date_publication) : 'date n/d';
		return `Marché public · ${montant} · publié ${cloture}`;
	}
	if (lead.source === 'regbl') {
		const lieu = lead.adresse || lead.localite || lead.canton || 'Suisse romande';
		return `Permis bâtiment · ${lieu}`;
	}
	if (lead.source === 'zefix') {
		const age = lead.date_publication ? daysSince(lead.date_publication) : null;
		const c = lead.canton ? cantonNoms[lead.canton] ?? lead.canton : '';
		// Seuil 90 j cohérent avec config.scoring.recence (30/90), pas 60 arbitraire.
		return age !== null && age >= 0 && age <= 90
			? `Inscription RC · ${age} j · ${c}`.trim()
			: `Registre du commerce · ${c}`.trim();
	}
	if (lead.source === 'lead_express') {
		const tel = lead.telephone ? ` · ${lead.telephone}` : '';
		// Squash retours ligne + truncate avec ellipsis pour layout 1 ligne dans la queue triage.
		let note = '';
		if (lead.description) {
			const cleaned = lead.description.replace(/\s+/g, ' ').trim();
			note = ` · ${cleaned.slice(0, 60)}${cleaned.length > 60 ? '…' : ''}`;
		}
		return `Saisie terrain${tel}${note}`;
	}
	if (lead.source === 'search_ch') {
		const c = lead.canton ? cantonNoms[lead.canton] ?? lead.canton : 'CH';
		return `Annuaire · ${c}`;
	}
	const c = lead.canton ?? '';
	return `${sourceLabel(lead.source)}${c ? ` · ${c}` : ''}`;
}

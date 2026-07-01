import { z } from 'zod';
import { RESULTAT_VISITE } from './types/visit-result';
import { MAX_CAMPAGNE_IDS } from '$lib/campagnes';

// -- Helpers --

const optionalString = z.string().max(500).optional().or(z.literal(''));
const optionalText = z.string().max(5000).optional().or(z.literal(''));
const optionalUUID = z.string().uuid().optional().or(z.literal(''));
const requiredUUID = z.string().uuid();

// -- Enums --

export const CANTONS = [
	'GE', 'VD', 'VS', 'FR', 'NE', 'JU', 'BE', 'BS', 'BL', 'SO',
	'AG', 'ZH', 'LU', 'ZG', 'SZ', 'NW', 'OW', 'UR', 'GL', 'SH',
	'TG', 'AR', 'AI', 'SG', 'GR', 'TI',
] as const;

export const ETAPES_PIPELINE = [
	'identification', 'qualification', 'proposition', 'negociation', 'gagne', 'perdu',
] as const;

/** Étapes terminales (deal clos) : exclues des relances / du Kanban "en cours". */
export const ETAPES_PIPELINE_CLOSED = ['gagne', 'perdu'] as const;

// Modèle simplifié 2026-07-01 (radar SIMAP) : à trier -> à suivre / archivé.
// 'nouveau' = défaut à l'import (non trié) ; 'a_suivre'/'archive' = choix utilisateur
// via le bouton Statut. 'archive' est désormais first-class (plus write-only).
export const STATUTS_TRAITEMENT = [
	'nouveau', 'a_suivre', 'archive',
] as const;

// -- Form extraction helpers --

export function extractForm(form: FormData, fields: string[]) {
	const data: Record<string, string> = {};
	for (const field of fields) {
		data[field] = (form.get(field) as string) ?? '';
	}
	return data;
}

/**
 * Audit 360 M-17 : coercion booléenne unique pour les champs de formulaire.
 * Une case à cocher HTML envoie `'on'` par défaut ; certains formulaires posent
 * explicitement `'true'`/`'false'` ou `'1'`/`'0'`. Tout le reste (absent, `''`,
 * `'false'`, valeur inconnue) → `false`. Insensible à la casse.
 */
export function coerceFormBoolean(value: FormDataEntryValue | null | undefined): boolean {
	if (typeof value !== 'string') return false;
	const v = value.trim().toLowerCase();
	return v === 'true' || v === 'on' || v === '1';
}

// -- Contacts --

export const ContactCreateSchema = z.object({
	nom: z.string().min(1, 'Le nom est requis').max(200),
	prenom: optionalString,
	email_professionnel: z.string().email('Email invalide').optional().or(z.literal('')),
	telephone: z.string().max(30).optional().or(z.literal('')),
	role_fonction: optionalString,
	entreprise_id: optionalUUID,
	canton: z.enum(CANTONS).optional().or(z.literal('')),
	segment: optionalString,
	source: optionalString,
	notes_libres: optionalText,
	adresse: optionalString,
	tags: optionalString,
});

export const ContactUpdateSchema = ContactCreateSchema.extend({
	id: requiredUUID,
});

export const ContactDeleteSchema = z.object({
	id: requiredUUID,
});

// -- Entreprises --

export const EntrepriseCreateSchema = z.object({
	raison_sociale: z.string().min(1, 'La raison sociale est requise').max(300),
	secteur_activite: optionalString,
	canton: z.enum(CANTONS).optional().or(z.literal('')),
	taille_estimee: optionalString,
	site_web: z.string().url('URL invalide').optional().or(z.literal('')),
	numero_ide: z.string().max(20).optional().or(z.literal('')),
	adresse_siege: optionalString,
	segment_cible: optionalString,
	source: optionalString,
	notes_libres: optionalText,
	tags: optionalString,
});

export const EntrepriseUpdateSchema = EntrepriseCreateSchema.extend({
	id: requiredUUID,
});

export const EntrepriseDeleteSchema = z.object({
	id: requiredUUID,
});

// -- Opportunites --

export const OpportuniteCreateSchema = z.object({
	titre: z.string().min(1, 'Le titre est requis').max(300),
	contact_id: optionalUUID,
	entreprise_id: optionalUUID,
	montant_estime: z.coerce.number().min(0).max(999_999_999).optional().or(z.literal('')),
	etape_pipeline: z.enum(ETAPES_PIPELINE).optional(),
	date_relance_prevue: z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD requis').optional().or(z.literal('')),
	notes_libres: optionalText,
	responsable: optionalString,
	signal_affaires_id: optionalUUID,
});

export const OpportuniteUpdateSchema = OpportuniteCreateSchema.extend({
	id: requiredUUID,
});

export const OpportuniteMoveSchema = z.object({
	id: requiredUUID,
	etape_pipeline: z.enum(ETAPES_PIPELINE),
});

export const OpportuniteArchiveSchema = z.object({
	id: requiredUUID,
	motif_perte: optionalString,
});

// Lot 2 : « Convertir en client » depuis le pipeline. Sur une opportunité issue d'un
// prospect (prospect_lead_id), crée l'entreprise + contact (RPC transfer_lead_to_crm)
// et lie l'opportunité à l'entreprise. Seul chemin prospect -> entreprise désormais.
export const OpportuniteConvertSchema = z.object({
	id: requiredUUID,
});

// F4 V2 mobile : update minimal de la prochaine action sur une opportunité
// (date relance + notes libres). Utilisé par PipelineQuickAdvance.svelte.
// Format date strict YYYY-MM-DD pour éviter qu'une saisie libre ("avant juin")
// remonte une erreur Postgres opaque.
export const OpportuniteNextActionSchema = z.object({
	id: requiredUUID,
	date_relance_prevue: z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide').optional().or(z.literal('')),
	notes_libres: optionalText,
});

// -- Signaux d'affaires --
// Modèle 2026-07-01 : le signal se trie via le bouton Statut (updateStatut vers
// 'a_suivre'/'archive'/'nouveau') ou se supprime. Plus d'édition libre du signal
// ni de conversion en opportunité (le pipeline part des prospects, pas des signaux).

export const SignalUpdateStatutSchema = z.object({
	id: requiredUUID,
	statut_traitement: z.enum(STATUTS_TRAITEMENT),
});

export const SignalDeleteSchema = z.object({
	id: requiredUUID,
});

export const SignalBatchDeleteSchema = z.object({
	ids: z
		.string()
		.min(1, 'Aucun signal sélectionné')
		.transform((s) => s.split(',').filter(Boolean))
		.pipe(
			z
				.array(z.string().uuid())
				.min(1, 'Aucun signal sélectionné')
				.max(500, 'Maximum 500 signaux par lot')
		),
});

// -- Prospect Leads --

export const SOURCES_LEAD = [
	'zefix', 'simap', 'search_ch', 'regbl', 'lead_express', 'google_places',
] as const;

// Lot 2 : modèle simplifié VIDE (à trier) / a_contacter (entre au pipeline) /
// ecarte (masqué, réactivable). 'transfere' conservé pour la conversion client
// depuis le pipeline (RPC transfer_lead_to_crm). Aligné migration 20260701000002
// (CHECK prospect_leads_statut_check) - drift DB<->Zod = 23514 silencieux.
export const STATUTS_LEAD = [
	'vide', 'a_contacter', 'ecarte', 'transfere',
] as const;

// Transitions manuelles directes autorisées via updateStatut / batchStatut :
// écarter (ecarte) et réactiver (vide). 'a_contacter' passe EXCLUSIVEMENT par la RPC
// mark_lead_for_contact (crée l'opportunité) ; 'transfere' par transfer_lead_to_crm au
// pipeline. Invariant préservé : a_contacter => une opportunité liée existe toujours.
export const STATUTS_LEAD_MANUELS = ['vide', 'ecarte'] as const;

export const CANTONS_LEAD = [
	'GE', 'VD', 'VS', 'NE', 'FR', 'JU',
] as const;

export const LeadCreateSchema = z.object({
	source: z.enum(SOURCES_LEAD),
	source_id: optionalString,
	source_url: optionalString,
	raison_sociale: z.string().min(1, 'La raison sociale est requise').max(500),
	nom_contact: optionalString,
	adresse: optionalString,
	npa: z.string().max(10).optional().or(z.literal('')),
	localite: optionalString,
	canton: z.enum(CANTONS_LEAD),
	telephone: z.string().max(30).optional().or(z.literal('')),
	site_web: z.string().max(500).optional().or(z.literal('')),
	email: z.string().email('Email invalide').optional().or(z.literal('')),
	secteur_detecte: optionalString,
	description: optionalText,
	montant: z.coerce.number().min(0).optional().or(z.literal('')),
	date_publication: z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD requis').optional().or(z.literal('')),
});

export const LeadUpdateSchema = LeadCreateSchema.extend({
	id: z.string().uuid(),
});

// F3 lead express mobile : saisie rapide post-RDV.
// 4 champs minimaux, source forcée 'lead_express' côté serveur, canton optionnel
// (sera enrichi via Zefix plus tard). Score pertinence reste à 0 jusqu'à enrichissement.
export const LeadExpressCreateSchema = z.object({
	raison_sociale: z.string().min(1, 'L\'entreprise est requise').max(500),
	nom_contact: z.string().max(200).optional().or(z.literal('')),
	telephone: z.string().max(30).optional().or(z.literal('')),
	notes: z.string().max(1000).optional().or(z.literal('')),
});

export const LEAD_EXPRESS_FIELDS = [
	'raison_sociale', 'nom_contact', 'telephone', 'notes',
] as const;

export const LeadUpdateStatutSchema = z.object({
	id: z.string().uuid(),
	statut: z.enum(STATUTS_LEAD_MANUELS),
});

export const LeadBatchStatutSchema = z.object({
	ids: z
		.array(z.string().uuid())
		.min(1, 'Selectionnez au moins un lead')
		.max(500, 'Maximum 500 leads par lot'),
	statut: z.enum(STATUTS_LEAD_MANUELS),
});

// « À contacter » : le prospect entre au pipeline (RPC mark_lead_for_contact).
export const LeadMarkForContactSchema = z.object({
	id: z.string().uuid(),
});

export const LeadTransfertSchema = z.object({
	id: z.string().uuid(),
});

// -- Prospection P3 : aperçu (preview) + import sélectif --
// Les 3 sources « entreprises » qui supportent le flux aperçu → cocher → importer.
// SIMAP/RegBL retirés de la Prospection (P1) : hors de ce flux.
export const SOURCES_LEAD_PREVIEW = ['zefix', 'search_ch', 'google_places'] as const;
export type LeadPreviewSource = (typeof SOURCES_LEAD_PREVIEW)[number];

/**
 * Un candidat d'aperçu re-soumis à l'import sélectif. Le payload client n'est JAMAIS
 * fait confiance (règle dure, spec P3 §1.2) : tous les champs sont bornés/validés ici,
 * le score est RE-calculé serveur (calculerScore), la dédup est RE-vérifiée serveur.
 * `score_pertinence`/`status_hint` côté client sont volontairement absents du schéma
 * → ignorés (jamais lus à l'insert). Entrée JSON (pas FormData) : nulls réels tolérés.
 */
export const CandidateImportSchema = z.object({
	source_id: z.string().min(1, 'source_id requis').max(120),
	source_url: z.string().max(500).nullable().optional(),
	raison_sociale: z.string().min(1, 'Raison sociale requise').max(500),
	adresse: z.string().max(500).nullable().optional(),
	npa: z.string().regex(/^\d{4}$/, 'NPA invalide (4 chiffres)').nullable().optional(),
	localite: z.string().max(200).nullable().optional(),
	canton: z.enum(CANTONS_LEAD).nullable().optional(),
	telephone: z.string().max(40).nullable().optional(),
	site_web: z.string().max(500).nullable().optional(),
	email: z.string().max(320).nullable().optional(),
	secteur_detecte: z.string().max(120).nullable().optional(),
	description: z.string().max(5000).nullable().optional(),
	date_publication: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (YYYY-MM-DD)').nullable().optional(),
});
export type CandidateImport = z.infer<typeof CandidateImportSchema>;

/**
 * Body de POST /api/prospection/import-selected. `source` enum fermée (gate flag serveur),
 * `candidates` = ENVELOPPE bornée 1..250 d'objets (cap zefix maxResultsPerQuery=250),
 * traçabilité Veille optionnelle.
 *
 * IMPORTANT : `candidates` est volontairement validé en `z.unknown()` au niveau enveloppe, PAS
 * en `CandidateImportSchema` strict. Chaque candidat est re-validé INDIVIDUELLEMENT côté serveur
 * (boucle `import-selected`) : un candidat mal formé est ignoré (compté), il ne fait PAS échouer
 * tout le lot. Sinon un seul NPA hors bornes (ex. résultat search.ch frontalier 5 chiffres)
 * détruirait la sélection entière de l'utilisateur (bug all-or-nothing). La validation stricte
 * par-ligne préserve la garde sécu (toute ligne insérée passe `CandidateImportSchema`).
 */
export const ImportSelectedSchema = z.object({
	source: z.enum(SOURCES_LEAD_PREVIEW),
	candidates: z
		.array(z.unknown())
		.min(1, 'Aucun candidat sélectionné')
		.max(250, 'Trop de candidats (max 250)'),
	from_intelligence: z.string().uuid().nullable().optional(),
	from_term: z.string().max(200).nullable().optional(),
	from_item_rank: z.number().int().min(1).max(10).nullable().optional(),
	// Vague 3.2 : étiquetage campagne du lot (optionnel, borné anti-DoS). Les ids sont re-validés
	// par la FK serveur au moment de l'assignation (un id inexistant -> 23503 traduit, best-effort).
	campagneIds: z.array(z.string().uuid()).max(MAX_CAMPAGNE_IDS).optional(),
});

// -- Feedback entries (page /log) --
// Spec : notes/page-log-2026-05-13/spec.md § 4 + § 8.

export const FEEDBACK_TYPES_ENUM = ['bug', 'suggestion', 'question'] as const;
export const FEEDBACK_SEVERITIES_ENUM = ['bloquant', 'genant', 'mineur'] as const;
export const FEEDBACK_STATUSES_ENUM = ['nouveau', 'a_actionner', 'traite', 'logge'] as const;

// Contexte capturé côté client (envoyé en string JSON dans le form).
export const FeedbackContextSchema = z.object({
	url: z.string().max(2000).default(''),
	viewport: z
		.object({
			w: z.coerce.number().int().min(0).max(20_000),
			h: z.coerce.number().int().min(0).max(20_000),
		})
		.default({ w: 0, h: 0 }),
	userAgent: z.string().max(1000).default(''),
	recentErrors: z
		.array(
			z.object({
				message: z.string().max(2000),
				stack: z.string().max(2000).optional(),
				at: z.string().max(50),
			})
		)
		.max(3)
		.default([]),
});

export const FeedbackCreateSchema = z
	.object({
		type: z.enum(FEEDBACK_TYPES_ENUM),
		severity: z.enum(FEEDBACK_SEVERITIES_ENUM).optional().or(z.literal('')),
		page: z.string().min(1, 'La page est requise').max(100),
		description: z
			.string()
			.min(10, 'La description doit faire au moins 10 caractères')
			.max(1000, 'La description ne peut pas dépasser 1000 caractères'),
		context: z
			.string()
			.max(20_000)
			.optional()
			.or(z.literal(''))
			.transform((s) => {
				if (!s) return null;
				try {
					return FeedbackContextSchema.parse(JSON.parse(s));
				} catch {
					return null;
				}
			}),
	})
	.refine(
		(data) => (data.type === 'bug' ? !!data.severity : !data.severity),
		{ message: 'Sévérité requise pour un bug, interdite sinon', path: ['severity'] }
	);

export const FeedbackUpdateStatusSchema = z.object({
	id: requiredUUID,
	status: z.enum(FEEDBACK_STATUSES_ENUM),
});

export const FeedbackUpdateNotesSchema = z.object({
	id: requiredUUID,
	// Normalisation au boundary Zod : trim + `'' → null`. Honore le CHECK SQL durci
	// `feedback_entries_admin_notes_check` (migration `_002`) : interdit '' (vide)
	// pour éviter notes vides indistinguables de NULL. Defense-in-depth si un futur
	// caller bypass `+page.server.ts` (script ops, cron, autre route) le payload
	// reste valide sans 23514 SQL leak.
	admin_notes: z
		.string()
		.max(2000)
		.optional()
		.or(z.literal(''))
		.transform((s) => {
			const trimmed = s?.trim() ?? '';
			return trimmed === '' ? null : trimmed;
		}),
});

export const FEEDBACK_CREATE_FIELDS = ['type', 'severity', 'page', 'description', 'context'] as const;
export const FEEDBACK_UPDATE_STATUS_FIELDS = ['id', 'status'] as const;
export const FEEDBACK_UPDATE_NOTES_FIELDS = ['id', 'admin_notes'] as const;

// -- Recherches sauvegardees --

export const FREQUENCES_ALERTE = ['quotidien', 'hebdomadaire'] as const;
export const TEMPERATURES_LEAD = ['chaud', 'tiede', 'froid'] as const;

export const RechercheCreateSchema = z.object({
	nom: z.string().min(1, 'Le nom est requis').max(200),
	sources: z.array(z.enum(SOURCES_LEAD)).optional(),
	cantons: z.array(z.enum(CANTONS_LEAD)).optional(),
	mots_cles: z.array(z.string().max(100)).optional(),
	secteurs: z.array(z.string().max(100)).optional(),
	score_minimum: z.coerce.number().int().min(0).max(13).optional(),
	temperatures: z.array(z.enum(TEMPERATURES_LEAD)).optional(),
	alerte_active: z.boolean().optional(),
	frequence_alerte: z.enum(FREQUENCES_ALERTE).optional(),
});

export const RechercheDeleteSchema = z.object({
	id: z.string().uuid(),
});

// -- Field lists (used by server actions for extractForm) --

export const CONTACT_FIELDS = [
	'nom', 'prenom', 'email_professionnel', 'telephone', 'role_fonction',
	'entreprise_id', 'canton', 'segment', 'source', 'notes_libres', 'adresse', 'tags',
] as const;

export const ENTREPRISE_FIELDS = [
	'raison_sociale', 'secteur_activite', 'canton', 'taille_estimee', 'site_web',
	'numero_ide', 'adresse_siege', 'segment_cible', 'source', 'notes_libres', 'tags',
] as const;

export const OPP_FIELDS = [
	'titre', 'contact_id', 'entreprise_id', 'montant_estime',
	'etape_pipeline', 'date_relance_prevue', 'notes_libres', 'responsable', 'signal_affaires_id',
] as const;

export const LEAD_FIELDS = [
	'source', 'source_id', 'source_url', 'raison_sociale', 'nom_contact',
	'adresse', 'npa', 'localite', 'canton', 'telephone', 'site_web', 'email',
	'secteur_detecte', 'description', 'montant', 'date_publication',
] as const;

// -- Generic validation helper --

// -- V3 mobile terrain : visites + suggestions de contact --

/** Résultat de visite : enum fermé dérivé de la source unique RESULTAT_VISITE. */
export const VisitResultatSchema = z.enum(RESULTAT_VISITE);

/** Note de compte-rendu : bornée (miroir du CHECK DB note_len_chk <= 2000). */
export const VisitNoteSchema = z.string().max(2000);

/**
 * Brouillon de contact croisé sur le terrain (mobile V3). Au moins un identifiant
 * exploitable requis (miroir du CHECK DB contact_suggestions_has_identifier).
 * Email volontairement non strict (capture terrain imparfaite tolérée) mais borné :
 * la validation forte se fait au desktop avant fusion dans `contacts`.
 */
export const ContactSuggestionCreateSchema = z
	.object({
		entreprise_id: z.string().min(1).max(64),
		visit_id: z.string().uuid().optional(),
		prenom: z.string().max(200).optional(),
		nom: z.string().max(200).optional(),
		role_fonction: z.string().max(200).optional(),
		telephone: z.string().max(50).optional(),
		email: z.string().max(320).optional(),
		notes: z.string().max(2000).optional(),
	})
	.refine(
		(d) => Boolean(d.prenom?.trim() || d.nom?.trim() || d.telephone?.trim() || d.email?.trim()),
		{ message: 'Au moins un identifiant requis (prénom, nom, téléphone ou email)' }
	);

/** Résolution desktop d'une suggestion : valider (créer/fusionner) ou rejeter. */
export const ResolveContactSuggestionSchema = z.object({
	action: z.enum(['valide', 'rejete']),
	merged_contact_id: z.string().max(64).optional(),
});

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
	const result = schema.safeParse(data);
	if (result.success) {
		return { success: true, data: result.data };
	}
	const messages = result.error.issues.map((i) => i.message).join(', ');
	return { success: false, error: messages };
}

// -- Découpe Films (chantier 2 portail) --
// Schemas des form actions des 3 entités (produits / chantiers / vitres).
// Unités : millimètres entiers (ADR-0003). Les preprocess acceptent à la fois la
// chaîne de formulaire (via extractForm) et la valeur native (tests Vitest).

/** Familles produit (catalogue de découpe). */
export const FAMILLES_PRODUIT = ['solaire', 'securite', 'discretion'] as const;

/** Booléen tolérant : checkbox `'on'`/`'true'`/`'1'`, valeur native, ou absence → false. */
const formBoolean = z.preprocess(
	(v) => (typeof v === 'boolean' ? v : coerceFormBoolean(v as FormDataEntryValue)),
	z.boolean()
);

// Borne haute défensive sur les dimensions (mm). 50 000 mm = 50 m : au-delà, aucune vitre
// réelle - empêche un DoS algorithmique (boucle de nesting / pose en lés sur des valeurs
// aberrantes) côté optimiser. Audit sécu 2026-06-05 (Low → fixé).
const MM_MAX = 50_000;
const QTE_MAX = 10_000;
const LAIZE_MAX = 20_000; // 20 m : couvre toutes les laizes de rouleau réelles
const LAIZES_MAX = 20; // nombre de laizes distinctes par produit

/** Entier mm positif (> 0) borné : dimension de vitre. */
const mmStrictPositive = (label: string) =>
	z.coerce.number({ error: `${label} doit être un nombre` })
		.int(`${label} doit être un entier (mm)`)
		.positive(`${label} doit être > 0`)
		.max(MM_MAX, `${label} dépasse la limite (${MM_MAX} mm)`);

/** Entier mm ≥ 0 borné : marge / recouvrement (0 autorisé). */
const mmNonNegative = (label: string) =>
	z.coerce.number({ error: `${label} doit être un nombre` })
		.int(`${label} doit être un entier (mm)`)
		.min(0, `${label} doit être ≥ 0`)
		.max(MM_MAX, `${label} dépasse la limite (${MM_MAX} mm)`);

/** Quantité entière bornée (≥ 1). */
const quantiteField = z.coerce.number({ error: 'La quantité doit être un nombre' })
	.int('La quantité doit être un entier')
	.min(1, 'La quantité doit être ≥ 1')
	.max(QTE_MAX, `La quantité dépasse la limite (${QTE_MAX})`);

/** Laizes : CSV `'1520, 1830'` OU tableau → number[] (chaque laize entière, bornée ; 1..20 laizes). */
const laizesField = z.preprocess(
	(v) => {
		if (Array.isArray(v)) return v.map((x) => Number(x));
		if (typeof v === 'string') {
			return v.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean).map(Number);
		}
		return v;
	},
	z.array(
		z.number()
			.int('Chaque laize doit être un entier (mm)')
			.positive('Chaque laize doit être > 0')
			.max(LAIZE_MAX, `Une laize dépasse la limite (${LAIZE_MAX} mm)`)
	)
		.min(1, 'Au moins une laize (mm) est requise')
		.max(LAIZES_MAX, `Maximum ${LAIZES_MAX} laizes par produit`)
);

// Produits
export const DecoupeProduitCreateSchema = z.object({
	reference: z.string().min(1, 'La référence est requise').max(100),
	nom: z.string().min(1, 'Le nom est requis').max(200),
	famille: z.enum(FAMILLES_PRODUIT, { error: 'Famille invalide' }),
	fabricant: optionalString,
	fournisseur: optionalString,
	laizes_mm: laizesField,
	orientation_imposee: formBoolean,
	jointage_autorise: formBoolean,
	nestable: formBoolean,
	marge_pose_mm: mmNonNegative('La marge de pose'),
	recouvrement_mm: mmNonNegative('Le recouvrement'),
	notes: optionalText,
});
export const DecoupeProduitUpdateSchema = DecoupeProduitCreateSchema.extend({ id: requiredUUID });
/** Archive (soft-delete) / restauration : un produit référencé par une vitre ne peut être supprimé (FK RESTRICT). */
export const DecoupeProduitArchiveSchema = z.object({ id: requiredUUID });

// Chantiers (statut initial forcé 'en_saisie' par le builder, hors formulaire)
export const DecoupeChantierCreateSchema = z.object({
	nom: z.string().min(1, 'Le nom du chantier est requis').max(200),
	client: optionalString,
});
export const DecoupeChantierUpdateSchema = DecoupeChantierCreateSchema.extend({ id: requiredUUID });
export const DecoupeChantierDeleteSchema = z.object({ id: requiredUUID });

// Vitres
export const DecoupeVitreCreateSchema = z.object({
	chantier_id: requiredUUID,
	produit_id: requiredUUID,
	largeur_mm: mmStrictPositive('La largeur'),
	hauteur_mm: mmStrictPositive('La hauteur'),
	quantite: quantiteField,
	type_vitrage: optionalString,
	sur_mesure_fournisseur: formBoolean,
});
/** Update vitre : on ne déplace pas une vitre de chantier (chantier_id absent). */
export const DecoupeVitreUpdateSchema = z.object({
	id: requiredUUID,
	produit_id: requiredUUID,
	largeur_mm: mmStrictPositive('La largeur'),
	hauteur_mm: mmStrictPositive('La hauteur'),
	quantite: quantiteField,
	type_vitrage: optionalString,
	sur_mesure_fournisseur: formBoolean,
});
export const DecoupeVitreDeleteSchema = z.object({ id: requiredUUID });

// Field lists (extractForm, form actions étape 3)
export const DECOUPE_PRODUIT_FIELDS = [
	'reference', 'nom', 'famille', 'fabricant', 'fournisseur', 'laizes_mm',
	'orientation_imposee', 'jointage_autorise', 'nestable', 'marge_pose_mm', 'recouvrement_mm', 'notes',
] as const;
export const DECOUPE_CHANTIER_FIELDS = ['nom', 'client'] as const;
export const DECOUPE_VITRE_FIELDS = [
	'chantier_id', 'produit_id', 'largeur_mm', 'hauteur_mm', 'quantite', 'type_vitrage', 'sur_mesure_fournisseur',
] as const;

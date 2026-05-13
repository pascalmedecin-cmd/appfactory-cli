import { z } from 'zod';

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

export const STATUTS_TRAITEMENT = [
	'nouveau', 'en_analyse', 'interesse', 'ecarte', 'converti',
] as const;

export const TYPES_SIGNAL = [
	'appel_offres', 'permis_construire', 'creation_entreprise', 'demenagement',
	'expansion', 'fusion_acquisition', 'autre',
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

export const SignalCreateSchema = z.object({
	type_signal: z.enum(TYPES_SIGNAL).optional().or(z.literal('')),
	description_projet: optionalText,
	maitre_ouvrage: optionalString,
	architecte_bureau: optionalString,
	canton: z.enum(CANTONS).optional().or(z.literal('')),
	commune: optionalString,
	source_officielle: optionalString,
	date_publication: z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD requis').optional().or(z.literal('')),
	notes_libres: optionalText,
	responsable_filmpro: optionalString,
});

export const SignalUpdateSchema = SignalCreateSchema.extend({
	id: requiredUUID,
	statut_traitement: z.enum(STATUTS_TRAITEMENT).optional().or(z.literal('')),
});

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

export const SignalCreateOpportuniteSchema = z.object({
	signal_id: requiredUUID,
	titre: z.string().min(1, 'Le titre est requis').max(300),
	entreprise_id: optionalUUID,
});

// -- Prospect Leads --

export const SOURCES_LEAD = [
	'zefix', 'simap', 'search_ch', 'regbl', 'lead_express', 'google_places',
] as const;

export const STATUTS_LEAD = [
	'nouveau', 'interesse', 'ecarte', 'transfere',
] as const;

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
	statut: z.enum(STATUTS_LEAD),
});

export const LeadBatchStatutSchema = z.object({
	ids: z.array(z.string().uuid()).min(1, 'Selectionnez au moins un lead'),
	statut: z.enum(STATUTS_LEAD),
});

export const LeadTransfertSchema = z.object({
	id: z.string().uuid(),
});

// -- Feedback entries (page /log) --
// Spec : notes/page-log-2026-05-13/spec.md § 4 + § 8.

export const FEEDBACK_TYPES_ENUM = ['bug', 'suggestion', 'question'] as const;
export const FEEDBACK_SEVERITIES_ENUM = ['bloquant', 'genant', 'mineur'] as const;
export const FEEDBACK_STATUSES_ENUM = ['nouveau', 'a_actionner', 'traite', 'logge'] as const;

// Contexte capturé côté client (envoyé en string JSON dans le form).
const FeedbackContextSchema = z.object({
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
	admin_notes: z.string().max(2000).optional().or(z.literal('')),
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

export const SIGNAL_FIELDS = [
	'type_signal', 'description_projet', 'maitre_ouvrage', 'architecte_bureau',
	'canton', 'commune', 'source_officielle', 'date_publication', 'notes_libres', 'responsable_filmpro',
] as const;

export const LEAD_FIELDS = [
	'source', 'source_id', 'source_url', 'raison_sociale', 'nom_contact',
	'adresse', 'npa', 'localite', 'canton', 'telephone', 'site_web', 'email',
	'secteur_detecte', 'description', 'montant', 'date_publication',
] as const;

// -- Generic validation helper --

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
	const result = schema.safeParse(data);
	if (result.success) {
		return { success: true, data: result.data };
	}
	const messages = result.error.issues.map((i) => i.message).join(', ');
	return { success: false, error: messages };
}

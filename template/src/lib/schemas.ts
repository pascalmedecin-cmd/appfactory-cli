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

export const STATUTS_TRAITEMENT = [
	'nouveau', 'en_analyse', 'interesse', 'ecarte', 'converti',
] as const;

export const TYPES_SIGNAL = [
	'appel_offres', 'permis_construire', 'creation_entreprise', 'demenagement',
	'expansion', 'fusion_acquisition', 'autre',
] as const;

// -- Form extraction helper --

export function extractForm(form: FormData, fields: string[]) {
	const data: Record<string, string> = {};
	for (const field of fields) {
		data[field] = (form.get(field) as string) ?? '';
	}
	return data;
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
	date_relance_prevue: z.string().max(20).optional().or(z.literal('')),
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

// -- Signaux d'affaires --

export const SignalCreateSchema = z.object({
	type_signal: z.enum(TYPES_SIGNAL).optional().or(z.literal('')),
	description_projet: optionalText,
	maitre_ouvrage: optionalString,
	architecte_bureau: optionalString,
	canton: z.enum(CANTONS).optional().or(z.literal('')),
	commune: optionalString,
	source_officielle: optionalString,
	date_publication: z.string().max(20).optional().or(z.literal('')),
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
	ids: z.string().min(1, 'Aucun signal sélectionné'),
});

export const SignalCreateOpportuniteSchema = z.object({
	signal_id: requiredUUID,
	titre: z.string().min(1, 'Le titre est requis').max(300),
	entreprise_id: optionalUUID,
});

// -- Prospect Leads --

export const SOURCES_LEAD = [
	'zefix', 'simap', 'sitg', 'search_ch', 'fosc', 'manuel',
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
	date_publication: z.string().max(30).optional().or(z.literal('')),
});

export const LeadUpdateSchema = LeadCreateSchema.extend({
	id: z.string().uuid(),
});

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

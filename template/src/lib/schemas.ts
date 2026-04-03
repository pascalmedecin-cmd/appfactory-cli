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
	'permis_construire', 'appel_offres', 'creation_entreprise', 'demenagement',
	'fusion_acquisition', 'nouveau_projet', 'autre',
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

export const SignalCreateOpportuniteSchema = z.object({
	signal_id: requiredUUID,
	titre: z.string().min(1, 'Le titre est requis').max(300),
	entreprise_id: optionalUUID,
});

// -- Generic validation helper --

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
	const result = schema.safeParse(data);
	if (result.success) {
		return { success: true, data: result.data };
	}
	const messages = result.error.issues.map((i) => i.message).join(', ');
	return { success: false, error: messages };
}

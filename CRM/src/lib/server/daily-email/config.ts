/**
 * Configuration du module Daily Email CRM (relances du jour).
 *
 * Module 100% separe du weekly veille (email-recap.ts / email-brief.ts) : on REUTILISE
 * uniquement le helper pur `parseRecipients` (lecture seule), aucune edition de ces
 * fichiers. Le gate `EMAIL_DAILY_ENABLED` est INDEPENDANT de EMAIL_RECAP_ENABLED /
 * EMAIL_BRIEF_ENABLED (pas de fallback en cascade) : activer la veille hebdo n'active
 * jamais le daily, et inversement. Defaut OFF (consigne Pascal 25/06 : livre pret mais
 * desactive, feu vert explicite requis pour activer).
 */
import { parseRecipients } from '../intelligence/deps';

export interface EmailDailyConfig {
	/** Gate d'activation. Defaut OFF : aucun envoi tant que EMAIL_DAILY_ENABLED !== 'true'. */
	enabled: boolean;
	/** Cle Resend (meme cle partagee que le weekly). Absente -> skip propre. */
	apiKey?: string;
	/** Destinataires (parses/dedupes/cappes a 20 par parseRecipients). */
	to: string[];
	/** Expediteur (domaine filmpro.ch verifie Resend, meme adresse que le weekly). */
	from: string;
}

/** Sous-ensemble strict des ENV vars du daily (`string | undefined`, compat process.env). */
export type DailyEmailEnv = Partial<
	Record<'EMAIL_DAILY_ENABLED' | 'RESEND_API_KEY' | 'EMAIL_DAILY_TO' | 'EMAIL_DAILY_FROM', string>
>;

const DEFAULT_DAILY_TO = 'pascal@filmpro.ch,antoine@filmpro.ch';
const DEFAULT_DAILY_FROM = 'FilmPro CRM <noreply@filmpro.ch>';

/**
 * Construit la config daily depuis l'env. Gate case-insensitive `=== 'true'` (meme
 * convention que les emails veille), defaut OFF. NE chaine PAS sur EMAIL_RECAP/BRIEF :
 * sa propre variable, sinon activer le weekly activerait par erreur le daily.
 */
export function buildDailyEmailConfig(env: DailyEmailEnv): EmailDailyConfig {
	return {
		enabled: (env.EMAIL_DAILY_ENABLED ?? '').toLowerCase() === 'true',
		apiKey: env.RESEND_API_KEY,
		to: parseRecipients(env.EMAIL_DAILY_TO, DEFAULT_DAILY_TO),
		from: env.EMAIL_DAILY_FROM || DEFAULT_DAILY_FROM
	};
}

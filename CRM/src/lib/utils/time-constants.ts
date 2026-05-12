/**
 * Constantes de durée nommées (audit 360 V3b L-18).
 *
 * Centralise les conversions de temps disséminées dans le code sous forme de
 * produits opaques (`7 * 24 * 60 * 60 * 1000`, `86400000`, `1000 * 60 * 60 * 24`…).
 * Toutes les valeurs sont des littéraux numériques pré-calculés : zéro coût runtime,
 * importables côté client comme serveur.
 *
 * Convention : suffixe `_MS` = millisecondes, `_S` = secondes.
 */

// --- Unités de base, en millisecondes ---
export const SECOND_MS = 1_000;
export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;
export const WEEK_MS = 604_800_000;

// --- Unités de base, en secondes ---
export const MINUTE_S = 60;
export const HOUR_S = 3_600;
export const DAY_S = 86_400;
export const WEEK_S = 604_800;

// --- Durées métier ---
/** Durée de vie d'une session CRM : 7 jours (cookie `login_at` côté serveur). */
export const SESSION_MAX_AGE_MS = 7 * DAY_MS;
/** Idem en secondes (pour les `maxAge` de cookie qui s'expriment en secondes). */
export const SESSION_MAX_AGE_S = 7 * DAY_S;
/** Fenêtre du rate-limiter in-memory (`/api/prospection/*`, `/api/photos*`, `/api/visits*`, `POST /login`). */
export const RATE_LIMIT_WINDOW_MS = MINUTE_MS;

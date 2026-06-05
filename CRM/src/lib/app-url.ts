import { env } from '$env/dynamic/public';

/**
 * URL publique de l'app FilmPro (origine). Externalisee via PUBLIC_APP_URL, posee dans les env
 * Vercel (preview + prod) depuis la bascule d'adresse portail (2026-06-04 : -> filmpro-portail.vercel.app).
 * Fallback aligne sur le nouveau host : jamais atteint en prod (variable posee), et l'ancien host
 * 308-redirige de toute facon (voir `legacy-redirects.ts`).
 */
export const APP_URL = env.PUBLIC_APP_URL || 'https://filmpro-portail.vercel.app';

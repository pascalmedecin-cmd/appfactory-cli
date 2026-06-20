# ADR-0001 — Livraison PWA sur le webapp SvelteKit existant (pas d'app native)

## Status
Accepted (2026-05-31)

## Context
La V3 mobile terrain doit tourner sur l'iPhone du commercial FilmPro. Le CRM est déjà un webapp SvelteKit responsive déployé sur Vercel. Le Sceptique du council a challengé la prémisse « faut-il une app ? » : l'échec V2 venait du contenu porté, pas du contenant. Construire une app native (Swift / React Native) = nouveau chantier, nouvelle CI, nouvelle distribution App Store.

## Decision
Livrer la V3 comme une expérience mobile **dans le webapp SvelteKit existant** : un route group dédié (ex. `(mobile)` ou `/terrain`), servi selon viewport + feature flag, installable en PWA (icône écran d'accueil iPhone, manifest + service worker minimal pour l'icône/splash, PAS pour l'offline). Aucun nouveau dépôt, aucune app native.

## Consequences
- (+) Réutilise toute la stack (auth OTP, Supabase, endpoints `/api/visits` + `/api/photos`, Vercel preview).
- (+) Un seul codebase, une seule CI, un seul déploiement. Rollback trivial via flag.
- (+) Pas de soumission App Store, mise à jour instantanée.
- (-) Pas d'accès aux API natives avancées (mais `tel:`/`maps:`/`mailto:` + `<input capture>` photo couvrent le besoin terrain).
- (-) PWA iOS a des limites (pas de vraies push, service worker bridé) — non bloquant car push hors-scope V3.

## References
- Council (voix Sceptique + Pragmatique), session 2026-05-31.
- `memory/feedback_mobile_overscope_anti_pattern.md`
- Stack projet : `CRM/CLAUDE.md` § STACK (SvelteKit + Supabase + Vercel).

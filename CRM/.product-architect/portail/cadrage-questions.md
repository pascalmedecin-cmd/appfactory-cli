# Cadrage - Portail FilmPro multi-outils (Phase 1)

**Livrable** : transformer l'app CRM FilmPro en portail d'entree multi-outils.
**Date cadrage** : 2026-06-01
**Chantier** : 1/N (portail + renommage + reorg CRM). Devis = chantier 2.

---

## Contexte deja etabli (non redemande)

| Element | Valeur | Source |
|---|---|---|
| Utilisateur cible | 3 fondateurs FilmPro, profil non-tech / exec | CLAUDE.md CRM + memoire `feedback_rls_multitenant_durcissement_si_4_users` |
| Metier | Traitements pour vitrage (films + vernis), Suisse romande. **Pas de video.** | `project_filmpro_metier.md` |
| Stack | SvelteKit 2 + Tailwind v4 + Supabase + Vercel + Vitest/Playwright | `package.json`, cartographie 2026-06-01 |
| Auth | OTP email `@filmpro.ch`, session 7j httpOnly | `hooks.server.ts` |
| RLS | Mono-tenant plat (`FOR ALL TO authenticated USING (true)`), 3 fondateurs symetriques | CLAUDE.md L-03 |
| Design system | Tokens Tailwind v4 dans `app.css` (bleu `#2F5A9E`, DM Sans), golden existant | `app.css`, `GOLDEN_STANDARD.html` |
| Feature flags | JWT custom claims Supabase (pattern ADR-005), `readFeatureFlags()` | `src/lib/types/feature-flags.ts` |

---

## Questions structurantes (reponses Pascal 2026-06-01)

### Q1 - Architecture technique du portail
**Reponse : Une app, outils en modules.**
Un seul codebase SvelteKit + une seule base de donnees. Le portail et chaque outil (CRM, Devis) sont des sections de la meme app, partageant nativement entreprises/contacts, l'auth et le deploiement.

### Q2 - Perimetre du premier chantier
**Reponse : Portail + renommage + reorg CRM.**
Page d'accueil cards premium, renommage CRM -> FilmPro, le CRM devient "Outil 1". Les fondations data partagees (pensees pour le devis) sont POSEES maintenant. L'outil Devis lui-meme est le chantier 2.

### Q3 - Niveau d'integration entre outils
**Reponse : Referentiel partage + actions croisees.**
Entreprises et contacts uniques partages par tous les outils. Plus des passerelles concretes : depuis une fiche entreprise du CRM -> "Creer un devis" ; un devis accepte fait avancer l'opportunite dans le pipeline.

### Q4 - Base de calcul d'un devis FilmPro
**Reponse : Catalogue produits + surfaces.**
Catalogue de traitements (films, vernis) avec prix au m2. Un devis = lignes (surface m2 x produit x prix unitaire) + total + PDF + statuts. A approfondir au chantier 2 ; les fondations sont dimensionnees des maintenant pour l'accueillir.

### Q5 - Contenu de la page d'accueil (chantier 1)
**Reponse : CRM + Devis seulement.**
Deux cards : CRM (active, cliquable) et Devis ("Bientot disponible", grisee). Le Terrain mobile V3 n'apparait pas encore (focus sur les 2 chantiers annonces).

### Q6 - Perimetre du renommage CRM -> FilmPro
**Reponse : Interface + nouvelle adresse.**
Renommage complet de l'interface (titres d'onglet, navbar, logo, metadonnees) ET de l'adresse web cible vers `filmpro.vercel.app` (ou domaine perso). Implique une reconfiguration Vercel/DNS, tracee comme tache de deploiement supervisee. Le repo Git garde son nom (`appfactory-cli`).

### Q7 - Delai cible
**Reponse : 1 a 2 sessions (~cette semaine).**
Scope borne (page d'accueil, renommage, rangement CRM en module, fondations data). QA complete incluse.

---

## Ambiguites residuelles : AUCUNE bloquante

Tous les arbitrages structurants sont tranches. Points laisses en auto-decision (signales, non bloquants) :
- Correction de la description metier erronee dans `config.ts` (actuellement "production audiovisuelle et construction" -> "traitements pour vitrage") : a faire au renommage.
- Mobile V3 (outil terrain, en cours Phase 3) sera ajoute au portail comme 3e card *apres* sa livraison, hors scope de ce chantier.

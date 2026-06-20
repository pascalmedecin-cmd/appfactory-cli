# Plan de livraison par session - Portail FilmPro (chantier 1)

**Decoupage** : 3 sessions = 3 livrables consolides, chacun fermable proprement (no-debt).
**Regle** : une session ne se cloture que si ses criteres d'acceptation (AC) sont verts.
**Stack** : SvelteKit 2 + Tailwind v4 + Supabase + Vercel. Effort xhigh.

| # | Session | Autonomie | Livrable consolide | Duree | Gate |
|---|---|---|---|---|---|
| 1 | Coding (reorg + renommage + fondation) | **Autonome** (smoke home supervise) | App reorganisee, renommee, home portail a `/`, en preview Vercel verte | ~1 session | Phase 3->4 (tests verts) |
| 2 | QA 360 | **Autonome jusqu'au vert** | Tous les AC bloquants verts, audit secu 0 H/C/M | ~0,5-1 session | Phase 4->5 (QA verte) |
| 3 | Livraison + bascule adresse | **Semi-guide (supervise, type Vercel)** | Portail en prod sur filmpro-portail.vercel.app, 3 fondateurs migres | ~0,5 session | Phase 5 (validation Pascal) |

---

## SESSION 1 - Coding [AUTONOME jusqu'au smoke home (validation visuelle avec Pascal)]

**Objectif mesurable** : ouvrir la preview Vercel -> home portail FilmPro (2 cards) a `/`, CRM intact sous `/crm`, app renommee, zero regression.

**Livrables** :
1. **Reorg routes** : `(app)/` -> dossier reel `crm/` ; nouveau group `(portail)/` (header + home a `/`). Redirects 308 des anciennes URLs internes -> `/crm/*`.
2. **Reprefixage** centralise (`CRM_BASE='/crm'`) : config.navigation + ~16 href en dur + goto/redirect login/auth + isActive + pageTitle. (AC-024)
3. **Home portail** : `PortailHome` + `ToolCard` (active CRM / soon Devis) + `PortailHeader` (logo FilmPro cliquable = retour), d'apres le golden valide. (AC-001/002/003/005/018)
4. **Lien retour portail** : logo Sidebar CRM cliquable vers `/`. (AC-005)
5. **Renommage complet** : config.app.name + description metier (vitrage), app.html title, manifest name, 7 `<svelte:head>` titles. (AC-006/007/020)
6. **URL externalisee** : env var `PUBLIC_APP_URL`, suppression des 4 hardcodes. (AC-022)
7. **Post-login -> `/crm`** : redirects auth/callback + hooks synchronises. (AC-015)
8. **Fondation referentiel** : `src/lib/server/referentiel/{entreprises,contacts}.ts` (appelle la dedup existante), branche sur les 2 pages critiques (entreprises, contacts) ; call sites API restants traces en dette. (AC-014)

**Criteres de cloture** : svelte-check 0 erreur (AC-013), suite Vitest verte hors baseline rouge (AC-012), build preview Vercel vert, smoke 11 pages CRM OK. Verifier au demarrage : existence d'un service worker (cf. revue I).

**Hors-scope session** : QA exhaustive (session 2), bascule URL (session 3).

---

## SESSION 2 - QA 360 [AUTONOME jusqu'au vert]

**Objectif mesurable** : tous les AC bloquants verts, 0 finding Critical, audit secu 0 H/C/M.

**Livrables** :
1. **audit-uiux** home (Mode A) + **axe-core** 0 violation serieuse (home + 1 page CRM temoin). (AC-009/010)
2. **Playwright e2e** : entree/sortie portail, post-login -> /crm, nav CRM complete, **redirects 308 internes** testes. (AC-002/004/015/019)
3. **Snapshot visuel** home (baseline approuvee). (AC-021)
4. **Lighthouse** home : LCP < 2.5s, CLS < 0.1. (AC-011)
5. **code-review:security-auditor** sur fichiers touches (routing, layout, config, home) : 0 H/C/M, artefact date `audit_secu_2026-06-XX_portail.md`. (AC-016)
6. **code-review:bug-hunter** + **contracts-reviewer** (la reorg ne touche pas data/RLS, revue legere centree routing + couche referentiel).
7. **Verification-Before-Completion** : checklist finale.

**Criteres de cloture** : 100 % AC `blocking:true` des phases 3-4 verts. Si un finding sort -> fixe en session, ou retire du scope avec validation Pascal (no-debt).

**Note** : tests mobile reel = DevTools manuel Pascal (regle projet), pas Playwright viewport seul.

---

## SESSION 3 - Livraison + bascule adresse [SEMI-GUIDE / SUPERVISE]

> ### État reprise 2026-06-03 (session 3 entamée, arrêtée avant 1re mutation prod)
>
> **Cible d'adresse CHANGÉE** : `filmpro.vercel.app` est squatté par un tiers (page React « Filmpro » hors compte `pascalmedecin-cmds-projects`, HTTP 200, framework React ≠ notre SvelteKit). Impossible à réclamer (sous-domaines `*.vercel.app` mondiaux+uniques). **Nouvelle cible validée Pascal = `filmpro-portail.vercel.app`** (testé libre : `DEPLOYMENT_NOT_FOUND`). Autres libres si besoin : `portail-filmpro`, `filmpro-app`, `filmpro-suite`, `filmpro-vitrage`.
>
> **Faits établis cette session (ne pas re-investiguer)** :
> - Déploiements prod = **CLI `vercel deploy --prod`** uniquement. Pas d'auto-deploy GitHub (le déploiement prod actuel `dpl_3Ugib...` du 2026-06-01 n'a aucune meta git, et contient du code jamais mergé sur `main`). → pousser `main` ne déploie rien automatiquement (sûr).
> - **Lien Vercel reconfiguré à la racine repo `FilmPro/`** (projet `filmpro-crm`, Root Directory = `CRM`). Le lien initial avait été créé par erreur dans `CRM/` (aurait cherché `CRM/CRM`). `.vercel/project.json` présent ; `.vercel/.env.production.local` supprimé (secrets prod en clair) → régénérer par `vercel pull --environment=production` au besoin.
> - **`PUBLIC_APP_URL` non définie en prod** → le code retombe sur le repli en dur `https://filmpro-crm.vercel.app` (réf : `src/lib/app-url.ts` + `src/lib/server/intelligence/{email-recap,cross-check,url-verify}.ts`). À définir = nouvelle adresse, sinon les e-mails (OTP, récap) renvoient vers l'ancienne URL.
> - **Preview de contrôle déployé vert** : `filmpro-h7cnw8f92-pascalmedecin-cmds-projects.vercel.app` (build OK depuis le bon Root Directory). Contenu non vérifiable par curl = protection SSO Vercel sur previews (cookie `_vercel_sso_nonce`, normal ; la prod publique répond, elle, 303 = redirect login app). Code déployé = `1d298e1` (fix QA repréfixage `CRM_BASE` inclus), déjà QA-validé Session 2 (34/34 e2e, axe, sécu 0 H/C/M).
>
> **Prochain pas exact à la reprise** (pas 1+2 FAITS 2026-06-03, reprendre au pas 3) :
> 1. ~~`vercel deploy --prod`~~ FAIT : `dpl_2WdtYECmB2waQm8G1iPfKxj4Qci4`, URL `filmpro-hu8jjym24-pascalmedecin-cmds-projects.vercel.app`, READY/production, aliasé `filmpro-crm.vercel.app`, code `1d298e1`.
> 2. ~~Smoke prod publique~~ FAIT vert : `/`→303 login, `/login`→200, `/crm` + `/crm/prospection` + `/crm/entreprises`→303 login (0 erreur 500/404).
> 3. **REPRENDRE ICI** : `vercel alias set filmpro-hu8jjym24-pascalmedecin-cmds-projects.vercel.app filmpro-portail.vercel.app` → nouvel alias sert l'app (200).
> 4. Redirection `filmpro-crm.vercel.app` → `filmpro-portail.vercel.app`.
> 5. `vercel env add PUBLIC_APP_URL production` = `https://filmpro-portail.vercel.app` + redeploy.
> 6. **[Pascal, dashboard Supabase]** template e-mail « FilmPro » + nouvelle URL **et** ajout de la nouvelle URL aux Redirect URLs autorisées (sinon liens OTP cassés).
> 7. metrics-baseline.json + clôture (gate 5).
>
> **Garde-fou inchangé** : ne retirer l'ancien alias QU'APRÈS confirmation d'accès des 3 fondateurs ; après tout `vercel rollback`, vérifier `vercel inspect` (trap alias verrouillé).

**Objectif mesurable** : portail FilmPro en prod sur `filmpro-portail.vercel.app`, les 3 fondateurs y accedent. (Cible initiale `filmpro.vercel.app` abandonnée : squattée, cf. État reprise ci-dessus.)

C'est la session "type update Vercel" : chaque etape externe est faite AVEC toi, jamais en autonomie (impact acces utilisateurs reels).

**Livrables (etapes supervisees)** :
1. **Promotion prod** sur l'alias actuel `filmpro-crm.vercel.app` (zero regression confirmee).
2. **Ajout alias** `filmpro-portail.vercel.app` au projet Vercel + **redirection** de l'ancien vers le nouveau. (AC-017)
3. **Template OTP Supabase** (dashboard, hors repo) : nom FilmPro + nouvelle URL. (AC-023)
4. **Communication** aux 3 fondateurs : nouveau lien + **re-login requis** (cookies non transferes cross-domain, cf. revue F). (AC-023)
5. **metrics-baseline.json** figee (LCP/CLS home, bundle delta, tests verts, date).
6. **Cloture** : CLAUDE.md CRM (Livre), entry cockpit avec outcome, gates-signed 5->livre, snapshot DB pre-livraison.

**Garde-fous** : ne retirer l'ancien alias QU'APRES confirmation d'acces des 3. Apres tout `vercel rollback`, verifier `vercel inspect` (trap alias verrouille).

**Criteres de cloture (Definition of Done)** : les 2 adresses repondent, ancienne -> nouvelle ; 3 fondateurs connectes sur la nouvelle ; 0 erreur runtime nouvelle ; baseline figee ; hand-off complet.

---

## Apres ce chantier (hors perimetre, pour memoire)

- **Chantier 2 - Outil Découpe Films** (PIVOT 2026-06-05, ex-« Devis ») : optimiseur de découpes de film (réduction des chutes). ⚠️ L'esquisse devis (catalogue produits, lignes, PDF, statuts, passerelles ; data-model.sql §C, data-model-fondations.md §3/§4, ADR-0003) est **caduque** pour ce chantier. Périmètre réel à cadrer via `/product` avant tout code.
- **Chantier 3 - Integrer Mobile V3** comme 3e card du portail (apres sa livraison Phase 3 en cours).
- **Dette nommee** : ~~centraliser les call sites API restants des ecritures referentiel (visits, contact-suggestions, search)~~ **CLOSE 2026-06-05** : audit code reel = visits/search/contact-suggestions n'ecrivent rien dans le referentiel ; seul resolve inserait un `contacts` inline (route depuis vers `buildContactInsertFromSuggestion`) + google-places reutilise `lookupEntrepriseByName`. Restent hors module deux ecritures specialisees assumees (enrichissement Zefix, cron nettoyage-crm), non get-or-create. Durcissement RLS si 4e user non-fondateur = toujours ouvert.

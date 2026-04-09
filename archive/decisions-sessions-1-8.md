# Décisions sessions 1-8 (2026-04-06 à 2026-04-07)

Archivé le 2026-04-09 par /optimize (règle des 3 sessions).
Les décisions actives sont condensées par thème dans CLAUDE.md.

---

**Decisions session 2026-04-07 (8e session) :**
- 7 chantiers UX : signaux (lisibilite, scoring, filtrage SIMAP, selection batch), contacts (autocomplete entreprise, dedup fuzzy, adresse, logo), entreprises (cards, Zefix, Maps), cantons (dropdown)
- Composant CantonSelect.svelte reutilisable (26 cantons, romands en premier, optgroup)
- Autocomplete entreprise : normalisation fuzzy (strip SA/Sarl/GmbH, lowercase, alphanum) pour dedup a la creation
- Page Entreprises derivee des contacts (auto-creation) + creation manuelle possible
- Logo Clearbit via `logo.clearbit.com/{domain}` (fallback initiales si pas de site_web)
- Enrichissement Zefix : action serveur `/enrichir` (IDE, adresse, canton, description)
- Filtrage SIMAP a l'import : ne garde que les projets matchant les 19 mots-cles `secteursCibles`
- Suppression batch signaux : action `deleteBatch` avec validation Zod (ids comma-separated)
- Deploy prod valide (commit 344c6a9)

**Decisions session 2026-04-07 (7e session) :**
- Cron `/api/cron/signaux` : veille quotidienne 6h, Zefix (creations entreprises) + SIMAP (appels d'offres), 6 cantons romands
- Migration BDD : colonnes source_id (dedup) + score_pertinence (scoring auto) sur signaux_affaires
- Service role client Supabase (createSupabaseServiceClient) pour crons sans session utilisateur
- Scoring automatique calculerScore() branche sur les signaux importes
- Dedup sur source_officielle + source_id (unique index partiel)
- Test reel : 59 signaux SIMAP importes, score moyen 7/13, dedup validee (2e run = 0)
- Zefix 401 attendu (compte actif 08.04)
- Audit securite : erreurs internes masquees en reponse, cron alertes migre vers service role
- SUPABASE_SERVICE_ROLE_KEY : local + Vercel prod (preview bloque par absence repo Git)
- Deploy prod valide (commits 4e0f51c + 248e37c)

**Decisions session 2026-04-07 (6e session) :**
- Refonte page Signaux : vue tableau → vue cards visuelles (icone par type, badge statut, date relative)
- Modal creation allegee : 10 champs → 4 (type, description, canton, maitre d'ouvrage), champs complets en edition
- Bouton supprimer avec confirmation (action delete + SignalDeleteSchema)
- Bandeau explicatif permanent (veille automatique, ajout manuel)
- Compteurs par statut cliquables (filtrage rapide)
- Labels config.signaux.types[].label branches (corrige « Appel offres » → « Appel d'offres »)
- Bandeau alertes signaux neufs sur dashboard (avant bandeau prospection)
- Credentials Zefix configures : local .env + Vercel prod + Vercel preview, compte actif 08.04
- Deploy prod valide dans le navigateur (commit 6711b6b)

**Decisions session 2026-04-07 (5e session) :**
- Audit dual refactoring-ui + ux-guide sur CRM FilmPro (6 pages, 7 composants)
- Corrections P0 : accents FR dans 7 fichiers (config, pipeline, signaux, prospection, LeadSlideOut, ImportModal, dashboard)
- Corrections P0 : empty states avec CTA sur Contacts et Entreprises (composant EmptyState existant)
- Corrections P1 : dashboard onboarding « Pour demarrer » (3 etapes) + suggestions activite quand vide
- Corrections P1 : icone Pipeline filter_list → conversion_path (sidebar + stats cards)
- Corrections P1 : confirmation avant archivage contact, suppression entreprise, marquer perdu
- Corrections P1 : prospection/signaux vides = 2 blocs explicatifs (fonctionnalite + alertes automatiques)
- Corrections P2 : pagination DataTable icones Material, sidebar deconnexion contraste white/40 → white/60
- Corrections P2 : header affiche nom page courante, logo sidebar utilise logoWhite sur fond dark
- Score Refactoring UI : 6 → ~8/10
- Deploy prod valide dans le navigateur (commit 8819892)

**Decisions session 2026-04-07 (4e session) :**
- Audit dual ux-guide + refactoring-ui sur les 2 wizards (6 pages HTML total)
- 37 corrections appliquees (commit 513d3c8) : WCAG contraste --text-light, required *, polling timeout 30s, stepper cliquable, radio auth provider, drag feedback, confirmation recap double-clic, responsive entreprise, auto-save retour, Enter submit, logo file picker, boutons + labellises, empty state fallback, CTA labels standardises
- Score Refactoring UI : 6.5 → ~8/10
- Aucune regression constatee — valide par Pascal dans le navigateur

**Decisions session 2026-04-07 (3e session) :**
- Launcher CLI (`start.sh`) : menu dynamique → menu fixe 5 options, ordre choisi par Pascal
- Option 5 « Global » : travail sur regles/skills/commands cross-projets (cd ~/.claude/)
- AppFactory v1 deplace dans ~/Claude/Projets/Archives/AppFactory_old — consultable mais exclu du menu

**Decisions session 2026-04-07 (2e session) :**
- 2 skills design installes en bibliotheque : refactoring-ui (audit visuel, scoring 0-10) + ux-guide (audit UX, review P0/P1/P2)
- Audit conflits complet : sections Anti-AI Defaults retirees de ux-guide, bans de fonts retires de frontend-design
- Coherence verifiee entre 4 skills design (refactoring-ui, ux-guide, frontend-design, theme-factory) : 0 conflit, 0 NEVER/forbidden
- Principe : aucun skill ne prescrit de font ou couleur specifique — branding projet (branding/*.yaml) est le seul arbitre

**Decisions session 2026-04-07 (1re session) :**
- Wizard entreprise cree (wizard/entreprise/) : 3 etapes navigateur (infos → synthese IA → branding)
- Header simplifie : texte blanc 24px sans cadre, AppFactory | Entreprise
- Serveur unifie : --mode entreprise, --enterprise JSON pour contexte
- Charte graphique exportee vers projet Enseignement (shared.css, tokens AppFactory, header noir)
- clone-website skill recupere depuis JCodesMore/ai-website-cloner-template, stocke dans skills-library (inactif)
- plugins-reference.md restructure : architecture 3 niveaux (globaux / bibliotheque / plugins)

**Decisions session 2026-04-06 (2e session) :**
- /start cree : point d'entree unique avec 3 chemins (modifier app / nouvelle app / nouvelle entreprise)
- registry.yaml : registre central entreprises/apps (FilmPro + CRM pre-rempli)
- Catalogue branding : 5 themes (_catalogue.yaml), preview HTML generee par script
- Wizard cadrage HTML : 5 etapes (pitch, entites, pages, regles, recap), serveur Python port 3334
- Architecture wizard : polling /api/state, injection Claude, auto-navigation entre etapes

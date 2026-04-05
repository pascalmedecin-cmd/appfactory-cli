# Inventaire composants EN PLACE (Jour 9 + Phase C)
> Archive /optimize — 2026-04-05
> Consulter si : besoin de lister les composants existants avant d'en creer de nouveaux

- **Design system** : CSS variables primary/accent, font DM Sans, Material Symbols icons
- **Layout** : sidebar 220px collapsible (56px) + header 48px, groupe route `(app)/`, responsive mobile (burger menu + overlay)
- **11 composants** : `src/lib/components/` — DataTable (selectable avec $bindable), SlideOut (anime slide-in), ModalForm (anime scale), FormField, Badge, EmptyState, Header, Sidebar, Toast + `prospection/ImportModal`, `prospection/LeadSlideOut`
- **Toast store** : `src/lib/stores/toast.ts` — store Svelte avec methodes success/error/warning/info, auto-dismiss 4-6s
- **Focus visible** : CSS global (app.css) — outline accent sur boutons/liens en navigation clavier
- **Validation** : `src/lib/schemas.ts` — 18+ schemas Zod + 5 FIELDS arrays centralises + helpers `validate()`, `extractForm()`
- **DB helpers** : `src/lib/server/db-helpers.ts` — `dbFail()`, `newId()`, `now()` (utilises par tous les server.ts)
- **Scoring** : `src/lib/scoring.ts` — calcul 0-13 points (canton, secteur, signal, recence, tel, montant)
- **Page Contacts** : CRUD complet (create/update/archive), DataTable tri/recherche, SlideOut detail, ModalForm 6 champs
- **Page Entreprises** : CRUD complet (create/update/delete), contacts rattaches dans SlideOut
- **Dashboard** : 4 stats cards, relances du jour, derniere activite, raccourcis, bandeau alertes prospection (nouveaux leads)
- **Page Pipeline** : Vue kanban 6 colonnes (Identification->Perdu), drag & drop HTML5 natif, total montant/colonne, CRUD opportunites (create/update/archive), SlideOut detail avec liens contact/entreprise, relances en retard en rouge
- **Page Signaux** : DataTable avec 3 filtres (type/canton/statut), SlideOut detail, CRUD signal, action "Creer opportunite" (conversion + redirect pipeline), action "Ecarter", 5 statuts (nouveau/en_analyse/interesse/ecarte/converti)
- **Page Prospection** : DataTable selectable, 4 filtres (source/canton/statut/score), SlideOut detail avec scoring detaille, creation manuelle, actions unitaires + batch (interesse/ecarter), transfert vers CRM (cree entreprise + contact), dedup source+source_id, recherches sauvegardees (save/load/delete), alertes avec compteur nouveaux leads
- **API Prospection** : 4 routes API dans `src/routes/api/prospection/` (lindas, simap, zefix, search-ch)
- **API Cron** : `src/routes/api/cron/alertes/` — execution recherches sauvegardees, comptage nouveaux leads
- **UI Import** : modal 3 sources (LINDAS, Zefix, SIMAP), bouton "Enrichir telephone" dans SlideOut
- **Page Aide** : documentation utilisateur integree, sommaire cliquable, recherche texte, 8 sections
- **Extraction template** : project.yaml + config.ts (genere par yaml-to-config.ts)
- **Scripts** : yaml-to-config.ts, generate-previews.ts, scaffold.ts
- **Template parametrise** : app.html placeholder, Sidebar logo dynamique, aide dynamique
- **Skills Claude Code** : /cadrage, /generate, /deploy dans .claude/commands/

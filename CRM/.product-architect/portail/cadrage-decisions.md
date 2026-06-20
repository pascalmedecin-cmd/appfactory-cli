# Decisions, modes d'echec et angles morts - Portail FilmPro

Agrege l'equivalent `/dig` (decision structurelle), `/premortem` (modes d'echec) et `/blindspot` (angles morts) pour ce chantier. Raisonnement effort xhigh.

---

## A. DIG - Decision structurelle : 1 app vs apps separees (tranchee Q1)

**Decision : 1 app SvelteKit, outils = route groups, base de donnees unique.**

| Critere | 1 app (retenu) | Apps separees |
|---|---|---|
| "Les outils se parlent" | Trivial : memes tables, memes services | Synchronisation manuelle, risque de divergence |
| Auth | Une session OTP partagee | Double auth a maintenir |
| Deploiement | Un seul Vercel | N projets, N pipelines |
| Referentiel partage | Natif (1 DB) | Cross-DB ou API inter-apps = complexite |
| Cout pour 3 fondateurs | Minimal | Surdimensionne |
| Risque | Faible (reorg + ajout home) | Eleve (refonte infra) |

**Conclusion** : pour 3 fondateurs symetriques, l'app unique est la seule option proportionnee. A formaliser en ADR Phase 2 (template Nygard). Aucune option concurrente credible -> pas de `council` necessaire.

---

## B. PREMORTEM - "Le chantier a echoue, pourquoi ?" (6 modes d'echec)

### M1 - Le renommage d'adresse casse l'acces des fondateurs (Q6)
*Risque* : passage a `filmpro.vercel.app`, les 3 fondateurs ont l'ancienne `filmpro-crm.vercel.app` en favori, sessions perdues, "le site marche plus".
*Mitigation* : (a) garder l'ancienne adresse active avec redirection vers la nouvelle (alias Vercel) ; (b) fournir le nouveau lien + 1 message clair ; (c) ne PAS supprimer l'ancien alias avant confirmation que les 3 ont migre. **Tache de deploiement supervisee, jamais en autonomie.**
*Severite* : Haute (acces) / Proba : Moyenne -> mitigee a Faible.

### M2 - La reorg des routes casse des liens internes
*Risque* : deplacer les pages CRM sous `(crm)` + home portail a `/` reprefixe ~7+ liens ; un `href` oublie -> 404 ou nav cassee.
*Mitigation* : grep exhaustif de tous les `href`/`goto`/liens dans `config.ts` + composants ; reprefixage mecanique ; **la suite Playwright de navigation doit rester 100 % verte** ; smoke des 7 pages.
*Severite* : Moyenne / Proba : Moyenne -> mitigee par tests.

### M3 - Regression CRM silencieuse (import casse, layout perdu)
*Risque* : un move de fichier casse un import relatif ou le layout `(app)` actuel.
*Mitigation* : Vitest (164) + svelte-check 0 erreur + Playwright e2e (5) verts AVANT preview ; comparaison visuelle des pages cles.
*Severite* : Haute / Proba : Moyenne -> mitigee.

### M4 - "CRM" residuel partout apres le renommage
*Risque* : titres `<title>`, meta, `config.ts` (`name: 'FilmPro CRM'` + description "audiovisuelle" erronee), logo alt, login -> renommage incomplet, image brouillonne.
*Mitigation* : grep exhaustif `CRM` cote UI (string-by-string) ; checklist de renommage ; corriger la description metier (vitrage, pas video). Critere de succes #3 binaire.
*Severite* : Faible (cosmetique) / Proba : Haute si pas de checklist -> mitigee par grep systematique.

### M5 - SSR Svelte 5 plante sur la nouvelle home (Vercel)
*Risque* : nouveau composant home utilise `window`/`localStorage`/`onDestroy` -> `ReferenceError` en SSR Vercel, invisible en `vite preview`. (Incident connu S189, memoire `feedback_svelte5_ondestroy_ssr_window_undefined`.)
*Mitigation* : home statique sans dependance navigateur si possible ; sinon `$effect(() => {...; return cleanup})` ; **tester en preview branch Vercel, pas seulement local**.
*Severite* : Haute / Proba : Faible (home simple) -> surveillee.

### M6 - Confusion avec la baseline rouge pre-existante [RESOLU 2026-06-07]
*Risque (historique)* : 17 tests `hooks.server.test.ts` etaient casses (`c442e59`). On pouvait croire a une regression introduite par le chantier.
*Statut* : **resolu**. Les 17 tests sont repasses verts (decouplage `baseHandle` puis retrait de Sentry le 2026-06-07). Plus de baseline rouge ; toute regression future = tests qui passent de vert a rouge, sans exception a figer.
*Severite* : nulle (risque eteint).

---

## C. BLINDSPOT - angles morts a couvrir

1. **Responsive de la home** : les fondateurs peuvent ouvrir sur mobile. La home portail doit etre lisible et utilisable sur petit ecran (cards empilees), meme si Mobile V3 est un autre sujet. **A inclure dans le golden + QA.**
2. **Empty/loading states** : decision -> home **statique** au chantier 1 (cards sans donnees live). Pas de compteurs temps reel (eviterait un loading/empty inutile). Compteurs live = amelioration future, hors-scope.
3. **Accessibilite des cards** : card active = vrai lien (`<a>`), focus visible, role clair ; card "Devis bientot" = `aria-disabled` + non focusable-navigante, annoncee "bientot disponible" aux lecteurs d'ecran. axe-core 0 violation serieuse (gate Phase 4).
4. **Logo** : reutiliser `FilmPro_logo.svg` existant, ne pas creer de nouveau logo. La home affiche le logo FilmPro (le portail), pas un logo "CRM".
5. **Coherence cockpit** : l'app devient "FilmPro" mais le repo reste `appfactory-cli` et le slug cockpit reste `filmpro`/`crm`. Aucun changement cockpit requis. (Note : le sous-dossier reste `CRM/` cote FS, sans impact UX.)
6. **Redirection de l'ancienne URL** : a verifier que Vercel permet de garder l'ancien alias en redirection (probable). Sinon, fallback = communication du lien. **A confirmer en Phase 2 deploiement.**
7. **Point d'entree par defaut** : apres login, atterrir sur la HOME PORTAIL (et non directement le dashboard CRM), sinon le portail est invisible. Decision : login -> home portail.

---

## D. Decisions prises en auto (signalees, non bloquantes)

- Home **statique** (pas de donnees live) au chantier 1. *Pourquoi* : simplicite, zero etat de chargement, focus sur la structure. Reversible.
- Apres login -> **home portail** (pas dashboard CRM direct). *Pourquoi* : rendre le portail visible des l'entree.
- Reutilisation **integrale des tokens existants** (`app.css`), zero nouveau token. *Pourquoi* : coherence design, pas de divergence de charte.
- Endpoints CRM-specifiques : reprefixage `/api/crm/*` **reporte** (non bloquant pour le portail) -> a trancher Phase 2, peut etre fait au chantier 2.

Dis-moi si l'une de ces auto-decisions ne te convient pas.

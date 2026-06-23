# Spec - Veille : régen W25 + 2 emails + alignement chips + règle « no tiret long »

Session 2026-06-23 (ultracode/xhigh). GO Pascal obtenu (AskUserQuestion) :
régénérer W25 maintenant ; brief brandé envoyé uniquement s'il y a du contenu.

Origine : en prod W25 affiche un résumé mais 0 article, et le résumé contient un « — ».

## Diagnostic (factuel, code lu)

- **W25 = enregistrement périmé.** `intelligence_reports` W25 : `status=published`,
  `version=5`, `generated_at=2026-06-20`, `items_count=0`. Généré le 20/06, AVANT le
  correctif anti-hallu `de05779` (22/06). Le cron W26 (vendredi) bénéficie du correctif
  (sur `main`), mais W25 reste figée. Rejeu local du 22/06 : 0 → 6 items.
- **Idempotence bloque la régén.** `runWeeklyGeneration` court-circuite si
  `status=published` (run-generation.ts:235). Forcer = aujourd'hui chirurgie DB.
- **Emails : 1 seul aujourd'hui.** `EMAIL_RECAP_TO` (défaut `pascal@filmpro.ch`) passé
  tel quel (string) à Resend `to`. Pas de multi-destinataires. FROM `noreply@filmpro.ch`
  (domaine vérifié Resend).
- **Chips redirect cassé.** `from-intelligence/+server.ts::buildRedirect` émet
  `source=zefix&sort=date_import` SANS `tab=`. `parseProspectionFilter` retombe sur
  l'onglet par défaut (`simap`) → `zefix` incompatible → `sourceFilterIncompatible` →
  0 résultat. Les leads importés sont invisibles. + `buildDefaultChips`
  ([id]/+page.server.ts:102) émet encore un chip `simap` mort (source coupée V5).
- **« — » non nettoyé.** prompt.ts:181 dit déjà « pas de cadratin », mais c'est une
  consigne LLM non fiable. Aucun post-processeur déterministe. `stripCitationsFromReport`
  ne couvre pas titres ni `impacts_filmpro`.

## Critères d'acceptation (binaires)

### AC-1 - Régén W25 (T1)
- [ ] `--force` ajouté à `cli-args.ts` (parse strict) + propagé `run-veille.ts` →
      `runWeeklyGeneration(now, deps, { force })`.
- [ ] Avec `force`, l'idempotent_skip `published` est contourné (regénère + upsert).
      Sans `force` : comportement inchangé (skip si published).
- [ ] `cron-veille.yml` : input `force` (bool) → passe `--force`.
- [ ] W25 régénérée en prod : `items_count >= 1`, `version` incrémentée, `status=published`,
      résumé sans « — ». Vérifié par requête Supabase post-run.

### AC-2 - Deux emails (T2)
- [ ] Email **admin** (#1) inchangé : modes success/sparse/failure → `EMAIL_RECAP_TO`
      (pascal@). C'est le « la veille a tourné ».
- [ ] Email **brief brandé** (#2) NOUVEAU : template HTML FilmPro (navy `#152A45`,
      accent `#2F5A9E`, Inter, wordmark, email-safe inline CSS/tables) = résumé éditorial
      + signaux clés (so-what + lien cliquable par item) + impacts + CTA « ouvrir le CRM ».
      → `EMAIL_BRIEF_TO` (pascal@ + antoine@).
- [ ] Brief envoyé **uniquement si >= 1 item** (D2). Semaine vide → seul l'admin part.
- [ ] Multi-destinataires : `EMAIL_*_TO` splitté (virgule/point-virgule, trim, dédup,
      filtrage vide) → array passé à Resend.
- [ ] Échec brief = best-effort, ne casse jamais le run (try/catch, log sanitizé).
- [ ] Aperçu Chrome validé par Pascal AVANT 1er envoi réel (W26).

### AC-3 - Alignement chips ↔ Prospection (T3)
- [ ] `buildRedirect` pose `tab=` correct par kind (zefix→entreprises, simap→simap,
      regbl→regbl) → leads importés visibles. `sort=date_import` conservé (clé valide).
- [ ] `buildDefaultChips` → zefix uniquement (plus de chip simap mort).
- [ ] Forward-compatible Campagnes (pas de couplage au module non livré).

### AC-4 - Règle « no tiret long » déterministe (T4)
- [ ] Module `dedash.ts` : remplace cadratin `—`/barre `―`/figure `‒` par ` - ` (espacé,
      espaces collapsés) ; en-dash `–` dans plages numériques → `-`, sinon ` - `.
      Ne touche jamais le hyphen-minus `-`. Idempotent.
- [ ] Appliqué à TOUT le texte publié : `executive_summary`, item `title`/`summary`/
      `filmpro_relevance`/`deep_dive`, `source.name`, `impacts_filmpro[].note`.
- [ ] Branché dans `run-generation.ts` (avant upsert) + chemin addItem manuel.
- [ ] prompt.ts:181 renforcé (consigne conservée, ceinture+bretelles).

### Hors-scope nommé
- Lot 3 structurel (mémoire longue, dashboard qualité, PDF marque, décompo multi-appel).
- Couplage chips ↔ module Campagnes (non livré).
- Redéploiement page web /crm/veille (deploy Vercel manuel, séparé).

## Revue & preuve
- TDD (tests Vitest avant code), svelte-check 0 erreur, suite complète verte.
- Revue adversariale : sécu (envoi externe Resend, injection, fuite secret),
  sceptiques anti-hallu (le dedash ne falsifie pas un fait ; le brief ne publie pas
  d'item non vérifié), bug-hunter (force/idempotence), contrats (redirect).
- Régén W25 réelle + vérif Supabase + aperçu Chrome email.

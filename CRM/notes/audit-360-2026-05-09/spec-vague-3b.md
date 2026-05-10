# Spec V3b - 28 Low + 12 Info

**Lire avant d'attaquer** : `README-vagues.md` (workflow obligatoire toutes vagues).
**Pré-requis** : V1, V2a, V2b, V2c, V3a mergés en main.

**Objectif (1 phrase)** : Finaliser le polish (defense in depth, doc, magic numbers, edge cases) et clore les 12 Info bonnes pratiques pour atteindre 0 dette technique sur la cascade audit 360.

**Effort** : ~6h
**Branche** : `fix/audit-360-vague-3b`
**Skills** : test-driven-development, supabase, refactoring-ui, golden-standard
**Subagents** : code-review:security-auditor, code-review:test-coverage-reviewer, ui-auditor

---

## Items à fixer (40 = 28 L + 12 I)

### LOW - Sécurité (6)

- **L-01** HSTS manquant : `hooks.server.ts:113-121` → ajouter `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- **L-02** CSP unsafe-inline : `svelte.config.js` → SvelteKit hydratation requirement → DOCUMENTER (pas fixable sans refactor majeur).
- **L-03** RLS mono-tenant flat (3 fondateurs) : 11 tables → DOCUMENTER comme assumée jusqu'à 4e user. Mémoire `feedback_rls_multitenant_durcissement_si_4_users.md` à créer.
- **L-04** DELETE photos/visits sans ownership check : `api/photos/[id]:27-29` + `visits/[id]:19-21` → ajouter check `created_by === locals.user.id` (ou rôle admin si applicable).
- **L-05** ManualItemSchema URL z.string().url() : `veille/[id]/+page.server.ts:80` → mineur (défense réelle = verifyUrl) → DOCUMENTER OU resserrer regex `^https?://`.
- **L-06** Zefix raw response loggée : `api/prospection/zefix/+server.ts:106` → `sanitizeForLog`.

### LOW - Bugs (7)

- **L-07** escapeHtml email-recap couvre 5 entités : `email-recap.ts:63-70` → ajouter `&` `<` `>` `"` `'` (HTML entities standard).
- **L-08** weekKey ISO 8601 frontière fin/début année non testée : `coutsFormat.ts:133-140` → tests Vitest cas limite (semaine 53, 1ère semaine janvier).
- **L-09** formatTokens '0' pour valeurs négatives : `coutsFormat.ts:70-75` → fix root cause (négatives ne devraient pas exister) OU log warning + retourner valeur absolue.
- **L-10** Cron alertes drift `< 20h` au lieu `< 24h` : `api/cron/alertes/+server.ts:62-63` → vérifier intentionnel, soit fixer 24h, soit commenter raison.
- **L-11** Cron signaux Zefix `new Date(invalid)` NaN silencieux : `api/cron/signaux/+server.ts:103-106` → guard `isNaN(date.getTime())` + skip ou log.
- **L-12** parseSwissAddress sans NPA : `api/visits/+server.ts:119-133` → étendre parser pour extraire NPA (regex `\d{4}` Suisse).
- **L-13** DataTable pageSizeOptions arbitraire : `DataTable.svelte:46` → typer `pageSizeOptions: number[]` strict + valider runtime (10/25/50/100).

### LOW - Contracts (3)

- **L-14** complianceTag string|null au lieu d'enum : `scoring.ts:31` → `z.enum(['compliant', 'non_compliant', 'unknown']).nullable()`.
- **L-15** App.PageData session non-nullable : `app.d.ts:9-12` → décision : (a) session rendue `session: Session | null` partout, (b) garder non-nullable mais ajouter assertion. Reco (a).
- **L-16** cost_audit_runs numeric(10,6) borne 9999 EUR : `20260509_001_cost_audit_runs.sql:33-34` → migration ALTER `numeric(12,6)` (borne 999999 EUR).

### LOW - Code (4)

- **L-17** stores writable legacy : `pageSubtitle.ts` + `toast.ts` → SKIP (choix conscient SSR-safe, documenter dans commit).
- **L-18** Magic numbers temps Unix dispersés (13) : `hooks.server.ts:87` + 12 autres → factoriser dans `src/lib/utils/time-constants.ts` (`SECONDS_7_DAYS`, `MS_30_MIN`, etc.).
- **L-19** Pages workspace ≥ 600 lignes : signaux 953 / prospection 944 / entreprises 720 / contacts 650 / pipeline 605 / veille-id 691 → SKIP (justifié orchestration, pattern V9 cascade).
- **L-20** eslint-disable sans justification : `icon-map.ts:26, 165` + `csv-import.ts:124, 126` + `veille/[id]:197` → ajouter commentaire raison ou retirer.

### LOW - UI (8)

- **L-21** gap dashboard 56/20px off-grid : `+page.svelte:131, 152` → 48px / 24px (multiples 8).
- **L-22** content padding 20/40px off-grid : `contacts/+page.svelte:599` + `pipeline:524` → 24px / 32px.
- **L-23** Tabs height 44 vs spec 40 : `ContactsTabs.svelte:56` + autres → drift voulu mobile-first → DOCUMENTER GOLDEN_STANDARD.md (touch target HIG 44).
- **L-24** tab-count font 11px : `ContactsTabs.svelte:86` + autres → 12px (scale strict).
- **L-25** pipeline kanban dimensions off-grid : `pipeline/+page.svelte:529-541` → aligner multiples 8.
- **L-26** login overlay non décoratif (aria-hidden manquant) : `auth/login/+page.svelte:53` → `aria-hidden="true"` si décoratif.
- **L-27** filter-select height 32 vs 34 : `signaux/+page.svelte:785` → 32px strict (token).

### LOW - Tests (1)

- **L-28** SignalBatchDeleteSchema 0 test régression : `schemas.test.ts` → 3 tests : valid input, invalid (non-uuid), cap >500.

### INFO (12 - bonnes pratiques)

- **I-01** cubic-bezier(0.16, 1, 0.3, 1) répété 30+ fois → tokeniser `--ease-out-expo` dans `app.css`.
- **I-02** padding 2px 8px tab pill 7 fois → SKIP (factorisé via cascade golden v9 OK).
- **I-03** setTimeout 200 magic non justifié : `EnrichBatchModal.svelte:61` → commenter raison ou constante.
- **I-04** Doctrine Tailwind utilities + CSS scoped non tranchée : `DataTable.svelte:291` + ailleurs → DOCUMENTER dans CRM/CLAUDE.md (section décisions structurelles, doctrine retenue).
- **I-05** Pas de Dependabot/Snyk : `.github/` → créer `.github/dependabot.yml` (npm weekly).
- **I-06** safeGetSession fail-closed sans test : `src/lib/server/auth.ts` → tests Vitest 3 cas (valide, expirée, malformée).
- **I-07** Description thème admin LLM injection sans escape : `intelligence/prompt.ts:62` → DOCUMENTER (watchlist S169 ok, modèle de menace = admin authentifié déjà privilégié).
- **I-08** Icon wrapper appliqué partout (1 SVG inline résiduel) : `auth/login/+page.svelte:143` → DOUBLON H-29 V2c, vérifier déjà fixé.
- **I-09** Focus trap modaux cohérent : SKIP (bonne hygiène, validée).
- **I-10** Règle noDashedLines respectée : SKIP (validée).
- **I-11** Ratio TDD helpers cascade médian ~13% : SKIP (validé).
- **I-12** Coverage outil non installé : `package.json` → `pnpm add -D @vitest/coverage-v8` + script `pnpm coverage`.

---

## Critères d'acceptation BINAIRES

| # | Critère | Mesure |
|---|---------|--------|
| AC-1 | LOW Sécu (L-01..L-06) | HSTS posé + sanitize Zefix log + ownership check photos/visits + L-02/L-03 documentés |
| AC-2 | LOW Bugs (L-07..L-13) | 7 fixes posés + tests Vitest TDD pour cas limites |
| AC-3 | LOW Contracts (L-14..L-16) | 3 fixes + 1 migration SQL ALTER numeric |
| AC-4 | LOW Code (L-17..L-20) | L-18 factorisé + L-20 commenté ; L-17/L-19 SKIP documentés |
| AC-5 | LOW UI (L-21..L-27) | 7 fixes off-grid + L-23 documenté |
| AC-6 | LOW Tests (L-28) | 3 tests SignalBatchDeleteSchema |
| AC-7 | INFO (I-01..I-12) | 8 fixes posés + 4 SKIP documentés (I-02, I-09, I-10, I-11) |
| AC-8 | I-04 doctrine Tailwind documentée | section ajoutée CRM/CLAUDE.md |
| AC-9 | I-05 Dependabot configuré | `.github/dependabot.yml` posé + 1ère PR auto-bump validée (ou attente cron) |
| AC-10 | I-12 coverage outil | `pnpm coverage` produit rapport HTML local |
| AC-11 | svelte-check baseline | zéro nouvelle erreur |
| AC-12 | Vitest 100% verts | baseline V3a + ≥10 nouveaux tests |
| AC-13 | Build prod OK | exit 0 |
| AC-14 | Audit Opus security-auditor | 0 C / 0 H / 0 M |
| AC-15 | Audit Opus test-coverage-reviewer | couverture globale ≥40% lignes |
| AC-16 | Smoke prod 8 routes | toutes 200 ou 303 |
| AC-17 | Artefact daté audit sécu | `audit_secu_2026-05-{date}_audit-360-vague-3b.md` posé |
| AC-18 | Cockpit deliver V3b | entry delivered |
| AC-19 | Cascade audit 360 close | 100% findings traités (134 fixés + 2 SKIP H-28/M-29 délégués tâche #4) |

---

## Hors-scope NOMMÉ

- H-28 /aide refonte (tâche #4)
- M-29 getElementById /aide (doublon H-28)
- L-02 CSP unsafe-inline (doc only, fix futur structurel)
- L-03 RLS multi-tenant (doc only, à durcir si 4e user)
- L-17 stores writable legacy (choix conscient)
- L-19 pages 600+ lignes (justifié)

---

## Définition de done V3b

- [ ] AC-1 à AC-19 verts
- [ ] 1 migration SQL appliquée prod (L-16 numeric)
- [ ] CRM/CLAUDE.md « Livré cette session » : entry V3b détaillée
- [ ] CRM/CLAUDE.md section « Décisions structurelles » : doctrine Tailwind + RLS multi-tenant + L-02 CSP documentées
- [ ] `.github/dependabot.yml` créé + commit
- [ ] Mémoire `feedback_rls_multitenant_durcissement_si_4_users.md` créée
- [ ] Tag Git `audit-360-cascade-close-2026-05-{date}` posé
- [ ] **Cascade audit 360 ENTIÈREMENT FERMÉE** : 134 findings fixés, 2 délégués tâche #4

---

## Métrique outcome cockpit

```json
{"duration_h": 6, "success": "yes", "note": "V3b 28L+12I fixés (8 SKIP documentés). Dependabot configuré. Coverage outil installé. Audit Opus 0/0/0. Cascade audit 360 100% close. Push prod OK."}
```

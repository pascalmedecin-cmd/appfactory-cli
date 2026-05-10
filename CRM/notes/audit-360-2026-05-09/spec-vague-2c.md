# Spec V2c - High UI golden v9 + tests gate global + CSS dedup

**Lire avant d'attaquer** : `README-vagues.md` (workflow obligatoire toutes vagues).
**Pré-requis** : V1, V2a, V2b mergés en main.

**Objectif (1 phrase)** : Aligner toute l'app sur charte golden v9 stricte (ARIA tablist + heading hierarchy + tokens + type scale), couvrir tests gate global manquants (login/callback/hooks/photos/addItem), et factoriser dette CSS workspace dupliquée 4 pages.

**Effort** : ~6h
**Branche** : `fix/audit-360-vague-2c`
**Skills** : refactoring-ui, golden-standard, test-driven-development, webapp-testing
**Subagents** : code-review:security-auditor, code-review:test-coverage-reviewer, ui-auditor (validation visuelle)

---

## Items à fixer (13, ordre par axe)

### Tests gate global manquants (5 items)

#### H-16 Login form actions 0 tests (~30 min)

`src/routes/login/+page.server.ts` (73L) : 0 test sur sendcode/verifycode auth. Régression OTP / hors domaine / cookie.

**Fix** : `src/routes/login/+page.server.test.ts` (créer). 5+ tests : sendcode happy path @filmpro.ch, sendcode hors domaine → fail, verifycode bon code → cookie 7j set, verifycode mauvais code → fail, verifycode code expiré → fail. Mock Supabase + Resend.

#### H-17 Auth callback OTP 0 tests (~30 min)

`src/routes/auth/callback/+server.ts` (38L) : 2 branches verifyOtp + exchangeCodeForSession.

**Fix** : `+server.test.ts`. 4+ tests : verifyOtp succeed → redirect /, verifyOtp fail → redirect /login?error, exchangeCodeForSession succeed, exchangeCodeForSession fail.

#### H-18 hooks.server.ts gate global 0 tests (~1h)

`src/hooks.server.ts` (124L) : rate limit, expiration 7j, whitelist email, AUTH_EXEMPT_ROUTES strict. Pattern S99 risk.

**Fix** : `src/hooks.server.test.ts`. 8+ tests : rate limit déclenche après 10 req/min, session expirée → redirect login, email hors whitelist → 403, route exempt (/login, /api/cron/*) → bypass auth, route protégée sans session → redirect login, headers CSP/HSTS posés, etc.

#### H-19 Photos upload magic bytes 0 test régression (~45 min)

`src/routes/api/photos/+server.ts:12-30` : `detectImageType` est défense unique anti MIME spoof.

**Fix** : tests Vitest. Cas : PNG valide bytes → accepté, JPEG valide → accepté, PDF déguisé en image/jpeg → rejeté, fichier vide → rejeté, fichier > 5 MB → rejeté.

#### H-20 addItem veille manuel 0 tests (~45 min)

`src/routes/(app)/veille/[id]/+page.server.ts:104-206` : bypass partiel pipeline anti-hallu V2.

**Fix** : tests Vitest. Cas : addItem URL valide → ajouté, URL morte (404) → rejeté, URL paywall (verifyUrl false) → rejeté, content vide → rejeté, theme inexistant → rejeté.

### CSS dette structurelle (2 items)

#### H-21 CSS workspace .page-actions/.btn/.fab dupliqué 4 pages (~1h30)

`src/routes/(app)/{signaux,pipeline,contacts,entreprises}/+page.svelte` : 320 lignes drift cross-pages.

**Fix** : extraire dans `src/lib/components/workspace/WorkspaceShell.svelte` ou `src/lib/styles/workspace.css` (variables tokens). Remplacer dans les 4 pages. Test Playwright/Vitest : pas de régression visuelle (ou screenshot golden v9 maintenu).

#### H-23 CSS tokens design system sous-utilisés (~1h)

81 hardcodes radius vs 15 tokens, 37 hardcodes shadow vs 2 tokens.

**Fix** : sweep `grep -rn "border-radius: \d" src/` et `grep -rn "box-shadow:" src/`, remplacer par `var(--radius-*)` et `var(--shadow-*)` quand match exact. Si valeur hors token → soit étendre tokens (avec validation Pascal en cours de session), soit aligner sur token le plus proche.

### UI golden v9 (6 items, sauf H-28 exclus)

#### H-24 6 hex hardcodés TriageQueue ActionButton (~20 min)

`src/lib/components/dashboard/TriageQueue.svelte:364-386` : `#6E9C8F #C28A86 #8A95A8 #7B8FAE #027A48 #C0391A`.

**Fix** : remplacer par `var(--color-success/danger/info/primary)` ou variantes définies. Pas de nouveau token sans validation.

#### H-25 3 gradients explicites dashboard (~1h)

`SectionGreeting.svelte:83-88` text gradient + `KpisBento.svelte:136` radial 280×280 + `TriageQueue.svelte:392` linear footer. Anti-pattern golden v9 § 6.

**Fix** : décision Pascal in-session : (a) retirer tous les gradients (alignement strict golden v9), (b) documenter exception identité éditoriale dashboard dans `GOLDEN_STANDARD.md` (ajouter section). Reco : (a) si Pascal indisponible dans la session autonome, défaut = retirer + remplacer par `bg-surface-alt` ou aplat token.

#### H-26 Heading hierarchy double H1 (~30 min)

reporting + dashboard-couts + veille + veille/[id] + Header.svelte = double H1 par page (bloquant WCAG AA `page-has-heading-one`).

**Fix** : prop `hideHeaderTitle` sur Header.svelte (ou retirer titre par défaut, page set le sien) ; OU h1 page → h2 si Header garde h1. Decision in-session : Header garde h1, pages locales → h2. Test axe-core via webapp-testing skill : 0 violation `page-has-heading-one`.

#### H-27 ARIA tablist sans roving tabindex (~45 min)

5 composants Tabs (contacts/entreprises/signaux/pipeline/reporting). Pas d'`ArrowLeft/Right`, pas de `tabindex="-1"`.

**Fix** : factoriser primitive `src/lib/components/Tabs.svelte` (créer si absent) avec roving tabindex + ArrowLeft/Right keyboard handler. Refactorer 5 composants pour utiliser cette primitive. Tests Vitest + Playwright : navigation clavier ArrowRight passe d'un tab à l'autre.

#### H-29 login SVG inline + font Inter + gap 2.5rem (~15 min)

`src/routes/(app)/auth/login/+page.svelte:143-145, 190-205` : hors charte fonts/icons/scale.

**Fix** : remplacer SVG inline par Lucide via Icon wrapper + font sweep cohérent app + gap aligné token (probablement 2rem = 32px).

#### H-30 Type scale dashboard hors échelle (~1h)

`SectionGreeting.svelte:75` 76px / `KpisBento.svelte:167, 175, 176` 44/56px → hors `10/12/13/14/15/16/18/22`.

**Fix** : décision Pascal : (a) ramener dans l'échelle stricte (22px max), (b) documenter exception identité éditoriale dashboard avec scale `editorial: 24/40/56/76` distincte. Reco : (b) car le dashboard porte volontairement une identité éditoriale assumée — ajouter section dans `GOLDEN_STANDARD.md` § 5 « Type scale exception editorial pages ».

#### H-31 KpisBento radius 24px hors token (~10 min)

`KpisBento.svelte:103, 135, 146` : tokens = 4/8/10/12/full.

**Fix** : étendre tokens avec `--radius-xl: 24px` OU ramener à `--radius-lg: 12px` (décision Pascal in-session, défaut : étendre token + documenter).

---

## Critères d'acceptation BINAIRES

| # | Critère | Mesure |
|---|---------|--------|
| AC-1 | H-16 login tests | 5+ tests Vitest verts (sendcode + verifycode) |
| AC-2 | H-17 callback tests | 4+ tests verts |
| AC-3 | H-18 hooks tests | 8+ tests verts (rate limit, session, whitelist, exempt routes) |
| AC-4 | H-19 photos tests | 5+ tests verts (magic bytes, MIME spoof, taille) |
| AC-5 | H-20 addItem tests | 5+ tests verts (URL valide/morte/paywall, content, theme) |
| AC-6 | H-21 CSS workspace factorisé | 4 pages utilisent même source ; 320L → ≤80L par page (sweep visuel) |
| AC-7 | H-23 CSS tokens utilisés | sweep radius/shadow : ≤10 hardcodes résiduels documentés |
| AC-8 | H-24 hex retirés | 6 hex remplacés par tokens, 0 hex restant TriageQueue |
| AC-9 | H-25 gradients tranchés | décision documentée (retirés OU exception dans GOLDEN_STANDARD.md) |
| AC-10 | H-26 H1 unique par page | axe-core 0 violation `page-has-heading-one` (test via skill webapp-testing Playwright) |
| AC-11 | H-27 Tabs primitive | composant créé + 5 composants migrés + test clavier ArrowRight |
| AC-12 | H-29 login charte | font + Lucide + gap aligné |
| AC-13 | H-30 type scale tranché | décision documentée GOLDEN_STANDARD.md |
| AC-14 | H-31 KpisBento radius | token étendu OU radius ramené |
| AC-15 | svelte-check baseline | zéro nouvelle erreur |
| AC-16 | Vitest 100% verts | baseline V2b + ≥27 nouveaux tests gate global |
| AC-17 | Playwright e2e verts | suite mobile + desktop verts |
| AC-18 | Build prod OK | exit 0 |
| AC-19 | Audit Opus security-auditor | 0 C / 0 H / 0 M |
| AC-20 | Audit Opus test-coverage-reviewer | gate global ≥80% couverture |
| AC-21 | ui-auditor visual check | 0 régression vs golden v9 sur 6 pages workspace |
| AC-22 | Smoke prod 8 routes | /, /reporting, /dashboard/couts, /signaux, /pipeline, /contacts, /entreprises, /veille ⇒ 200 ou 303 |
| AC-23 | Artefact daté audit sécu | `audit_secu_2026-05-{date}_audit-360-vague-2c.md` posé |
| AC-24 | Cockpit deliver V2c | entry delivered |

---

## Hors-scope NOMMÉ

- H-28 /aide refonte (tâche #4 livraison client distincte)
- M-29 getElementById /aide (doublon H-28)
- Tous Medium / Low / Info (V3a/b)

---

## Définition de done V2c

- [ ] AC-1 à AC-24 verts
- [ ] CRM/CLAUDE.md « Livré cette session » : entry V2c détaillée
- [ ] GOLDEN_STANDARD.md mis à jour (gradients dashboard + type scale editorial documentés si exception retenue)
- [ ] Tag Git `pre-v3a-2026-05-{date}` posé

---

## Métrique outcome cockpit

```json
{"duration_h": 6, "success": "yes", "note": "V2c 13 High UI/tests/CSS fixés. Tabs primitive ARIA + 27 tests gate global + CSS workspace factorisé. Audit Opus 0/0/0. Push prod OK."}
```

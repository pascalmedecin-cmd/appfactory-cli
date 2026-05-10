# Audit 360 - Cascade vagues correctives

**Périmètre** : 136 findings audit 360 (cf. `findings-consolidated.md`), 136/136 approuvés Pascal (cf. `decisions-2026-05-10.md`).

**Méthode** : 6 sessions Claude Code séquentielles autonomes (`--dangerously-skip-permissions`), chacune avec spec figée `spec-vague-*.md`. Chaque session livre + push prod + s'arrête. Pas de parallélisation (même repo, conflits Git garantis).

## Workflow obligatoire (toutes vagues)

### 1. Lecture pré-requis (avant toute modif)

- `~/.claude/CLAUDE.md` (méta + rules)
- `CRM/CLAUDE.md` (scope projet)
- `notes/audit-360-2026-05-09/findings-consolidated.md` (détail finding)
- `notes/audit-360-2026-05-09/decisions-2026-05-10.md` (triage Pascal)
- `notes/audit-360-2026-05-09/spec-vague-{X}.md` (sa propre spec)

### 2. Branche dédiée

```bash
git checkout -b fix/audit-360-vague-{X}
```

Nom convention : `fix/audit-360-vague-1`, `fix/audit-360-vague-2a`, etc.

### 3. Implémentation par groupe cohérent

- Grouper par fichier (minimiser rebuild)
- Une commit par groupe logique (par axe ou par fichier)
- Message commit : `fix(crm): audit 360 V{X} - {ID-INF}..{ID-SUP} {axe} ({nombre items})`

### 4. Gates QA 360 (toutes obligatoires, vert avant push)

| Gate | Commande | Seuil |
|------|----------|-------|
| svelte-check | `pnpm check` | baseline 4/35 strict (zéro nouvelle erreur, zéro warning) |
| Vitest | `pnpm test:unit -- --run` | 100% verts (baseline >810 selon vague, +N nouveaux tests) |
| TDD nouveaux helpers | tests Vitest avant code | ratio cible ≥10% |
| Audit Opus security-auditor | subagent `code-review:security-auditor` sur diff branche | 0 Critical / 0 High / 0 Medium ; Low/Info acceptés watchlist |
| Build prod | `pnpm build` | OK, taille bundle stable |
| Smoke prod | `curl -I https://filmpro-crm.vercel.app/{route}` | 303 → /login OU 200 |

### 5. Workflow Git/Vercel

```bash
git push -u origin fix/audit-360-vague-{X}
# Wait Vercel preview Ready (~50-70s)
# Smoke preview URL : ouvrir Chrome avec cache-buster
git checkout main && git merge --ff-only fix/audit-360-vague-{X}
git push origin main
# Wait Vercel prod Ready (~50-70s)
# Smoke prod URLs (cf. spec)
git branch -d fix/audit-360-vague-{X}
git push origin :fix/audit-360-vague-{X}  # cleanup remote
```

### 6. Artefact daté audit sécu (obligatoire)

Pour CHAQUE vague, écrire artefact :
`~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/audit_secu_2026-05-10_audit-360-vague-{X}.md`

Format : score H/M/L/I count, fichiers couverts, findings (résolus + ouverts), date, contexte.

### 7. Inscription cockpit

Livraison via `python3 ~/.claude/cockpit/bin/deliver.py appfactory <id8> --sub crm --outcome '{"duration_h":N,"success":"yes","note":"V{X} {nombre items} fixés..."}'`

ID cockpit cible : `7ed58fdb` (entry « Fixer 7 Critiques audit 360 »). Une seule entry pour V1 (les autres vagues = nouvelles entries cockpit créées via API HTTP dans la spec).

### 8. Mise à jour CRM/CLAUDE.md

À la fin de chaque vague :
- Bloc « Livré cette session » : entry détaillée (commits, audit Opus, smoke prod, watchlist)
- Bloc « Statut » et « Dernière mise à jour » : maj date+vague
- Section Prochaine session : tâche cochée [x] si V1 (livraison client) ou [ ] V{X+1} ouverte

## Skills + subagents activables (par vague)

Voir spec individuelle § « Skills/subagents ».

Skills usuels :
- `test-driven-development` (toutes)
- `supabase` (V1 C-05 migration, V2a H-13 H-15, V2b H-09 atomicité, V3a quelques)
- `webapp-testing` (toutes pour tests Vitest)
- `refactoring-ui` (V2c, V3a UI)
- `golden-standard` (V2c)

Subagents usuels :
- `code-review:security-auditor` (toutes - gate QA)
- `code-review:bug-hunter` (V2b)
- `code-review:contracts-reviewer` (V2a)
- `code-review:test-coverage-reviewer` (V2c)

## Règles strictes (ne jamais déroger)

- **Zéro dette technique** : tout finding listé dans la spec DOIT être fixé. Si bloquant insurmontable → STOP et signaler à Pascal (pas avancer en laissant dette).
- **Audit Opus 0/0/0** : si Critical/High/Medium détectés post-fix, fixer in-session zéro dette avant push prod.
- **Pas de patch/workaround** : cause racine obligatoire (cf. `~/.claude/rules/methodology.md`).
- **CRON_SECRET non touché** : 6 endpoints actifs en dépendent (signaux, alertes, nettoyage-crm, intelligence-archive, lead-rescore, recheck-historical).
- **RLS Supabase non assouplie** : aucune politique modifiée sans audit explicite Pascal.
- **Pas d'édition `entries.jsonl` directe** : voies sûres (a) drag UI cockpit, (b) `POST /api/entries/appfactory` puis `POST /api/queue/appfactory`. Cf. `feedback_cockpit_watcher_purge_cli_entries_S177.md`.
- **Forcer une question Pascal seulement si** : (a) impact visible irréversible, (b) vrai doute entre 2 options équivalentes. Sinon trancher et avancer (cf. `~/.claude/rules/communication.md` § Auto-décision).

## Calendrier prévisionnel

| Session | Items | Effort | Calendrier prévisionnel |
|---------|-------|--------|--------------------------|
| V1 | 8 (7C + H-11) | ~2h30 | dimanche 10/05 - **AVANT lundi midi** |
| V2a | 9 (sécu + contracts + DB CHECK) | ~5h | lundi 11/05 PM |
| V2b | 7 (concurrence + atomicité) | ~4h | lundi 11/05 PM |
| V2c | 13 (UI golden v9 + tests + CSS dedup) | ~6h | mardi 12/05 |
| V3a | 57 (Medium) | ~15h | mardi-mercredi 12-13/05 |
| V3b | 40 (Low + Info) | ~6h | mercredi 13/05 |

Total cumul : ~38h sur 4 jours (10-13 mai). Pascal peut étaler si fatigue, l'ordre est figé.

## Démarrage d'une session

```bash
cd /Users/pascal/Claude/Projets/AppFactory/CRM
claude --dangerously-skip-permissions
```

Premier prompt après boot :

```
Lis `notes/audit-360-2026-05-09/README-vagues.md` puis exécute la spec
`notes/audit-360-2026-05-09/spec-vague-{X}.md` de bout en bout autonome.
Push prod en fin. Pas de validation intermédiaire sauf blocage insurmontable.
```

Remplacer `{X}` par 1 / 2a / 2b / 2c / 3a / 3b.

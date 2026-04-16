# Handoff - Session 67 : Bloc 6ter/quater — pipeline images Flux 1.1 Pro Ultra + retrait Pexels/Unsplash

## Objectif session

Initialement : valider le fallback /veille Bloc 6bis + décider du bug `url_mutated`. Étendu en cours de session par Pascal : (1) refondre le pipeline image avec génération IA (fal.ai), (2) sortir Pexels/Unsplash du flow, (3) adopter cascade 4 niveaux avec audits Vision.

## Décisions structurelles

### Modèle text-to-image : Flux 1.1 Pro Ultra (vs Recraft V3)

`/dig` comparatif effectué (Artificial Analysis ELO leaderboard + fal.ai 2026 pricing) :
- Recraft V3 ELO #1 (1172) mais API sans `negative_prompt` ni style variant utile pour nos use cases
- **Flux 1.1 Pro Ultra** ELO #2 (1143), `aspect_ratio 16:9` natif 2K (2752×1536), $0.06/image
- Tests isolés sur 3 cas via `scripts/test-fal-prompt.ts` : Recraft v1 (Sonnet) 1/3 ≥7 vs Flux Pro Ultra (Sonnet) 2/3 ≥7
- Qualité résolution +50% avec Flux → retenu

### Modèle brief LLM : Sonnet 4.6 (vs Opus)

Test Opus brief a produit résultats *pires* (pertinence moy 4.7 vs 6 avec Sonnet) : Opus trop poétique/abstrait pour Flux qui ne matérialise pas les nuances subtiles (« films à peine perceptibles »). Sonnet produit des briefs matériels que le diffusion model visualise mieux.

Règle apprise : « Opus partout = qualité max » ne s'applique pas mécaniquement. Pour piloter un text-to-image limité, Sonnet matériel > Opus littéraire.

### Modèle audit Vision : Sonnet 4.6 (contrainte timeout Vercel Hobby)

Initialement Opus 4.6 (qualité critique filet de sécurité), mais timeout 300s Vercel Hobby atteint. Switch Vision Opus → Sonnet a ramené à 154s. Régen W16 OK mais Vision Sonnet moins exigeant qu'Opus — probablement une des causes du rejet QA Pascal fin session.

### Retrait Pexels/Unsplash

Décision Pascal : inutiles dans flow temps réel depuis pivot génération fal.ai. Lib garde labels 'pexels'/'unsplash' comme historique (pas de nouveaux imports). Purge manuelle 156 → 44 images via viewer HTML servi par Python http.server + Chrome MCP.

## Livré (commits pushed main)

- `46d368e` — Pipeline images 4 niveaux v1 (Recraft V3) + segment-mapper + og-image-quality + cascade UI + migration CHECK fal-ai
- `146256f` — Fix URL absolue generated_image_url + audit technique
- `c269bd1` — Pivot Flux 1.1 Pro Ultra + Vision Opus + retrait code Pexels/Unsplash
- `d3a6792` — maxDuration=800 (rejeté Vercel Hobby)
- `fd24ebb` — Perf Vision Sonnet + concurrence 3 + maxDuration=300
- `769a6c1` — Docs session 67 (CLAUDE.md)

## État prod W16 (post-régen session 67)

- Item rank 1 « Nature U-value vitrages 2-4.5 → 0.5-1.5 W/m²K » → og:image Springer schéma 1570px (niveau 1)
- Item rank 2 « Guide sectoriel films commerciaux énergie 10-30% » → fal.ai Flux 2752×1536 (niveau 2)

**Pascal a signalé les 2 images comme non conformes en fin de session** — QA cadrage + traitement reportés à prochaine session. Contexte complet dans `memory/project_qa_images_veille.md`.

## Tests

- 334/334 verts (+35 nouveaux : segment-mapper, og-image-quality, veille-fallback, test-fal-prompt)
- Build OK
- Régen W16 prod durée cron : 154s (sous 300s timeout)

## Bloquants déverrouillés

- Validation live fallback /veille : DONE
- Décision `url_mutated` : première observation faite (0 occurrence W16 régénéré), plan d'observation W17+W18+W19 avant retrait dead code

## Bloquants nouveaux (voir CLAUDE.md Prochaine session)

- **[PRIORITÉ]** QA cadrage images /veille (rejet Pascal fin session) — démarre la prochaine session. Voir `memory/project_qa_images_veille.md`.
- Email récap veille post-cron (spec prête dans `memory/project_email_veille_recap.md`) — débloqué.
- Dashboard coûts CRM — reste bloqué par email récap + session page dashboard dédiée.

## Credentials / env vars (changements session)

**Ajoutées Vercel prod** (via `vercel env add` ou pipé depuis Enseignement `.env`) :
- `FAL_KEY` (production uniquement, preview bloqué par interactive prompt CLI — à ajouter plus tard si besoin preview). Clé partagée avec projet Enseignement. Scope : génération fal.ai Flux 1.1 Pro Ultra pour niveau 2 cascade /veille.

**Retirées Vercel prod** (via `vercel env rm --yes`) :
- `PEXELS_API_KEY`
- `UNSPLASH_ACCESS_KEY`

**Ajoutées/retirées local `.env.local` AppFactory** (miroir Vercel) :
- Ajout : `FAL_KEY`
- Retrait : `PEXELS_API_KEY`, `UNSPLASH_ACCESS_KEY`

**Pas touché** : clés Enseignement (dossier séparé, Pascal conserve l'usage là-bas).

## Subagents

Aucun subagent BLOCK cette session (pas de Task Agent invoqué pour analyse parallèle). Sonnet utilisé uniquement via SDK Anthropic pour brief LLM dans le pipeline. Opus utilisé pour Phase 1+2 Veille text.

## Garde-fous / sécurité

- Tests 334/334 verts avant push
- Build OK avant deploy
- Migration Supabase `20260416120000_media_library_fal.sql` appliquée via `supabase db query --linked --file` (contournement conflit `db push` sur version collision) puis `migration repair --status applied` pour tracking cohérent
- maxDuration cron intelligence explicitement à 300s (limite Hobby) pour éviter timeout silencieux
- Audit Vision backend : image stockée toujours en lib (réutilisable), mais pas servie pour l'item si pertinence < 6/10 (cascade fallback prend le relais)

## Prochaine action (priorité)

**QA cadrage images /veille** : démarrer prochaine session en parcourant visuellement les 2 images W16 actuelles avec Pascal, lister les problèmes précis, puis proposition structurée. Spec/contexte : `memory/project_qa_images_veille.md`. Ne pas modifier le pipeline avant validation du diagnostic.

## Apprentissages méthodo

- **« Opus partout » n'est pas mécaniquement la bonne règle** : pour piloter un diffusion model, Sonnet matériel > Opus littéraire.
- **Vercel Hobby maxDuration = 300s** limite dure. Pipeline complexe doit tenir dedans ou upgrade Pro (25€/mois).
- **Supabase migration collision** : fichiers avec même prefix YYYYMMDD → Supabase tronque version. Solution : timestamp long YYYYMMDDHHMMSS + exécution SQL directe via `supabase db query --linked` quand `db push` refuse à cause d'historique.
- **fal.ai Flux Pro Ultra** : prompt max ~1000 chars (Recraft même limite). Toujours truncate défensif à 990 chars.

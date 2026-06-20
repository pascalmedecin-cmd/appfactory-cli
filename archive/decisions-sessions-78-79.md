# Archive : décisions sessions 78-79 (formation-ia)

Détail complet extrait du CLAUDE.md racine AppFactory lors du condensé 2026-04-20 (S108). Source de vérité pour les sessions S78 et S79 formation-ia, ne concernent pas le CRM FilmPro.

Pour les sessions S80 → S107 : détail dans `formation-ia/CLAUDE.md` (sous-projet autonome).

---

## Session 79 (2026-04-17) : S7 ingestion marketing J11-J12

Scope formation-ia uniquement, zéro modif côté CRM. Session autonome `/effort xhigh`, time-box ~30 min sur 2h budget.

**S7 ingestion 2 modules `analyse` + `cadre` livrés bout en bout** : seed prod Supabase (zéro commit code, JSON `content/marketing-analyse-cadre-2026-04-17.json` gitignoré, ~440 lignes).

1 nouvel outil (`perplexity`, plan Free 5 Deep Research/jour, 96.3% précision citations UCStrategies) + 5 existants réutilisés (`claude`, `chatgpt`, `gemini`, `notebooklm`, `mistral-le-chat`) + 2 jours (J11 `veille-concurrentielle` famille `analyse`, J12 `ai-act-rgpd` famille `cadre`) + 8 exercices (4 par module) + 16 liens outils + 8 questions quiz (4 par module).

Stratégie ressources = 18 URLs sources officielles (eur-lex règlement 2024/1689 + directive 2019/790, cnil.fr, artificialintelligenceact.eu, légifrance loi 2023-451, Princeton GEO arxiv.org/abs/2311.09735, AIE Energy and AI 2024 sur iea.org, blog.google NotebookLM, ARPP Influence responsable, SACEM opt-out, Hugging Face, ADEME, C2PA, Spawning.ai).

Disclaimer « règles en évolution, vérifier au moment de publier » sur intro J12 + Q2 J12 + check_question Ex4 J12 (point de vigilance AI Act applicable 2 août 2026).

Sources VÉRIFIÉES/TOLÉRÉES exploitées : AI Act Article 50 pleinement applicable 2 août 2026 + sanctions 15 M€ ou 3% CA mondial (transparence), 35 M€/7% (pratiques interdites Article 5) - règlement UE 2024/1689 articles 99 et 113 ; loi française 2023-451 du 9 juin 2023 (loi Influence) ; directive UE 2019/790 article 4-3 (opt-out TDM) + SACEM opt-out 12 oct 2023 sur ~96M œuvres ; étude Princeton 2023 GEO - 50% contenus cités par LLM < 13 semaines, +30-40% visibilité via sources/stats ; UCStrategies 96.3% précision Perplexity Deep Research ; AIE 2024 - 1 prompt ChatGPT ≈ 10 Wh vs 0.3 Wh Google (33×) ; NotebookLM Audio Overviews FR depuis 29 avril 2025 + plan gratuit 50 sources/200 MB par PDF.

Rédaction Opus tenue en une passe. Gates PEDAGOGIE auto 0 errors / 0 warns sur 11 gates. Smoke local 8/8 routes en 200, prod 8/8 en 303 (auth normale, DB partagée).

**DB prod finale** : 12 modules J1-J12 + 23 outils + 42 exercices + 48 quiz questions.

**Critère de sortie global du plan parcours marketing atteint**. Côté CRM : aucune modif.

---

## Session 78 (2026-04-17) : S6 ingestion production lourde J9-J10

Scope formation-ia, docs-only côté CRM. Session autonome `/effort xhigh`, ~25 min.

**S6 ingestion 2 modules `production` livrés bout en bout** : seed prod Supabase (zéro commit code).

6 nouveaux outils (`google-veo`, `runway`, `heygen`, `synthesia`, `elevenlabs`, `descript`) + 3 existants réutilisés (`claude`, `notebooklm`, `mistral-le-chat`) + 2 jours (J9 `video-courte`, J10 `audio-voix`) + 8 exercices + 17 liens + 8 quiz.

Sources VÉRIFIÉES : HubSpot 2026, AI Act Art. 50, CNIL biométrique, Artificial Analysis Runway Gen-4, NotebookLM FR, Mistral Voxtral, ElevenLabs pricing, Tennessee ELVIS Act, SynthID, HeyGen G2 #1, Synthesia SOC 2.

Gates 0/0. DB prod à fin session 78 : 10 modules J1-J10 + 22 outils. Côté CRM : aucune modif.

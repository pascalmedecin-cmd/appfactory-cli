-- Migration : aligner CHECK item_rank DB sur cap Zod IntelligenceItemSchema.rank.
--
-- Contexte (audit 360 H-13, S178 V2a) : `IntelligenceItemSchema.rank` accepte
-- 1..15 (Bloc Veille) mais la migration `20260427_001_lead_signals.sql`
-- contraint `item_rank` à 1..10. Drift silencieux : un item rank 11..15 traité
-- amont (re-scoring, import) déclencherait erreur Postgres opaque (23514) au
-- moment du flush dans `prospect_lead_signals`.
--
-- Pré-requis : audit DB pré-application = AUCUNE ligne avec item_rank > 10
-- aujourd'hui (CHECK actuel l'interdit, donc la table est nécessairement
-- compatible avec une borne plus large). Étendre la borne à 15 est strictement
-- élargissant (toute ligne valide aujourd'hui reste valide demain).
--
-- Roll-back : recréer le CHECK à 1..10 si nécessaire (à condition qu'aucune
-- ligne 11..15 n'ait été insérée entre-temps).

ALTER TABLE prospect_lead_signals
  DROP CONSTRAINT IF EXISTS prospect_lead_signals_item_rank_check;

ALTER TABLE prospect_lead_signals
  ADD CONSTRAINT prospect_lead_signals_item_rank_check
  CHECK (item_rank >= 1 AND item_rank <= 15);

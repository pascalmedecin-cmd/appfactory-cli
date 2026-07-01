-- Audit 360 V2b - H-09 : optimistic locking sur intelligence_reports.items
--
-- Contexte : `addItem` veille (`/veille/[id]/+page.server.ts:160-203`)
-- faisait read-modify-write non-atomique sur la colonne `items` JSONB :
--   1. SELECT items
--   2. push newItem en JS
--   3. UPDATE items = updatedItems
-- Si 2 onglets admin ajoutent un item simultanément, le 2ème écrase le 1er
-- silencieusement (lost update).
--
-- Fix : ajout colonne `version INTEGER` incrémentée à chaque update.
-- Côté code : SELECT items, version → UPDATE items, version+1 WHERE
-- version=$old. Si 0 rows updated → retry max 3 fois.
--
-- Default 0 NOT NULL, lignes existantes initialisées à 0.

ALTER TABLE public.intelligence_reports
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0;

-- Ajouter le champ temperatures (catégories : chaud, tiede, froid)
-- Remplace conceptuellement score_minimum pour les alertes
ALTER TABLE recherches_sauvegardees
  ADD COLUMN IF NOT EXISTS temperatures TEXT[];

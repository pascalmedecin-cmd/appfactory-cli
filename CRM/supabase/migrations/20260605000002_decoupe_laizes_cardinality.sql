-- =============================================================================
-- Correctif defense-in-depth Découpe Films (audit sécu 2026-06-05, probe QA).
-- array_length(laizes_mm, 1) renvoie NULL pour un tableau VIDE → un CHECK qui évalue
-- à NULL est considéré satisfait par Postgres : un produit avec 0 laize passait la
-- contrainte (Zod .min(1) le bloque côté app, mais la DB ne le filtrait pas).
-- cardinality() renvoie 0 pour un array vide → rejette correctement.
-- Idempotent : remplace le CHECK array_length par un CHECK cardinality nommé.
-- =============================================================================
DO $$
DECLARE cn text;
BEGIN
  -- Retire l'ancien CHECK laizes (nom auto-généré, basé sur array_length).
  FOR cn IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.decoupe_produits'::regclass AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%array_length%laizes_mm%'
  LOOP
    EXECUTE format('ALTER TABLE public.decoupe_produits DROP CONSTRAINT %I', cn);
  END LOOP;

  -- Pose le CHECK cardinality (rejette le tableau vide ET borne 1..20 + valeurs 1..20000).
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.decoupe_produits'::regclass
       AND conname = 'decoupe_produits_laizes_chk'
  ) THEN
    ALTER TABLE public.decoupe_produits
      ADD CONSTRAINT decoupe_produits_laizes_chk
      CHECK (cardinality(laizes_mm) BETWEEN 1 AND 20
             AND array_position(laizes_mm, NULL) IS NULL
             AND 0 < ALL (laizes_mm)
             AND 20000 >= ALL (laizes_mm));
  END IF;
END $$;

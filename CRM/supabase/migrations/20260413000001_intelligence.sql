-- Migration : Veille sectorielle (page /veille)
-- - Table intelligence_reports : 1 edition hebdo, items + impacts + search_terms en jsonb
-- - Table intelligence_reads : marquage lu par user (badge sidebar non-lus)
-- - Colonnes de tracabilite sur prospect_leads (veille -> prospection)

-- Table principale : une edition hebdomadaire
CREATE TABLE intelligence_reports (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  week_label         TEXT NOT NULL UNIQUE,  -- format "YYYY-Www" ex "2026-W15"
  compliance_tag     TEXT NOT NULL CHECK (compliance_tag IN ('OK FilmPro', 'Adjacent pertinent', 'À surveiller', 'Non exploitable')),
  executive_summary  TEXT NOT NULL,
  items              JSONB NOT NULL,          -- array d'items (max 10), schema valide cote app via Zod
  impacts_filmpro    JSONB NOT NULL,          -- array max 3
  search_terms       JSONB NOT NULL,          -- array 8-15
  raw_response       JSONB,                   -- backup reponse Claude brute (debug)
  status             TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft', 'error')),
  error_message      TEXT,
  archived_at        TIMESTAMPTZ
);

CREATE INDEX idx_intelligence_generated_at ON intelligence_reports(generated_at DESC);
CREATE INDEX idx_intelligence_week ON intelligence_reports(week_label);
CREATE INDEX idx_intelligence_status ON intelligence_reports(status);

-- Marquage lu par user (badge sidebar non-lus)
CREATE TABLE intelligence_reads (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id  UUID NOT NULL REFERENCES intelligence_reports(id) ON DELETE CASCADE,
  read_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, report_id)
);

CREATE INDEX idx_intelligence_reads_user ON intelligence_reads(user_id);

-- Tracabilite Veille -> Prospection : origine d'un lead importe depuis la veille
ALTER TABLE prospect_leads
  ADD COLUMN source_intelligence_id   UUID REFERENCES intelligence_reports(id) ON DELETE SET NULL,
  ADD COLUMN source_intelligence_term TEXT;

CREATE INDEX idx_leads_source_intelligence ON prospect_leads(source_intelligence_id)
  WHERE source_intelligence_id IS NOT NULL;

-- RLS (meme politique que le reste du CRM : authenticated full access)
ALTER TABLE intelligence_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON intelligence_reports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Lecture : chacun voit ses propres lectures (user_id = auth.uid())
CREATE POLICY "read_own_reads" ON intelligence_reads
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "insert_own_reads" ON intelligence_reads
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete_own_reads" ON intelligence_reads
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Spec : notes/page-log-2026-05-13/spec.md § 4 + audit S185 L-3 contracts.
-- Durcit le CHECK sur admin_notes : avant, `'' (chaîne vide)` était toléré et
-- aurait pollué la table avec des notes vides indiscernables d'une "vraie" note.
-- Maintenant : NULL ou 1..2000 chars (cohérent avec normalisation `'' → null`
-- côté form action `updateAdminNotes`).
-- Defense in depth : la form action trim()+ `'' → null` côté serveur, le CHECK
-- garantit qu'aucun chemin (script ops, SQL ad hoc, futur endpoint) ne stocke ''.

ALTER TABLE public.feedback_entries
  DROP CONSTRAINT IF EXISTS feedback_entries_admin_notes_check;

ALTER TABLE public.feedback_entries
  ADD CONSTRAINT feedback_entries_admin_notes_check
  CHECK (admin_notes IS NULL OR char_length(admin_notes) BETWEEN 1 AND 2000);

COMMENT ON CONSTRAINT feedback_entries_admin_notes_check ON public.feedback_entries IS
'Spec page-log-2026-05-13/spec.md L-3 contracts : interdit '''' (vide) pour éviter notes vides indistinguables de NULL.';

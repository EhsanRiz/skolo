-- Migration 014: Custom grade boundaries per school
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS grade_boundaries JSONB;

-- Default boundaries (A≥80, B≥70, C≥60, D≥50, F≥0)
-- Schools that haven't customised will use the app's built-in defaults.
-- No need to back-fill — NULL means "use defaults".

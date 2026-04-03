-- ============================================================
-- SKOLO — Migration 005
-- Reference numbers for learners and teachers
-- ============================================================

-- Add reference_no columns
ALTER TABLE public.learners ADD COLUMN IF NOT EXISTS reference_no VARCHAR(20);
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS reference_no VARCHAR(20);

-- Sequence tracker per school (prevents duplicates on concurrent inserts)
CREATE TABLE IF NOT EXISTS public.school_sequences (
  school_id      UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  sequence_type  VARCHAR(20) NOT NULL,  -- 'learner' | 'teacher'
  last_value     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (school_id, sequence_type)
);

ALTER TABLE public.school_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON public.school_sequences
  FOR ALL USING (true) WITH CHECK (true);

-- ── Backfill existing learners ──────────────────────────────
-- Assigns sequential numbers per school, ordered by created_at
WITH numbered AS (
  SELECT
    id,
    school_id,
    ROW_NUMBER() OVER (PARTITION BY school_id ORDER BY created_at, id) AS rn
  FROM public.learners
  WHERE reference_no IS NULL
)
UPDATE public.learners l
SET reference_no = LPAD(n.rn::text, 5, '0')
FROM numbered n
WHERE l.id = n.id;

-- Seed the sequence tracker for learners
INSERT INTO public.school_sequences (school_id, sequence_type, last_value)
SELECT
  school_id,
  'learner',
  COUNT(*)::INTEGER
FROM public.learners
GROUP BY school_id
ON CONFLICT (school_id, sequence_type) DO UPDATE
  SET last_value = EXCLUDED.last_value;

-- ── Backfill existing teachers ──────────────────────────────
WITH numbered AS (
  SELECT
    id,
    school_id,
    ROW_NUMBER() OVER (PARTITION BY school_id ORDER BY created_at, id) AS rn
  FROM public.teachers
  WHERE reference_no IS NULL
)
UPDATE public.teachers t
SET reference_no = 'T-' || LPAD(n.rn::text, 4, '0')
FROM numbered n
WHERE t.id = n.id;

-- Seed the sequence tracker for teachers
INSERT INTO public.school_sequences (school_id, sequence_type, last_value)
SELECT
  school_id,
  'teacher',
  COUNT(*)::INTEGER
FROM public.teachers
GROUP BY school_id
ON CONFLICT (school_id, sequence_type) DO UPDATE
  SET last_value = EXCLUDED.last_value;

-- Unique index to prevent duplicate reference numbers per school
CREATE UNIQUE INDEX IF NOT EXISTS idx_learners_ref_no
  ON public.learners(school_id, reference_no)
  WHERE reference_no IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_ref_no
  ON public.teachers(school_id, reference_no)
  WHERE reference_no IS NOT NULL;

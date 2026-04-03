-- ============================================================
-- SKOLO — Migration 007
-- Learner profile: exam results, awards, notes
-- ============================================================

-- ─── EXAM RESULTS ────────────────────────────────────────────
CREATE TABLE public.exam_results (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  learner_id  UUID NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  subject     VARCHAR(100) NOT NULL,
  term        SMALLINT NOT NULL,        -- 1 | 2 | 3 | 4
  year        SMALLINT NOT NULL,
  mark        NUMERIC(5,2),            -- 0–100 percentage
  created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exam_results_learner ON public.exam_results(learner_id);
CREATE INDEX idx_exam_results_school  ON public.exam_results(school_id);

-- Prevent duplicate subject+term+year per learner
CREATE UNIQUE INDEX idx_exam_results_unique
  ON public.exam_results(learner_id, subject, term, year);

-- ─── LEARNER AWARDS ──────────────────────────────────────────
CREATE TABLE public.learner_awards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  learner_id  UUID NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  award_date  DATE,
  created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_awards_learner ON public.learner_awards(learner_id);

-- ─── LEARNER NOTES ───────────────────────────────────────────
CREATE TABLE public.learner_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  learner_id  UUID NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  note        TEXT NOT NULL,
  created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_learner ON public.learner_notes(learner_id);

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.exam_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_notes  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.exam_results   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.learner_awards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.learner_notes  FOR ALL USING (true) WITH CHECK (true);

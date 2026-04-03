-- ============================================================
-- SKOLO — Migration 004
-- Fee plans, fee ledger, teachers
-- ============================================================

-- ─── FEE PLANS ───────────────────────────────────────────────
-- Defines expected recurring fees per grade
CREATE TABLE public.fee_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  grade_id    UUID REFERENCES public.grades(id) ON DELETE SET NULL,
  name        VARCHAR(200) NOT NULL,
  amount      NUMERIC(10,2) NOT NULL,
  frequency   VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly' | 'termly'
  due_day     SMALLINT DEFAULT 1,      -- day of month for monthly (1–28)
  term        SMALLINT,                -- term number for termly (1–4)
  year        SMALLINT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fee_plans_school ON public.fee_plans(school_id);
CREATE INDEX idx_fee_plans_grade  ON public.fee_plans(grade_id);

-- ─── FEE LEDGER ──────────────────────────────────────────────
-- One row per expected charge per learner
-- Status is recomputed on every payment update
CREATE TABLE public.fee_ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  learner_id    UUID NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  fee_plan_id   UUID REFERENCES public.fee_plans(id) ON DELETE SET NULL,
  description   VARCHAR(200) NOT NULL,  -- e.g. "Monthly Tuition — April 2026"
  due_date      DATE NOT NULL,
  amount_due    NUMERIC(10,2) NOT NULL,
  amount_paid   NUMERIC(10,2) NOT NULL DEFAULT 0,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- pending | partial | paid | overdue
  recorded_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fee_ledger_school   ON public.fee_ledger(school_id);
CREATE INDEX idx_fee_ledger_learner  ON public.fee_ledger(learner_id);
CREATE INDEX idx_fee_ledger_status   ON public.fee_ledger(status);
CREATE INDEX idx_fee_ledger_due_date ON public.fee_ledger(due_date);
-- Unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX idx_fee_ledger_unique
  ON public.fee_ledger(learner_id, fee_plan_id, due_date)
  WHERE fee_plan_id IS NOT NULL;

-- ─── TEACHERS ────────────────────────────────────────────────
CREATE TABLE public.teachers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name   VARCHAR(200) NOT NULL,
  email       VARCHAR(200),
  phone       VARCHAR(20),
  class_id    UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  subject     VARCHAR(200),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teachers_school ON public.teachers(school_id);

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.fee_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_ledger  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.fee_plans   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.fee_ledger  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.teachers    FOR ALL USING (true) WITH CHECK (true);

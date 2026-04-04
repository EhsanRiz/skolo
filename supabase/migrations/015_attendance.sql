-- ============================================================
-- SKOLO — Migration 015
-- Attendance tracking: daily register per class
-- ============================================================

CREATE TABLE public.attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id)  ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES public.classes(id)  ON DELETE CASCADE,
  learner_id  UUID NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  status      VARCHAR(10) NOT NULL CHECK (status IN ('present','absent','late','excused')),
  note        TEXT,
  created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One record per learner per day
CREATE UNIQUE INDEX idx_attendance_unique    ON public.attendance(learner_id, date);
CREATE INDEX         idx_attendance_class    ON public.attendance(class_id, date);
CREATE INDEX         idx_attendance_learner  ON public.attendance(learner_id);
CREATE INDEX         idx_attendance_school   ON public.attendance(school_id);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON public.attendance FOR ALL USING (true) WITH CHECK (true);

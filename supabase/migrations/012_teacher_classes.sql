-- ============================================================
-- SKOLO — Migration 012
-- Teacher class assignments + link teacher to user account
-- ============================================================

-- Link teacher record to a user login account
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Many-to-many: teacher teaches subject in class
CREATE TABLE public.teacher_classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id  UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject     VARCHAR(100),
  is_home_class BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (teacher_id, class_id, subject)
);

CREATE INDEX idx_teacher_classes_teacher ON public.teacher_classes(teacher_id);
CREATE INDEX idx_teacher_classes_class   ON public.teacher_classes(class_id);
CREATE INDEX idx_teacher_classes_school  ON public.teacher_classes(school_id);

ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON public.teacher_classes
  FOR ALL USING (true) WITH CHECK (true);

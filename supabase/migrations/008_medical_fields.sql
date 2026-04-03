-- ============================================================
-- SKOLO — Migration 008
-- Medical condition and doctor fields for learners
-- ============================================================

ALTER TABLE public.learners
  ADD COLUMN IF NOT EXISTS medical_condition TEXT,
  ADD COLUMN IF NOT EXISTS doctor_name       VARCHAR(200),
  ADD COLUMN IF NOT EXISTS doctor_phone      VARCHAR(20);

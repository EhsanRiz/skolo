-- ============================================================
-- SKOLO — Migration 009
-- Waiver / discount fields on fee_ledger
-- ============================================================

ALTER TABLE public.fee_ledger
  ADD COLUMN IF NOT EXISTS amount_waived  NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS waiver_reason  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS waiver_note    TEXT,
  ADD COLUMN IF NOT EXISTS waived_by      UUID REFERENCES public.users(id) ON DELETE SET NULL;

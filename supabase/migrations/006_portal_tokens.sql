-- ============================================================
-- SKOLO — Migration 006
-- Parent portal tokens for guardians
-- ============================================================

-- Add portal_token to guardians
ALTER TABLE public.guardians ADD COLUMN IF NOT EXISTS portal_token VARCHAR(64);

-- Unique index on token
CREATE UNIQUE INDEX IF NOT EXISTS idx_guardians_portal_token
  ON public.guardians(portal_token)
  WHERE portal_token IS NOT NULL;

-- Generate tokens for existing guardians
UPDATE public.guardians
SET portal_token = encode(gen_random_bytes(24), 'hex')
WHERE portal_token IS NULL;

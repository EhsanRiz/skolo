-- ============================================================
-- SKOLO — Migration 011
-- Invite tokens for staff accounts
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS invite_token      VARCHAR(64),
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_set      BOOLEAN NOT NULL DEFAULT TRUE;

-- Existing users already have passwords set
UPDATE public.users SET password_set = TRUE WHERE password_set IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invite_token
  ON public.users(invite_token)
  WHERE invite_token IS NOT NULL;

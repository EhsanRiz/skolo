-- ═══════════════════════════════════════════════════════════
-- 018: School Invite Tokens (invite-only registration)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS school_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  token         TEXT NOT NULL UNIQUE,
  invited_by    UUID REFERENCES platform_admins(id),
  used          BOOLEAN DEFAULT FALSE,
  used_at       TIMESTAMPTZ,
  school_id     UUID REFERENCES schools(id),        -- set when the invitee registers
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Index for quick token lookup
CREATE INDEX idx_school_invites_token ON school_invites(token);
CREATE INDEX idx_school_invites_email ON school_invites(email);

-- RLS: super-admin bypasses via service role key, no public access
ALTER TABLE school_invites ENABLE ROW LEVEL SECURITY;

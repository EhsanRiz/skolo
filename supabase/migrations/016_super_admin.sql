-- ============================================================
-- SUPER-ADMIN TABLES  –  Platform-level management for 4DCS
-- ============================================================

-- 1. Platform admins  (Ehsan + future staff)
CREATE TABLE IF NOT EXISTS platform_admins (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT,
  password_hash TEXT NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Login log  –  every successful login
CREATE TABLE IF NOT EXISTS login_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  ip_address  TEXT,
  user_agent  TEXT,
  logged_in_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_logs_school   ON login_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_user     ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_time     ON login_logs(logged_in_at DESC);

-- 3. Activity log  –  feature usage tracking
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,        -- e.g. 'learner_created', 'fee_paid', 'attendance_saved', 'grade_entered'
  entity_type TEXT,                 -- e.g. 'learner', 'fee_ledger', 'attendance', 'exam_grade'
  entity_id   UUID,
  metadata    JSONB DEFAULT '{}',   -- extra context (amount, count, etc.)
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_school ON activity_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_time   ON activity_logs(created_at DESC);

-- RLS policies (service role bypasses, but good practice)
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs   ENABLE ROW LEVEL SECURITY;

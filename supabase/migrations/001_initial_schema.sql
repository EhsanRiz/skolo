-- ============================================================
-- SKOLO — Initial Schema Migration
-- Version: 001
-- Description: Full Phase 1 schema — multi-tenant, country-aware
-- ============================================================

-- ============================================================
-- REFERENCE TABLES (shared, not school-specific)
-- ============================================================

CREATE TABLE countries (
  id               SERIAL PRIMARY KEY,
  code             CHAR(2) NOT NULL UNIQUE,        -- 'LS' | 'ZA'
  name             VARCHAR(100) NOT NULL,
  currency_code    CHAR(3) NOT NULL,               -- 'LSL' | 'ZAR'
  currency_symbol  VARCHAR(5) NOT NULL,            -- 'M' | 'R'
  phone_prefix     VARCHAR(10) NOT NULL            -- '+266' | '+27'
);

CREATE TABLE regions (
  id          SERIAL PRIMARY KEY,
  country_id  INTEGER NOT NULL REFERENCES countries(id),
  name        VARCHAR(100) NOT NULL,
  level       VARCHAR(20) NOT NULL,               -- 'district' | 'province'
  parent_id   INTEGER REFERENCES regions(id)      -- NULL for top-level; used for SA province→district
);

-- ============================================================
-- SEED: Countries
-- ============================================================

INSERT INTO countries (code, name, currency_code, currency_symbol, phone_prefix) VALUES
  ('LS', 'Lesotho',      'LSL', 'M',  '+266'),
  ('ZA', 'South Africa', 'ZAR', 'R',  '+27');

-- ============================================================
-- SEED: Regions — Lesotho districts (flat, no parent)
-- ============================================================

INSERT INTO regions (country_id, name, level, parent_id) VALUES
  (1, 'Maseru',       'district', NULL),
  (1, 'Berea',        'district', NULL),
  (1, 'Leribe',       'district', NULL),
  (1, 'Butha-Buthe',  'district', NULL),
  (1, 'Thaba-Tseka',  'district', NULL),
  (1, 'Mokhotlong',   'district', NULL),
  (1, 'Qacha''s Nek', 'district', NULL),
  (1, 'Quthing',      'district', NULL),
  (1, 'Mohale''s Hoek','district', NULL),
  (1, 'Mafeteng',     'district', NULL);

-- ============================================================
-- SEED: Regions — South Africa provinces
-- ============================================================

INSERT INTO regions (country_id, name, level, parent_id) VALUES
  (2, 'Eastern Cape',    'province', NULL),
  (2, 'Free State',      'province', NULL),
  (2, 'Gauteng',         'province', NULL),
  (2, 'KwaZulu-Natal',   'province', NULL),
  (2, 'Limpopo',         'province', NULL),
  (2, 'Mpumalanga',      'province', NULL),
  (2, 'Northern Cape',   'province', NULL),
  (2, 'North West',      'province', NULL),
  (2, 'Western Cape',    'province', NULL);

-- ============================================================
-- TENANT ANCHOR
-- ============================================================

CREATE TABLE schools (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(200) NOT NULL,
  country_id            INTEGER NOT NULL REFERENCES countries(id),
  region_id             INTEGER NOT NULL REFERENCES regions(id),
  address               TEXT,
  phone                 VARCHAR(20),
  email                 VARCHAR(200),
  school_reg_number     VARCHAR(100),              -- EMIS number (ZA) or MoE ref (LS)
  subscription_status   VARCHAR(20) NOT NULL DEFAULT 'trial',  -- trial | active | suspended
  subscription_plan     VARCHAR(20) DEFAULT 'basic',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USERS (staff per school)
-- ============================================================

CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  full_name      VARCHAR(200) NOT NULL,
  email          VARCHAR(200) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           VARCHAR(20) NOT NULL DEFAULT 'bursar',  -- admin | bursar | principal
  phone          VARCHAR(20),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_school ON users(school_id);

-- ============================================================
-- ACADEMIC STRUCTURE
-- ============================================================

CREATE TABLE grades (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name           VARCHAR(50) NOT NULL,             -- 'Grade R', 'Grade 1' … 'Grade 12'
  display_order  SMALLINT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_grades_school ON grades(school_id);

CREATE TABLE classes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  grade_id      UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  name          VARCHAR(50) NOT NULL,              -- '6A', '6B'
  teacher_name  VARCHAR(200),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_classes_school ON classes(school_id);

-- ============================================================
-- LEARNERS AND GUARDIANS
-- ============================================================

CREATE TABLE learners (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id       UUID REFERENCES classes(id) ON DELETE SET NULL,
  first_name     VARCHAR(100) NOT NULL,
  last_name      VARCHAR(100) NOT NULL,
  date_of_birth  DATE,
  gender         VARCHAR(10),                      -- 'male' | 'female' | 'other'
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learners_school ON learners(school_id);
CREATE INDEX idx_learners_class  ON learners(class_id);

CREATE TABLE guardians (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  phone         VARCHAR(20) NOT NULL,
  email         VARCHAR(200),
  relationship  VARCHAR(50),                       -- 'mother' | 'father' | 'guardian'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guardians_school ON guardians(school_id);

CREATE TABLE learner_guardians (
  learner_id   UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  guardian_id  UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  is_primary   BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (learner_id, guardian_id)
);

-- ============================================================
-- FEE MANAGEMENT
-- ============================================================

CREATE TABLE fee_schedules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name         VARCHAR(200) NOT NULL,              -- 'Term 1 2026 Tuition'
  term         SMALLINT,                           -- 1 | 2 | 3 | 4
  year         SMALLINT NOT NULL,
  amount       NUMERIC(10,2) NOT NULL,
  due_date     DATE,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fee_schedules_school ON fee_schedules(school_id);

CREATE TABLE payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  learner_id       UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  fee_schedule_id  UUID REFERENCES fee_schedules(id) ON DELETE SET NULL,
  amount_paid      NUMERIC(10,2) NOT NULL,
  payment_date     DATE NOT NULL,
  payment_method   VARCHAR(20) NOT NULL DEFAULT 'cash',  -- cash | eft | other
  reference        VARCHAR(200),
  recorded_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_school   ON payments(school_id);
CREATE INDEX idx_payments_learner  ON payments(learner_id);

-- ============================================================
-- CALENDAR EVENTS
-- ============================================================

CREATE TABLE events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  event_date   DATE NOT NULL,
  end_date     DATE,
  event_type   VARCHAR(20) NOT NULL DEFAULT 'general',  -- academic | sports | meeting | holiday | general
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_school ON events(school_id);
CREATE INDEX idx_events_date   ON events(event_date);

-- ============================================================
-- COMMUNICATIONS
-- ============================================================

CREATE TABLE announcements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title        VARCHAR(200) NOT NULL,
  body         TEXT NOT NULL,
  target       VARCHAR(20) NOT NULL DEFAULT 'all',  -- all | grade | class
  target_id    UUID,                                 -- grade_id or class_id if targeted
  send_sms     BOOLEAN NOT NULL DEFAULT FALSE,
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_school ON announcements(school_id);

CREATE TABLE sms_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  recipient_phone VARCHAR(20) NOT NULL,
  message         TEXT NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | sent | failed
  provider_ref    VARCHAR(200),
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sms_log_school ON sms_log(school_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE schools        ENABLE ROW LEVEL SECURITY;
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades         ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE learners       ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians      ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_schedules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_log        ENABLE ROW LEVEL SECURITY;

-- NOTE: RLS policies will be added in migration 002
-- after auth strategy is confirmed (JWT custom claims).
-- Backend service role key bypasses RLS for all server-side ops.

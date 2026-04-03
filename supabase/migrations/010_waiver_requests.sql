-- ============================================================
-- SKOLO — Migration 010
-- Waiver requests + notifications
-- ============================================================

-- ─── WAIVER REQUESTS ─────────────────────────────────────────
CREATE TABLE public.waiver_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  ledger_id       UUID NOT NULL REFERENCES public.fee_ledger(id) ON DELETE CASCADE,
  learner_id      UUID NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  amount_requested NUMERIC(10,2) NOT NULL,
  reason          VARCHAR(200) NOT NULL,
  note            TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- pending | approved | rejected
  requested_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  review_note     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_waiver_requests_school  ON public.waiver_requests(school_id);
CREATE INDEX idx_waiver_requests_status  ON public.waiver_requests(status);
CREATE INDEX idx_waiver_requests_ledger  ON public.waiver_requests(ledger_id);

ALTER TABLE public.waiver_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON public.waiver_requests FOR ALL USING (true) WITH CHECK (true);

-- ─── NOTIFICATIONS ────────────────────────────────────────────
CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  -- waiver_request | waiver_approved | waiver_rejected
  title       VARCHAR(200) NOT NULL,
  body        TEXT,
  link        VARCHAR(300),   -- frontend route e.g. /fees or /waivers
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user    ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread  ON public.notifications(user_id, is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- ─── Remove direct waiver columns from fee_ledger ─────────────
-- (waivers now go through waiver_requests → approved → applied)
-- Keep amount_waived etc for the actual applied state

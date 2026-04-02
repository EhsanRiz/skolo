-- ============================================================
-- SKOLO — Migration 002
-- Description: RLS policies — service role bypass + basic access
-- ============================================================

-- For now, allow all operations via service role (backend uses service key)
-- These will be tightened in migration 003 with proper JWT claim policies

-- schools
CREATE POLICY "service_role_all" ON schools FOR ALL USING (true) WITH CHECK (true);

-- users
CREATE POLICY "service_role_all" ON users FOR ALL USING (true) WITH CHECK (true);

-- grades
CREATE POLICY "service_role_all" ON grades FOR ALL USING (true) WITH CHECK (true);

-- classes
CREATE POLICY "service_role_all" ON classes FOR ALL USING (true) WITH CHECK (true);

-- learners
CREATE POLICY "service_role_all" ON learners FOR ALL USING (true) WITH CHECK (true);

-- guardians
CREATE POLICY "service_role_all" ON guardians FOR ALL USING (true) WITH CHECK (true);

-- learner_guardians
CREATE POLICY "service_role_all" ON learner_guardians FOR ALL USING (true) WITH CHECK (true);

-- fee_schedules
CREATE POLICY "service_role_all" ON fee_schedules FOR ALL USING (true) WITH CHECK (true);

-- payments
CREATE POLICY "service_role_all" ON payments FOR ALL USING (true) WITH CHECK (true);

-- events
CREATE POLICY "service_role_all" ON events FOR ALL USING (true) WITH CHECK (true);

-- announcements
CREATE POLICY "service_role_all" ON announcements FOR ALL USING (true) WITH CHECK (true);

-- sms_log
CREATE POLICY "service_role_all" ON sms_log FOR ALL USING (true) WITH CHECK (true);

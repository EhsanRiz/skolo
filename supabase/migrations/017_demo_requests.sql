-- Demo request form submissions
CREATE TABLE IF NOT EXISTS demo_requests (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  school_name TEXT NOT NULL,
  country     TEXT,
  message     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON demo_requests FOR ALL USING (true) WITH CHECK (true);

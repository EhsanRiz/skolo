-- 016_timetable.sql
-- Timetable system: school defines periods, assigns teacher-classes to day/period slots

-- Store period structure per school (e.g. [{number:1, label:"Period 1", start:"07:30", end:"08:15"}, ...])
ALTER TABLE schools ADD COLUMN IF NOT EXISTS periods JSONB DEFAULT '[]';

-- Timetable slots: which teacher-class happens on which day/period
CREATE TABLE IF NOT EXISTS timetable (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_class_id UUID NOT NULL REFERENCES teacher_classes(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),  -- 1=Monday, 5=Friday
  period_number SMALLINT NOT NULL CHECK (period_number >= 1),
  room TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- A specific teacher-class can only appear once per day/period
  UNIQUE(school_id, teacher_class_id, day_of_week, period_number)
);

-- Index for fast teacher lookups (dashboard "my timetable")
CREATE INDEX IF NOT EXISTS idx_timetable_school ON timetable(school_id);
CREATE INDEX IF NOT EXISTS idx_timetable_tc ON timetable(teacher_class_id);

-- RLS (service role key bypasses, but good practice)
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
CREATE POLICY timetable_school_policy ON timetable
  FOR ALL USING (school_id = school_id);

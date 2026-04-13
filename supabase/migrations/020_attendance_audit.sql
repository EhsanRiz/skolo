-- Add marked_by_role column to attendance for audit trail
-- Tracks whether attendance was saved by teacher, admin, or principal
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS marked_by_role TEXT DEFAULT NULL;

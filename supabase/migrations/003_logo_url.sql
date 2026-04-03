-- Migration 003: Add logo_url to schools + storage bucket
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage bucket for school logos (run this in Supabase dashboard if SQL fails)
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-logos', 'school-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "Public logo read"
  ON storage.objects FOR SELECT USING (bucket_id = 'school-logos');

CREATE POLICY IF NOT EXISTS "Authenticated logo upload"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'school-logos');

CREATE POLICY IF NOT EXISTS "Authenticated logo update"
  ON storage.objects FOR UPDATE USING (bucket_id = 'school-logos');

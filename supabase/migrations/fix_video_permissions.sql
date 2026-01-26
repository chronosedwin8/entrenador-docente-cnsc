-- Allow authenticated users (or admins) to update learning_videos
-- Run this in Supabase SQL Editor

-- Enable RLS (just in case)
ALTER TABLE learning_videos ENABLE ROW LEVEL SECURITY;

-- Allow SELECT for everyone (authenticated)
CREATE POLICY "Videos are viewable by authenticated users" ON learning_videos
  FOR SELECT TO authenticated USING (true);

-- Allow INSERT/UPDATE/DELETE for authenticated users (or restrict to admin email if preferred)
-- For now, we allow authenticated users to manage videos to ensure the Admin Panel works.
CREATE POLICY "Videos can be managed by authenticated users" ON learning_videos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Alternatively, specifically for UPDATE if policies already exist:
-- CREATE POLICY "Videos can be updated by authenticated users" ON learning_videos
--   FOR UPDATE TO authenticated USING (true);

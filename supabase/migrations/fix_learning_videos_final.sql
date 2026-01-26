-- =================================================================
-- FIX: REPAIR PERMISSIONS FOR LEARNING_VIDEOS (MATH VIDEOS)
-- Run this in Supabase SQL Editor to fix the reordering issue.
-- =================================================================

-- 1. Ensure RLS is enabled
ALTER TABLE learning_videos ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential conflicting policies (clean slate)
DROP POLICY IF EXISTS "Videos are viewable by authenticated users" ON learning_videos;
DROP POLICY IF EXISTS "Videos can be managed by authenticated users" ON learning_videos;
DROP POLICY IF EXISTS "Videos are public" ON learning_videos;
DROP POLICY IF EXISTS "Public videos are viewable by everyone" ON learning_videos;
DROP POLICY IF EXISTS "Enable read access for all users" ON learning_videos;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON learning_videos;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON learning_videos;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON learning_videos;

-- 3. Re-create correct policies

-- Policy: Everyone (authenticated) can SEE the videos
CREATE POLICY "Enable read access for authenticated users" ON learning_videos
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can INSERT, UPDATE, DELETE videos
-- (This fixes the reordering issue which requires UPDATE permission)
CREATE POLICY "Enable full access for authenticated users" ON learning_videos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Verify/Add display_order column just in case
ALTER TABLE learning_videos ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- 5. Force update existing null orders to ensure sort works
WITH ordered_videos AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
  FROM learning_videos
  WHERE display_order IS NULL
)
UPDATE learning_videos lv
SET display_order = ov.row_num
FROM ordered_videos ov
WHERE lv.id = ov.id;

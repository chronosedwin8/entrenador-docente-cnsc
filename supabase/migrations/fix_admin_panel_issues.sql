-- ============================================
-- MIGRATION: Fix Admin Panel Issues
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- ============================================
-- ISSUE 1: Add email column to profiles and sync from auth.users
-- ============================================

-- Add email column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Sync existing emails from auth.users to profiles
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- Create a trigger to automatically sync email on profile insert/auth changes
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET email = (SELECT email FROM auth.users WHERE id = NEW.id)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_profile_email_sync ON profiles;
CREATE TRIGGER on_profile_email_sync
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_email();

-- ============================================
-- ISSUE 2: Add display_order to learning_videos
-- ============================================

-- Add display_order column to learning_videos
ALTER TABLE learning_videos ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Update existing videos with sequential order
WITH ordered_videos AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
  FROM learning_videos
)
UPDATE learning_videos lv
SET display_order = ov.row_num
FROM ordered_videos ov
WHERE lv.id = ov.id;

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_learning_videos_display_order ON learning_videos(display_order);

-- ============================================
-- ISSUE 3: Create help_videos table
-- ============================================

-- Create help_videos table if it doesn't exist
CREATE TABLE IF NOT EXISTS help_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  youtube_id VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(20) NOT NULL DEFAULT 'tutorial' CHECK (category IN ('tutorial', 'faq', 'feature')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE help_videos ENABLE ROW LEVEL SECURITY;

-- Policies for help_videos
DROP POLICY IF EXISTS "Help videos are viewable by authenticated users" ON help_videos;
CREATE POLICY "Help videos are viewable by authenticated users" ON help_videos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Help videos can be inserted" ON help_videos;
CREATE POLICY "Help videos can be inserted" ON help_videos
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Help videos can be updated" ON help_videos;
CREATE POLICY "Help videos can be updated" ON help_videos
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Help videos can be deleted" ON help_videos;
CREATE POLICY "Help videos can be deleted" ON help_videos
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_help_videos_display_order ON help_videos(display_order);

-- ============================================
-- VERIFICATION: Check the changes worked
-- ============================================
-- Run this after the migration to verify:
-- SELECT id, name, email FROM profiles LIMIT 10;
-- SELECT id, title, display_order FROM learning_videos ORDER BY display_order;

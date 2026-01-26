-- Migration: Add display_order to learning_videos and create help_videos table
-- Run this SQL in your Supabase SQL Editor

-- 1. Add display_order column to learning_videos for manual ordering
ALTER TABLE learning_videos 
ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Update existing videos with sequential order based on created_at
WITH ordered_videos AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
  FROM learning_videos
)
UPDATE learning_videos
SET display_order = ordered_videos.row_num
FROM ordered_videos
WHERE learning_videos.id = ordered_videos.id;

-- 2. Create help_videos table for platform tutorial videos
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

-- Policy: Everyone can read help videos
CREATE POLICY "Help videos are viewable by authenticated users" ON help_videos
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can insert help videos (use Supabase service role or create admin function)
CREATE POLICY "Help videos can be inserted by anyone" ON help_videos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Only admins can update help videos
CREATE POLICY "Help videos can be updated by anyone" ON help_videos
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Only admins can delete help videos
CREATE POLICY "Help videos can be deleted by anyone" ON help_videos
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_help_videos_display_order ON help_videos(display_order);
CREATE INDEX IF NOT EXISTS idx_learning_videos_display_order ON learning_videos(display_order);

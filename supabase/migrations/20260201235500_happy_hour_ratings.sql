-- Add rating and time windows to happy_hours table
-- Created: 2026-02-01

ALTER TABLE happy_hours 
ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS start_time TEXT,
ADD COLUMN IF NOT EXISTS end_time TEXT;

-- Add index for rating and time filtering
CREATE INDEX IF NOT EXISTS idx_happy_hours_rating ON happy_hours(rating);

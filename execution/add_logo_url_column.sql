-- Add logo_url column to restaurants table
-- Run this in your Supabase SQL Editor

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Optional: Add a comment explaining the column
COMMENT ON COLUMN restaurants.logo_url IS 'URL to the restaurant logo/favicon extracted from web search';

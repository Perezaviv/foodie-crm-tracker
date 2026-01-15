-- Comments Table for Restaurant Reviews
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Comment policies
CREATE POLICY "Anyone can view comments"
    ON comments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert comments"
    ON comments FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can delete their own comments"
    ON comments FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_comments_restaurant_id ON comments(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

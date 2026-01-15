-- Service Role Bypass for Comments Table
-- Run this in Supabase SQL Editor if comments fail with RLS errors
-- This enables both anon users (web UI without auth) and service role (Telegram bot) to insert comments

-- Allow anon users to insert comments (for Telegram bot via fallback and web UI)
CREATE POLICY "Allow anon inserts to comments"
ON comments
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon users to read comments
CREATE POLICY "Allow anon select comments"
ON comments
FOR SELECT
TO anon
USING (true);

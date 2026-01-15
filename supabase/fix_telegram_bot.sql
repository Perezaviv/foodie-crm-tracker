-- Fix Telegram Bot Permissions and Schema

-- 1. Ensure telegram_sessions table exists (idempotent)
CREATE TABLE IF NOT EXISTS telegram_sessions (
    chat_id BIGINT PRIMARY KEY,
    step TEXT NOT NULL DEFAULT 'IDLE',
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS on telegram_sessions
ALTER TABLE telegram_sessions ENABLE ROW LEVEL SECURITY;

-- 3. CRITICAL: Allow Service Role full access to telegram_sessions
DROP POLICY IF EXISTS "Service role can do everything on telegram_sessions" ON telegram_sessions;
CREATE POLICY "Service role can do everything on telegram_sessions"
    ON telegram_sessions
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 4. CRITICAL: Allow Service Role full access to comments
-- The bot inserts comments with 'Telegram User' as author_name and NULL created_by
DROP POLICY IF EXISTS "Service role can do everything on comments" ON comments;
CREATE POLICY "Service role can do everything on comments"
    ON comments
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 5. CRITICAL: Allow Service Role full access to photos
-- The bot inserts photos with restaurant_id and storage_path
DROP POLICY IF EXISTS "Service role can do everything on photos" ON photos;
CREATE POLICY "Service role can do everything on photos"
    ON photos
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 6. Ensure Storage Bucket RLS for photos
-- This is often handled via the Storage UI, but good to ensure strict RLS doesn't block upload if we use service key.
-- Note: Storage policies are on storage.objects.
-- This part is usually manual or requires specific storage SQL, skipping for now to focus on Table RLS.
-- The service_role key inherently bypasses Storage RLS if used correctly in the client.

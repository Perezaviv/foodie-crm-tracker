-- Ensure the update function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a table to manage Telegram user sessions
CREATE TABLE IF NOT EXISTS telegram_sessions (
    chat_id BIGINT PRIMARY KEY,
    step TEXT NOT NULL DEFAULT 'IDLE', -- 'IDLE', 'SELECTING_RESTAURANT', 'WAITING_FOR_PHOTOS', 'REVIEWING_PHOTOS'
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE telegram_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role (bot) full access
DROP POLICY IF EXISTS "Service role can do everything on telegram_sessions" ON telegram_sessions;
CREATE POLICY "Service role can do everything on telegram_sessions"
    ON telegram_sessions
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Function to auto-update updated_at
DROP TRIGGER IF EXISTS update_telegram_sessions_updated_at ON telegram_sessions;
CREATE TRIGGER update_telegram_sessions_updated_at
    BEFORE UPDATE ON telegram_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

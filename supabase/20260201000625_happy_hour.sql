-- Happy Hour Table
-- Created: 2026-02-01

CREATE TABLE IF NOT EXISTS happy_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    hh_times TEXT,
    hh_drinks TEXT,
    hh_food TEXT,
    source_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE happy_hours ENABLE ROW LEVEL SECURITY;

-- Policies
-- For now, allow public read if we want a public map, or authenticated if private.
-- Given the CRM nature, maybe authenticated is better, but happy hours are usually public info.
CREATE POLICY "Public can view happy hours"
    ON happy_hours FOR SELECT
    USING (true);

-- Allow system to insert/update (using service role or bypass RLS)
-- Since we are seeding from a script, we might need a policy or use service role.

-- Trigger for updated_at
CREATE TRIGGER update_happy_hours_updated_at
    BEFORE UPDATE ON happy_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_happy_hours_name ON happy_hours(name);

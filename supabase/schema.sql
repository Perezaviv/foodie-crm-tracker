-- Foodie CRM Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE (extends Supabase Auth)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- =====================================================
-- RESTAURANTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    cuisine TEXT,
    city TEXT,
    address TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    booking_link TEXT,
    social_link TEXT,
    notes TEXT,
    is_visited BOOLEAN DEFAULT FALSE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Restaurant policies (shared between users for now - can be refined later)
CREATE POLICY "Authenticated users can view all restaurants"
    ON restaurants FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert restaurants"
    ON restaurants FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update restaurants they created"
    ON restaurants FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by);

CREATE POLICY "Users can delete restaurants they created"
    ON restaurants FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by);

-- =====================================================
-- PHOTOS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    caption TEXT,
    taken_at TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Photo policies
CREATE POLICY "Authenticated users can view all photos"
    ON photos FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert photos"
    ON photos FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete photos they uploaded"
    ON photos FOR DELETE
    TO authenticated
    USING (auth.uid() = uploaded_by);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants(city);
CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine ON restaurants(cuisine);
CREATE INDEX IF NOT EXISTS idx_restaurants_created_by ON restaurants(created_by);
CREATE INDEX IF NOT EXISTS idx_photos_restaurant_id ON photos(restaurant_id);

-- =====================================================
-- TRIGGER: Auto-update updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at
    BEFORE UPDATE ON restaurants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGER: Auto-create profile on user signup
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

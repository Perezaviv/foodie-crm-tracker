-- BYPASS RLS FOR PHOTOS (Development Mode)
-- Run this in your Supabase SQL Editor to allow uploading photos without logging in (Anon)

-- 1. Allow Annonymous Inserts to 'photos' table
CREATE POLICY "Allow anon inserts to photos"
ON photos
FOR INSERT
TO anon
WITH CHECK (true);

-- 2. Allow Annonymous Inserts to 'storage.objects' (for file upload)
-- Note: You might need to adjust the bucket name if it's not 'photos'
-- This policy allows anon users to upload to the 'photos' bucket
CREATE POLICY "Allow anon uploads to photos bucket"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK ( bucket_id = 'photos' );

-- 3. Allow Anon Selects (Viewing)
CREATE POLICY "Allow anon select photos"
ON photos
FOR SELECT
TO anon
USING (true);

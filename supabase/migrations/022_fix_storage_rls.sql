-- Fix Storage RLS Policies
-- Run this in Supabase SQL Editor if image uploads fail with RLS error

-- Drop all existing storage policies for sponsors bucket
DROP POLICY IF EXISTS "Public read access for sponsor logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload sponsor logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update sponsor logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete sponsor logos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Public read (anyone can view images)
CREATE POLICY "Public read access for sponsor logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'sponsors');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload sponsor logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sponsors'
  AND (select auth.uid()) IS NOT NULL
);

-- Authenticated users can update their uploads
CREATE POLICY "Authenticated users can update sponsor logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'sponsors')
WITH CHECK (bucket_id = 'sponsors');

-- Authenticated users can delete
CREATE POLICY "Authenticated users can delete sponsor logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'sponsors');

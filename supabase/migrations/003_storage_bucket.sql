-- =============================================
-- Storage Bucket for Sponsor Logos
-- =============================================

-- Create the storage bucket for sponsor logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sponsors',
  'sponsors',
  true,  -- Public bucket so logos can be displayed
  5242880,  -- 5MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to sponsor logos
CREATE POLICY "Public read access for sponsor logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'sponsors');

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload sponsor logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sponsors');

-- Allow authenticated users to update logos
CREATE POLICY "Authenticated users can update sponsor logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'sponsors');

-- Allow authenticated users to delete logos
CREATE POLICY "Authenticated users can delete sponsor logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'sponsors');



/*
# Kubata Kié — Storage Bucket for Property Images

## Overview
Creates the property-images storage bucket and sets up storage policies
for public read, authenticated upload/update/delete by property owners/agents/admins.

## Storage
- Bucket: property-images (public read)
- Path structure: {user_id}/{property_id}/{uuid}.{extension}
- Allowed MIME types: image/jpeg, image/png, image/webp
- Max file size: 10MB (enforced in frontend + edge function)

## Policies
- SELECT: public (anyone can view property images)
- INSERT: authenticated users can upload to their own path
- UPDATE: authenticated users can update their own files
- DELETE: authenticated users can delete their own files
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read for property images
DROP POLICY IF EXISTS "property_images_storage_select_public" ON storage.objects;
CREATE POLICY "property_images_storage_select_public" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'property-images');

-- Authenticated users can upload (path starts with their user_id)
DROP POLICY IF EXISTS "property_images_storage_insert_own" ON storage.objects;
CREATE POLICY "property_images_storage_insert_own" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'property-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can update their own files
DROP POLICY IF EXISTS "property_images_storage_update_own" ON storage.objects;
CREATE POLICY "property_images_storage_update_own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'property-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'property-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can delete their own files
DROP POLICY IF EXISTS "property_images_storage_delete_own" ON storage.objects;
CREATE POLICY "property_images_storage_delete_own" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'property-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

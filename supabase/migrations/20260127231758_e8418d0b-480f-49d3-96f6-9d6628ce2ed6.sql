-- Fix storage policies for registration flow - cleanup existing policies first
DROP POLICY IF EXISTS "Authenticated users can upload proof files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all proofs" ON storage.objects;

-- Recreate policies
CREATE POLICY "Authenticated users can upload proof files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'proofs' AND
  public.has_role(auth.uid(), 'admin')
);
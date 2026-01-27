-- Fix the infinite recursion in profiles RLS policies
-- The issue is that "Approved users can view approved profiles" policy 
-- queries the profiles table from within a profiles policy

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Approved users can view approved profiles" ON public.profiles;

-- Create a proper policy using the is_approved function (which is SECURITY DEFINER)
CREATE POLICY "Approved users can view approved profiles"
ON public.profiles
FOR SELECT
USING (
  public.is_approved(auth.uid()) AND status = 'approved'
);

-- Add DELETE policy for admins
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Fix storage bucket - make it private
UPDATE storage.buckets SET public = false WHERE id = 'proofs';

-- Drop existing permissive storage policies
DROP POLICY IF EXISTS "Anyone can upload proof files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view proof files" ON storage.objects;

-- Create proper storage policies for authenticated users
CREATE POLICY "Users can upload their own proof files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own proofs
CREATE POLICY "Users can view their own proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to view all proofs
CREATE POLICY "Admins can view all proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'proofs' AND
  public.has_role(auth.uid(), 'admin')
);

-- Add database constraints for input validation
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS username_length;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS justification_length;

ALTER TABLE public.profiles 
  ADD CONSTRAINT username_length CHECK (length(username) BETWEEN 3 AND 50),
  ADD CONSTRAINT justification_length CHECK (length(justification) BETWEEN 10 AND 2000);
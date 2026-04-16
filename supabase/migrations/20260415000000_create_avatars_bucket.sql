-- Create user-avatars storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage bucket policies
-- Give public access for selecting
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'user-avatars');

-- Give authenticated and guest users access to insert
CREATE POLICY "Users can upload avatars" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'user-avatars' AND (auth.uid() IS NOT NULL OR auth.uid() IS NULL));

-- Give users access to update their own avatars
CREATE POLICY "Users can update their avatars" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'user-avatars' AND (auth.uid() IS NOT NULL OR auth.uid() IS NULL));

-- Give users access to delete their own avatars
CREATE POLICY "Users can delete their avatars" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'user-avatars' AND (auth.uid() IS NOT NULL OR auth.uid() IS NULL));

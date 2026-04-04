
DROP POLICY IF EXISTS "Users can create challenges" ON public.challenges;
CREATE POLICY "Users can create own challenges" ON public.challenges FOR INSERT TO public WITH CHECK (
  (auth.uid() IS NOT NULL AND created_by = auth.uid()::text) OR (auth.uid() IS NULL AND created_by IS NOT NULL)
);

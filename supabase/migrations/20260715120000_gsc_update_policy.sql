CREATE POLICY "Users can update gsc tokens." ON public.gsc_tokens FOR UPDATE USING (auth.uid() = user_id);

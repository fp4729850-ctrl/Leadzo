-- Add UNIQUE constraint to gsc_tokens.user_id if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'gsc_tokens_user_id_key'
    ) THEN
        ALTER TABLE public.gsc_tokens ADD CONSTRAINT gsc_tokens_user_id_key UNIQUE (user_id);
    END IF;
END $$;

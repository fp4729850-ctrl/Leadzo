-- Add api_keys JSONB column to ranking_sites
ALTER TABLE public.ranking_sites ADD COLUMN IF NOT EXISTS api_keys JSONB DEFAULT '{}'::jsonb;

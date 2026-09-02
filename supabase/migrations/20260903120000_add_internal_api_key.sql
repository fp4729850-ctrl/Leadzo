-- Add internal_api_key for Leadzo Internal API
ALTER TABLE public.business_knowledge
ADD COLUMN IF NOT EXISTS internal_api_key UUID DEFAULT gen_random_uuid();

-- Create an index to quickly look up business by API key
CREATE INDEX IF NOT EXISTS idx_business_internal_api_key ON public.business_knowledge (internal_api_key);

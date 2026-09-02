-- Add custom API keys for integrations
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS meta_ads_api_key TEXT,
ADD COLUMN IF NOT EXISTS razorpay_api_key TEXT,
ADD COLUMN IF NOT EXISTS gsc_api_key TEXT,
ADD COLUMN IF NOT EXISTS zendesk_api_key TEXT;

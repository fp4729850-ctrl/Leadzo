-- Supabase Migration: 20260805120000_create_token_rates.sql
-- Implements the token rate configuration table for feature-specific consumption rates.

-- 1. Create Token Rates Table
CREATE TABLE IF NOT EXISTS public.token_rates (
  action_type TEXT PRIMARY KEY,
  token_cost INTEGER NOT NULL DEFAULT 1 CHECK (token_cost >= 0),
  display_name TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.token_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view token rates"
  ON public.token_rates FOR SELECT
  USING (true);

-- 2. Populate default rate cards
INSERT INTO public.token_rates (action_type, token_cost, display_name)
VALUES
  ('whatsapp_message', 1, 'WhatsApp Message Sent'),
  ('voice_call_minute', 5, 'AI Voice Call (per minute)'),
  ('email_message', 1, 'Email Message Sent'),
  ('seo_article', 10, 'AI SEO Article Published'),
  ('scraped_lead', 1, 'Scraped Lead Exported')
ON CONFLICT (action_type) DO UPDATE
SET token_cost = EXCLUDED.token_cost, display_name = EXCLUDED.display_name, updated_at = NOW();

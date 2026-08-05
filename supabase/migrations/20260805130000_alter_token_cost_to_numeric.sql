-- Supabase Migration: 20260805130000_alter_token_cost_to_numeric.sql
-- Alters token fields to NUMERIC to support fractional tokens (e.g. 0.4 tokens per Green API message).

-- 1. Alter token_rates token_cost to NUMERIC
ALTER TABLE public.token_rates 
  ALTER COLUMN token_cost TYPE NUMERIC(10, 2);

-- 2. Alter token_balances balance to NUMERIC
ALTER TABLE public.token_balances 
  ALTER COLUMN balance TYPE NUMERIC(10, 2);

-- 3. Alter token_transactions amount to NUMERIC
ALTER TABLE public.token_transactions 
  ALTER COLUMN amount TYPE NUMERIC(10, 2);

-- 4. Insert or update the Green API rate card
INSERT INTO public.token_rates (action_type, token_cost, display_name)
VALUES ('green_api_message', 0.40, 'Green API Message Sent')
ON CONFLICT (action_type) DO UPDATE
SET token_cost = EXCLUDED.token_cost, display_name = EXCLUDED.display_name, updated_at = NOW();

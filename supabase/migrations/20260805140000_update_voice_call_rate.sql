-- Supabase Migration: 20260805140000_update_voice_call_rate.sql
-- Updates the AI Voice Call token rate to 12 tokens per minute.

UPDATE public.token_rates
SET token_cost = 12.00
WHERE action_type = 'voice_call_minute';

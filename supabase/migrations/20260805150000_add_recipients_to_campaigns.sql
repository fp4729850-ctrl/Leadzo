-- Supabase Migration: 20260805150000_add_recipients_to_campaigns.sql
-- Adds total_recipients and sent_count to the campaigns table for unified campaign tracking.

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0;

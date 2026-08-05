-- Supabase Migration: 20260805170000_add_type_to_call_reminders.sql
-- Adds reminder_type column to call_reminders table to support calls, WhatsApp, or both options.

ALTER TABLE public.call_reminders
  ADD COLUMN IF NOT EXISTS reminder_type TEXT DEFAULT 'call' CHECK (reminder_type IN ('call', 'whatsapp', 'both'));

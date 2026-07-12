-- Migration: Add WhatsApp billing fields to users table

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS whatsapp_api_token TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_phone_id TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_business_account_id TEXT,
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;

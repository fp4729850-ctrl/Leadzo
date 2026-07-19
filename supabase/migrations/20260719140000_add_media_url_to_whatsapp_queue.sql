-- Add media_url column to whatsapp_queue
ALTER TABLE public.whatsapp_queue ADD COLUMN IF NOT EXISTS media_url TEXT DEFAULT NULL;

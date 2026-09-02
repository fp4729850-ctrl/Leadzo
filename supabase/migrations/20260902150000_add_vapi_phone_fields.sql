ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.business_knowledge ADD COLUMN IF NOT EXISTS vapi_phone_id TEXT;

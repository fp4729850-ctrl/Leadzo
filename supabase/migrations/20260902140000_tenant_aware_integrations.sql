-- Add business_id to custom_integrations for multi-tenant support
ALTER TABLE public.custom_integrations
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.business_knowledge(id) ON DELETE CASCADE;

-- If there are any existing integrations, we could potentially set them to a default, but since this is early, it's fine.

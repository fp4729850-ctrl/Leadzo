ALTER TABLE public.rcs_messages 
ADD COLUMN IF NOT EXISTS direction VARCHAR(50) DEFAULT 'outbound',
ADD COLUMN IF NOT EXISTS text_content TEXT;

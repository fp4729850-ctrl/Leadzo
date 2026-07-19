-- Create whatsapp_queue table
CREATE TABLE IF NOT EXISTS public.whatsapp_queue (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed'))
);

-- Enable RLS
ALTER TABLE public.whatsapp_queue ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert own queue items"
    ON public.whatsapp_queue FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own queue items"
    ON public.whatsapp_queue FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own queue items"
    ON public.whatsapp_queue FOR UPDATE
    USING (auth.uid() = user_id);

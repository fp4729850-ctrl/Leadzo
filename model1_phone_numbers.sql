-- Create the user_phone_numbers table
CREATE TABLE IF NOT EXISTS public.user_phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    vapi_phone_number_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own phone numbers" 
ON public.user_phone_numbers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own phone numbers" 
ON public.user_phone_numbers 
FOR UPDATE 
USING (auth.uid() = user_id);

-- For MVP we will allow users to insert their own
CREATE POLICY "Users can insert their own phone numbers" 
ON public.user_phone_numbers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own phone numbers" 
ON public.user_phone_numbers 
FOR DELETE 
USING (auth.uid() = user_id);

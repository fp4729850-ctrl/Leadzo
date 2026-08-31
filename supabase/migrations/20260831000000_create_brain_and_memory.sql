-- Migration to create Single Brain Knowledge Base and Centralized Customer Memory tables

CREATE TABLE IF NOT EXISTS public.business_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    business_details TEXT NOT NULL,
    website_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Only one knowledge base per user for the "Single Brain"
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_business_knowledge ON public.business_knowledge (user_id);

CREATE TABLE IF NOT EXISTS public.customer_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL, -- Email, Phone number, or social handle
    channel TEXT NOT NULL, -- 'whatsapp', 'email', 'reddit', 'voice'
    role TEXT NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_memory_lookup ON public.customer_memory (user_id, customer_id);

-- Enable RLS
ALTER TABLE public.business_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_memory ENABLE ROW LEVEL SECURITY;

-- Policies for business_knowledge
CREATE POLICY "Users can view their own knowledge base" 
ON public.business_knowledge FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own knowledge base" 
ON public.business_knowledge FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge base" 
ON public.business_knowledge FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own knowledge base" 
ON public.business_knowledge FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for customer_memory
CREATE POLICY "Users can view their own customer memory" 
ON public.customer_memory FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customer memory" 
ON public.customer_memory FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customer memory" 
ON public.customer_memory FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customer memory" 
ON public.customer_memory FOR DELETE 
USING (auth.uid() = user_id);

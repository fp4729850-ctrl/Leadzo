-- Create blogs table
CREATE TABLE IF NOT EXISTS public.blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    html_content TEXT NOT NULL,
    seo_description TEXT,
    author TEXT DEFAULT 'Leadzo AI',
    published BOOLEAN DEFAULT true,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read published blogs
CREATE POLICY "Public can read published blogs"
ON public.blogs
FOR SELECT
TO public
USING (published = true);

-- Allow service role to do everything
CREATE POLICY "Service role can manage blogs"
ON public.blogs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

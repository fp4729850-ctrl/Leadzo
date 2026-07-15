-- Create Autopilot Settings Table
CREATE TABLE IF NOT EXISTS public.seo_autopilot_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    niche TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    publish_plan JSONB DEFAULT '[]'::jsonb,
    last_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id) -- One autopilot setting per user for simplicity
);

-- Enable RLS
ALTER TABLE public.seo_autopilot_settings ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own settings
CREATE POLICY "Users can manage their own autopilot settings"
ON public.seo_autopilot_settings
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow service role to do everything (for the cron worker)
CREATE POLICY "Service role can manage autopilot settings"
ON public.seo_autopilot_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

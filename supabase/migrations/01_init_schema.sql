-- Initial Supabase Schema for Leadzo
-- Inferred from frontend usage

-- Users table (extends Supabase auth.users if needed, or acts as a separate profile table)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'new',
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- e.g., 'whatsapp', 'email', 'social'
  status TEXT DEFAULT 'draft',
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Launched Campaigns table
CREATE TABLE public.launched_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  budget DECIMAL(10,2),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Learning Agent Data table
CREATE TABLE public.learning_agent_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  metric_name TEXT,
  metric_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Setup Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launched_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_agent_data ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view their own profile." ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own leads." ON public.leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own leads." ON public.leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own leads." ON public.leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own leads." ON public.leads FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own campaigns." ON public.campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own campaigns." ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own campaigns." ON public.campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own campaigns." ON public.campaigns FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own launched campaigns." ON public.launched_campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own launched campaigns." ON public.launched_campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own launched campaigns." ON public.launched_campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own launched campaigns." ON public.launched_campaigns FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own learning agent data." ON public.learning_agent_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own learning agent data." ON public.learning_agent_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own learning agent data." ON public.learning_agent_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own learning agent data." ON public.learning_agent_data FOR DELETE USING (auth.uid() = user_id);

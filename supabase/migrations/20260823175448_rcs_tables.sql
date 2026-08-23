-- 1. Create RCS Agents Table
CREATE TABLE IF NOT EXISTS public.rcs_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'google_rbm',
  status TEXT NOT NULL DEFAULT 'PENDING',
  brand_logo TEXT,
  brand_description TEXT,
  privacy_policy_url TEXT,
  terms_url TEXT,
  support_email TEXT,
  support_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. Create RCS Contacts Table
CREATE TABLE IF NOT EXISTS public.rcs_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.rcs_agents(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  name TEXT,
  tags TEXT[],
  is_opted_out BOOLEAN DEFAULT FALSE,
  opt_out_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  last_messaged_at TIMESTAMPTZ,
  UNIQUE(user_id, phone_number)
);

-- 3. Create RCS Campaigns Table
CREATE TABLE IF NOT EXISTS public.rcs_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.rcs_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  message_type TEXT NOT NULL DEFAULT 'text',
  content JSONB NOT NULL,
  total_contacts INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  read_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 4. Create RCS Templates Table
CREATE TABLE IF NOT EXISTS public.rcs_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.rcs_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'rich_card',
  content JSONB NOT NULL,
  provider_template_id TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 5. Create RCS Messages Table
CREATE TABLE IF NOT EXISTS public.rcs_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.rcs_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.rcs_contacts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Add RLS Policies
ALTER TABLE public.rcs_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own agents" ON public.rcs_agents FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.rcs_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own contacts" ON public.rcs_contacts FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.rcs_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own campaigns" ON public.rcs_campaigns FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.rcs_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own templates" ON public.rcs_templates FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.rcs_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own messages" ON public.rcs_messages FOR ALL USING (auth.uid() = user_id);

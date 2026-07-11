-- Initial Supabase Schema for Leadzo
-- Updated to include all tables and fields identified in code review

-- Ensure uuid-ossp is enabled for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  name TEXT,
  dataforseo_login TEXT,
  dataforseo_password TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'new',
  source TEXT,
  contact JSONB, -- JSON contact representation used in cards
  platform TEXT, -- e.g., 'facebook', 'instagram'
  intent TEXT,
  language TEXT,
  last_message TEXT,
  is_urgent BOOLEAN DEFAULT false,
  score INTEGER DEFAULT 0,
  is_scam BOOLEAN DEFAULT false,
  scam_reason TEXT,
  autopilot BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- e.g., 'whatsapp', 'email', 'social'
  status TEXT DEFAULT 'draft',
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Launched Campaigns table
CREATE TABLE public.launched_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  budget DECIMAL(10,2),
  status TEXT DEFAULT 'active',
  "name" TEXT,
  "objective" TEXT,
  "budgetType" TEXT,
  "audience" JSONB,
  "adHeadline" TEXT,
  "adCopy" TEXT,
  "ctaButton" TEXT,
  "destinationUrl" TEXT,
  "platformCampaignId" TEXT,
  "errorMessage" TEXT,
  "adMediaStorageId" TEXT,
  "adMediaType" TEXT,
  "adMediaName" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  /**
   * Owner of the launched campaign – used for data‑isolation.
   * Mirrors `user_id` for now but allows future admin‑on‑behalf launches.
   */
  owner_user_id UUID NOT NULL
);

-- Messages table (Inbox chat history)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sender TEXT NOT NULL, -- 'user' or 'lead' or 'system' or 'agent'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CRM Contacts table (CRM page specific profiles)
CREATE TABLE public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  lifecycle_stage TEXT DEFAULT 'subscriber',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CRM Sequences table
CREATE TABLE public.sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL, -- list of sequence step actions
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CRM Sequence Enrollments table
CREATE TABLE public.sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES public.sequences(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'stopped'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ad Campaigns Insights table (CEO Dashboard)
CREATE TABLE public.ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  spend DECIMAL(10,2) DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Market Analyses table (Market Intelligence)
CREATE TABLE public.market_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  analysis_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Google Search Console Tokens/Sites connection
CREATE TABLE public.gsc_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  connected BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- SEO Projects table (SEO Agent)
CREATE TABLE public.seo_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  keywords TEXT[],
  audit_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CEO Queries Q&A table
CREATE TABLE public.ceo_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Creatives table (Creative Generation)
CREATE TABLE public.creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Learning Agent Data table
CREATE TABLE public.learning_agent_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gsc_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceo_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_agent_data ENABLE ROW LEVEL SECURITY;

-- Create Policies (SELECT, INSERT, UPDATE, DELETE for all tables)

-- Users Table Policies
CREATE POLICY "Users can view their own profile." ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile." ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Leads Table Policies
CREATE POLICY "Users can view their own leads." ON public.leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own leads." ON public.leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own leads." ON public.leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own leads." ON public.leads FOR DELETE USING (auth.uid() = user_id);

-- Campaigns Table Policies
CREATE POLICY "Users can view their own campaigns." ON public.campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own campaigns." ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own campaigns." ON public.campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own campaigns." ON public.campaigns FOR DELETE USING (auth.uid() = user_id);

-- Launched Campaigns Table Policies
CREATE POLICY "Users can view their own launched campaigns." ON public.launched_campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own launched campaigns." ON public.launched_campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own launched campaigns." ON public.launched_campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own launched campaigns." ON public.launched_campaigns FOR DELETE USING (auth.uid() = user_id);

-- Messages Table Policies
CREATE POLICY "Users can view their own messages." ON public.messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own messages." ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CRM Contacts Table Policies
CREATE POLICY "Users can view crm contacts." ON public.crm_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert crm contacts." ON public.crm_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update crm contacts." ON public.crm_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete crm contacts." ON public.crm_contacts FOR DELETE USING (auth.uid() = user_id);

-- Sequences Table Policies
CREATE POLICY "Users can view sequences." ON public.sequences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert sequences." ON public.sequences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update sequences." ON public.sequences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete sequences." ON public.sequences FOR DELETE USING (auth.uid() = user_id);

-- Sequence Enrollments Table Policies
CREATE POLICY "Users can view enrollments." ON public.sequence_enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert enrollments." ON public.sequence_enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update enrollments." ON public.sequence_enrollments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete enrollments." ON public.sequence_enrollments FOR DELETE USING (auth.uid() = user_id);

-- Ad Campaigns Table Policies
CREATE POLICY "Users can view ad campaigns." ON public.ad_campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert ad campaigns." ON public.ad_campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update ad campaigns." ON public.ad_campaigns FOR UPDATE USING (auth.uid() = user_id);

-- Market Analyses Table Policies
CREATE POLICY "Users can view market analyses." ON public.market_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert market analyses." ON public.market_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete market analyses." ON public.market_analyses FOR DELETE USING (auth.uid() = user_id);

-- GSC Tokens Table Policies
CREATE POLICY "Users can view gsc tokens." ON public.gsc_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert gsc tokens." ON public.gsc_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete gsc tokens." ON public.gsc_tokens FOR DELETE USING (auth.uid() = user_id);

-- SEO Projects Table Policies
CREATE POLICY "Users can view seo projects." ON public.seo_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert seo projects." ON public.seo_projects FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CEO Queries Table Policies
CREATE POLICY "Users can view ceo queries." ON public.ceo_queries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert ceo queries." ON public.ceo_queries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Creatives Table Policies
CREATE POLICY "Users can view creatives." ON public.creatives FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert creatives." ON public.creatives FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete creatives." ON public.creatives FOR DELETE USING (auth.uid() = user_id);

-- Learning Agent Data Table Policies
CREATE POLICY "Users can view learning agent data." ON public.learning_agent_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert learning agent data." ON public.learning_agent_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update learning agent data." ON public.learning_agent_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete learning agent data." ON public.learning_agent_data FOR DELETE USING (auth.uid() = user_id);

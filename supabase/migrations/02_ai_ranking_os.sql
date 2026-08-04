-- ============================================================
-- AI Ranking OS — Phase 2 Database Schema
-- Migration: 02_ai_ranking_os.sql
-- ============================================================

-- -------------------------------------------------------
-- TABLE: ranking_sites
-- Stores each domain a user connects to AI Ranking OS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ranking_sites (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  domain            TEXT NOT NULL,
  verified          BOOLEAN DEFAULT false,
  auto_scan         BOOLEAN DEFAULT true,
  scan_frequency    TEXT DEFAULT 'weekly',  -- 'daily', 'weekly', 'monthly'
  gsc_connected     BOOLEAN DEFAULT false,
  gsc_token         JSONB,                  -- OAuth token for Google Search Console
  last_scanned_at   TIMESTAMP WITH TIME ZONE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, domain)
);

ALTER TABLE public.ranking_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own sites" ON public.ranking_sites
  FOR ALL USING (auth.uid() = user_id);

-- -------------------------------------------------------
-- TABLE: ranking_scans
-- Stores every scan result (full AI output) per site
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ranking_scans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id           UUID REFERENCES public.ranking_sites(id) ON DELETE CASCADE NOT NULL,
  user_id           UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  -- Core scores
  score_ai_visibility   INTEGER,
  score_llm_readiness   INTEGER,
  score_seo_health      INTEGER,
  score_authority       INTEGER,
  -- Full structured data from AI
  full_data         JSONB,
  high_impact_tasks JSONB,
  triggered_by      TEXT DEFAULT 'manual',  -- 'manual', 'cron', 'webhook'
  scanned_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ranking_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own scans" ON public.ranking_scans
  FOR ALL USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_ranking_scans_site_id ON public.ranking_scans(site_id);
CREATE INDEX idx_ranking_scans_scanned_at ON public.ranking_scans(scanned_at DESC);

-- -------------------------------------------------------
-- TABLE: ranking_recommendations
-- Individual recommendations, trackable per site
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ranking_recommendations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id           UUID REFERENCES public.ranking_scans(id) ON DELETE CASCADE NOT NULL,
  site_id           UUID REFERENCES public.ranking_sites(id) ON DELETE CASCADE NOT NULL,
  user_id           UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  priority          TEXT NOT NULL,   -- 'P0', 'P1', 'P2'
  category          TEXT,
  title             TEXT NOT NULL,
  reason            TEXT,
  ai_impact         TEXT,
  seo_impact        TEXT,
  effort            TEXT,
  estimated_time    TEXT,
  status            TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'done'
  approved_at       TIMESTAMP WITH TIME ZONE,
  done_at           TIMESTAMP WITH TIME ZONE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ranking_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own recommendations" ON public.ranking_recommendations
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_ranking_recs_site_id ON public.ranking_recommendations(site_id);
CREATE INDEX idx_ranking_recs_status ON public.ranking_recommendations(status);

-- -------------------------------------------------------
-- TABLE: ranking_agents_log
-- Audit trail of every AI Agent action (per Vol 4/6)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ranking_agents_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id           UUID REFERENCES public.ranking_sites(id) ON DELETE CASCADE NOT NULL,
  user_id           UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  agent_name        TEXT NOT NULL,   -- 'SEO Agent', 'Content Agent', etc.
  action            TEXT NOT NULL,
  result            JSONB,
  triggered_by      TEXT DEFAULT 'auto',   -- 'auto', 'manual'
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ranking_agents_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own agent logs" ON public.ranking_agents_log
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_agents_log_site_id ON public.ranking_agents_log(site_id);

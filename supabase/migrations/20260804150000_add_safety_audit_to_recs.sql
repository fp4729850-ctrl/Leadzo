-- Add safety audit columns to ranking_recommendations
ALTER TABLE public.ranking_recommendations 
ADD COLUMN IF NOT EXISTS ai_safety_score INTEGER DEFAULT 95,
ADD COLUMN IF NOT EXISTS ai_risk_assessment TEXT DEFAULT 'No security or layout risks detected.',
ADD COLUMN IF NOT EXISTS ai_verdict TEXT DEFAULT 'Approve';

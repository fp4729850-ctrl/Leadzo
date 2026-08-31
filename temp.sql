ALTER TABLE ranking_sites ADD COLUMN IF NOT EXISTS edge_optimizer_enabled BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS cdn_script_id TEXT;

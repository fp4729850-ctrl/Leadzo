CREATE TABLE public.crm_leads (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id text NOT NULL,
  
  name text NOT NULL,
  email text NULL,
  phone text NULL,
  company text NULL,
  
  source text NULL, -- e.g. "Reddit", "Direct", "WhatsApp"
  status text NOT NULL DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'closed_won', 'closed_lost'
  ai_score integer NULL, -- 0-100 indicating lead quality
  
  notes text NULL,
  last_interaction timestamp with time zone NULL,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT crm_leads_pkey PRIMARY KEY (id)
);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own leads"
  ON public.crm_leads
  FOR ALL
  USING (user_id = auth.uid()::text);

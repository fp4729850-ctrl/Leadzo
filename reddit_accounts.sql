CREATE TABLE public.reddit_accounts (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id text NOT NULL,
  auth_type text NOT NULL, -- 'oauth' or 'developer'
  
  -- OAuth Fields
  access_token text NULL,
  refresh_token text NULL,
  
  -- Developer Fields
  client_id text NULL,
  client_secret text NULL,
  username text NULL,
  password text NULL,

  -- Settings
  is_active boolean NOT NULL DEFAULT true,
  target_subreddits text[] NULL,
  target_keywords text[] NULL,
  website_url text NULL,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reddit_accounts_pkey PRIMARY KEY (id)
);

ALTER TABLE public.reddit_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own reddit accounts"
  ON public.reddit_accounts
  FOR ALL
  USING (user_id = auth.uid()::text);

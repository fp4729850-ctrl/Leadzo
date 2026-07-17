ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, ADD COLUMN IF NOT EXISTS website_url text;

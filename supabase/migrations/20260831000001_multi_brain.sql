-- 1. Drop the unique constraint that restricts one brain per user
DROP INDEX IF EXISTS public.unique_user_business_knowledge;

-- 2. Add the is_active column
ALTER TABLE public.business_knowledge ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- 3. Update existing records to be active (since they were the only ones)
UPDATE public.business_knowledge SET is_active = true WHERE is_active = false;

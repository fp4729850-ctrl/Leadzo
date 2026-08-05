-- Supabase Migration: 20260805000000_create_token_system.sql
-- Implements the token balance and ledger transaction tracking system.

-- 1. Create Token Balances Table
CREATE TABLE IF NOT EXISTS public.token_balances (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 100 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.token_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own token balance"
  ON public.token_balances FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Create Token Transactions Table (Ledger)
CREATE TABLE IF NOT EXISTS public.token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own token transactions"
  ON public.token_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Trigger Function: Automatically allocate 100 free tokens for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user_tokens()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.token_balances (user_id, balance)
  VALUES (NEW.id, 100)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.token_transactions (user_id, amount, description)
  VALUES (NEW.id, 100, 'Welcome Free Testing Tokens');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created_tokens
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_tokens();

-- 4. Trigger Function: Sync subscription updates to token credits
CREATE OR REPLACE FUNCTION public.handle_subscription_token_credit()
RETURNS TRIGGER AS $$
DECLARE
  credit_amount INTEGER;
BEGIN
  -- Check if subscription status is active
  IF NEW.status = 'active' THEN
    -- Match token amounts
    CASE LOWER(NEW.plan_name)
      WHEN 'basic' THEN credit_amount := 2300;       -- Starter Plan
      WHEN 'starter' THEN credit_amount := 2300;     -- Starter Plan Alias
      WHEN 'pro' THEN credit_amount := 5500;         -- Professional Plan
      WHEN 'professional' THEN credit_amount := 5500;-- Professional Plan Alias
      WHEN 'agency' THEN credit_amount := 10350;     -- Agency Plan
      ELSE credit_amount := 0;
    END CASE;

    IF credit_amount > 0 THEN
      -- Upsert token balance (replace/top up to the subscription limit)
      INSERT INTO public.token_balances (user_id, balance, updated_at)
      VALUES (NEW.user_id, credit_amount, NOW())
      ON CONFLICT (user_id) DO UPDATE
      SET balance = credit_amount, updated_at = NOW();

      -- Log the credit transaction
      INSERT INTO public.token_transactions (user_id, amount, description)
      VALUES (NEW.user_id, credit_amount, 'Subscription Credit: ' || NEW.plan_name);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_subscription_updated_tokens
  AFTER INSERT OR UPDATE OF status ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_subscription_token_credit();

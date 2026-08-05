-- Supabase Migration: 20260805160000_update_email_cost_rate.sql
-- Updates the AI Email Campaign token rate to 0.30 tokens and implements the automated campaign insertion billing trigger.

-- 1. Update the token cost mapping for email messages to 0.30 tokens
UPDATE public.token_rates
SET token_cost = 0.30
WHERE action_type = 'email_message';

-- 2. Trigger Function: Charge tokens on campaign creation (specifically for upfront email billing)
CREATE OR REPLACE FUNCTION public.charge_campaign_tokens()
RETURNS TRIGGER AS $$
DECLARE
  rate_cost NUMERIC(10, 2);
  required_cost NUMERIC(10, 2);
  current_bal NUMERIC(10, 2);
BEGIN
  -- We only bill upfront for email campaigns (WhatsApp and Calling are billed dynamically during execution)
  IF NEW.type = 'email' AND NEW.total_recipients > 0 THEN
    -- Fetch the email_message rate cost
    SELECT token_cost INTO rate_cost 
    FROM public.token_rates 
    WHERE action_type = 'email_message';
    
    IF rate_cost IS NULL THEN
      rate_cost := 0.30;
    END IF;
    
    required_cost := NEW.total_recipients * rate_cost;
    
    -- Check user balance
    SELECT balance INTO current_bal 
    FROM public.token_balances 
    WHERE user_id = NEW.user_id;
    
    IF current_bal IS NULL THEN
      current_bal := 0.00;
    END IF;
    
    IF current_bal < required_cost THEN
      RAISE EXCEPTION 'Insufficient tokens. Required: %, Current Balance: %', required_cost, current_bal;
    END IF;
    
    -- Deduct tokens from user wallet
    UPDATE public.token_balances 
    SET balance = balance - required_cost, updated_at = NOW() 
    WHERE user_id = NEW.user_id;
    
    -- Insert record into ledger
    INSERT INTO public.token_transactions (user_id, amount, description)
    VALUES (
      NEW.user_id, 
      -required_cost, 
      'Launched Email Campaign: ' || NEW.total_recipients || ' recipients (' || rate_cost || ' tokens/email)'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger
CREATE OR REPLACE TRIGGER on_campaign_inserted_tokens
  BEFORE INSERT ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.charge_campaign_tokens();

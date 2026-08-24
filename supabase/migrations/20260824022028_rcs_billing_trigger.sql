CREATE OR REPLACE FUNCTION deduct_rcs_campaign_cost()
RETURNS TRIGGER AS $$
DECLARE
  current_bal NUMERIC(10,2);
  required_cost NUMERIC(10,2);
  rate_cost NUMERIC(10,2) := 0.15; -- 0.15 tokens/rupees per RCS message
BEGIN
  -- Calculate cost based on total contacts
  required_cost := NEW.total_contacts * rate_cost;
  
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
    'Launched RCS Campaign: ' || NEW.total_contacts || ' recipients (' || rate_cost || ' tokens/msg)'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to prevent duplication
DROP TRIGGER IF EXISTS trg_deduct_rcs_campaign_cost ON public.rcs_campaigns;

-- Create the trigger
CREATE TRIGGER trg_deduct_rcs_campaign_cost
  BEFORE INSERT ON public.rcs_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION deduct_rcs_campaign_cost();

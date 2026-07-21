-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    current_period_end TIMESTAMP WITH TIME ZONE,
    provider TEXT NOT NULL, -- 'stripe' or 'nowpayments'
    provider_subscription_id TEXT, -- e.g. sub_123 or invoice id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL, -- 'pending', 'paid', 'failed'
    provider TEXT NOT NULL, -- 'stripe' or 'nowpayments'
    provider_payment_id TEXT, -- e.g. pi_123 or payment id
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
ON subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own payments"
ON payments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Add review tracking columns to hotel_bookings table
ALTER TABLE hotel_bookings ADD COLUMN IF NOT EXISTS review_dispatched BOOLEAN DEFAULT FALSE;
ALTER TABLE hotel_bookings ADD COLUMN IF NOT EXISTS review_dispatched_at TIMESTAMPTZ;
ALTER TABLE hotel_bookings ADD COLUMN IF NOT EXISTS review_text TEXT;

-- Enable pg_cron and pg_net extensions if not already present
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule any previous version of the job to prevent duplicate runs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'invoke-hotel-auto-checkout-reviews') THEN
    PERFORM cron.unschedule('invoke-hotel-auto-checkout-reviews');
  END IF;
END $$;

-- Schedule Daily 11:00 AM IST (05:30 UTC) Auto-Dispatch
SELECT cron.schedule(
  'invoke-hotel-auto-checkout-reviews',
  '30 5 * * *',
  $$
    SELECT net.http_post(
      url:='https://stbqeiapgdaklktrlrjm.supabase.co/functions/v1/hotel_auto_checkout_reviews',
      headers:='{"Content-Type": "application/json"}'::jsonb
    ) as request_id;
  $$
);

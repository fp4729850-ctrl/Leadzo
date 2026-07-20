-- Enable pg_cron and pg_net if not already enabled
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule the aiReminders_cronWorker to run at 10:00 AM every day
select cron.schedule(
  'invoke-ai-reminders-cronWorker',
  '0 10 * * *',
  $$
    select net.http_post(
      url:='https://stbqeiapgdaklktrlrjm.supabase.co/functions/v1/aiReminders_cronWorker',
      headers:='{"Content-Type": "application/json"}'::jsonb
    ) as request_id;
  $$
);

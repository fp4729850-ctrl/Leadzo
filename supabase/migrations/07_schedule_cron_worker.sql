create extension if not exists pg_net;

select cron.schedule(
  'invoke-ai-reminders-daily-10am',
  '30 4 * * *', -- 4:30 AM UTC is 10:00 AM IST
  $$
    select net.http_post(
        url:='https://stbqeiapgdaklktrlrjm.supabase.co/functions/v1/aiReminders_cronWorker',
        headers:='{"Content-Type": "application/json"}'::jsonb
    );
  $$
);

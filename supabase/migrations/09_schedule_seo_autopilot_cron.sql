-- Supabase Migration: 09_schedule_seo_autopilot_cron.sql
-- Schedules the seoAi_cronWorker to run every hour to check intervals and generate SEO blogs.

SELECT cron.schedule(
  'invoke-seo-autopilot-cronWorker',
  '0 * * * *', -- Every hour at minute 0
  $$
    SELECT net.http_post(
      url:='https://stbqeiapgdaklktrlrjm.supabase.co/functions/v1/seoAi_cronWorker',
      headers:='{"Content-Type": "application/json"}'::jsonb
    );
  $$
);

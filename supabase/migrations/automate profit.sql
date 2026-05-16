-- Enable pg_cron extension (run once)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily profit job to run every day at midnight UTC
SELECT cron.schedule(
  'apply-daily-profits',
  '0 0 * * *',
  $$SELECT public.apply_daily_profits();$$
);
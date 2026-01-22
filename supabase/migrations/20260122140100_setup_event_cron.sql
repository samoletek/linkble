-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres user (may already exist)
GRANT USAGE ON SCHEMA cron TO postgres;

-- Remove existing job if it exists (for redeployment)
SELECT cron.unschedule('check-event-start-times') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'check-event-start-times'
);

-- Schedule function to run every 5 minutes
-- This will check for events starting in 1 hour, 30 minutes, or starting now
SELECT cron.schedule(
  'check-event-start-times',        -- Job name
  '*/5 * * * *',                     -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://hfseviwxoywwdgdjugke.supabase.co/functions/v1/check-event-times',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    ) as request_id;
  $$
);

-- Verify the job was created
SELECT * FROM cron.job WHERE jobname = 'check-event-start-times';

-- Comment for documentation
COMMENT ON EXTENSION pg_cron IS 'PostgreSQL job scheduler - used for event start time notifications';

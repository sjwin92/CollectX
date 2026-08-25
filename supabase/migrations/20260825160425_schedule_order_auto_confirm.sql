-- Schedules the auto-confirm-orders edge function to run every 15 minutes.
-- It sweeps `orders` where status = 'shipped' and auto_confirm_at has passed,
-- releasing the seller's payout without buyer action (mirrors Vinted's
-- "auto-confirm after N days" behavior).
--
-- The cron job authenticates to the edge function via a shared secret read
-- from a Postgres setting (app.settings.cron_secret) rather than a literal
-- value in this file, since this repo is public — the actual secret value
-- must be set once, out of band, via:
--   ALTER DATABASE postgres SET app.settings.cron_secret = '<value>';
-- and the same value set as the CRON_SECRET edge function secret via
-- `supabase secrets set`. Until that's done, this job will run but the
-- function call will 401 harmlessly (no orders will be missed — they'll
-- pick up on the next successful run).

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'auto-confirm-orders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://yfzfyeoaisspqlziaufx.supabase.co/functions/v1/auto-confirm-orders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

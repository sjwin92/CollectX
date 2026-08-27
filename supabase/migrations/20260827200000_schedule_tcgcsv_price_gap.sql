-- Nightly job to fill the pokemontcg.io price gap from tcgcsv.com — the
-- Mega Evolution era (me2–me5, ~660 cards) and a few promo/e-Card gaps that
-- pokemontcg.io simply doesn't carry. Runs after refresh-card-prices so it
-- only touches rows still NULL.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('refresh-card-prices-tcgcsv-nightly')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-card-prices-tcgcsv-nightly');

SELECT cron.schedule(
  'refresh-card-prices-tcgcsv-nightly',
  '50 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://yfzfyeoaisspqlziaufx.supabase.co/functions/v1/refresh-card-prices-tcgcsv',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('limit', 6, 'offset', o))
  FROM generate_series(0, 18, 6) AS o;
  $$
);

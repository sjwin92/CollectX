-- Nightly data-refresh jobs. Until now nothing re-ran the price/catalogue
-- refreshers after the one-off backfill, so ~1,370 of 20,472 cards stayed
-- unpriced (old EX/POP/Neo sets that pokemontcg.io 5xx'd during the backfill)
-- and store/sealed prices drifted.
--
-- pg_net's net.http_post is fire-and-forget (queues the request, returns
-- immediately), so each job fires its paginated calls in one block without
-- blocking. The edge functions have verify_jwt disabled (config.toml) and
-- already retry 5xx / 429, and every upsert is idempotent — a page that
-- partially times out is simply re-covered the next night.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Drop first so re-running the migration (or editing the schedule) is clean.
SELECT cron.unschedule('refresh-card-prices-nightly')     WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-card-prices-nightly');
SELECT cron.unschedule('refresh-sealed-products-nightly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-sealed-products-nightly');
SELECT cron.unschedule('refresh-store-prices-nightly')    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-store-prices-nightly');

-- Card prices — 174 sets, ~30 per page to stay under the 150s edge wall-clock.
SELECT cron.schedule(
  'refresh-card-prices-nightly',
  '20 2 * * *',
  $$
  SELECT net.http_post(url := 'https://yfzfyeoaisspqlziaufx.supabase.co/functions/v1/refresh-card-prices',
                       headers := jsonb_build_object('Content-Type', 'application/json'),
                       body := jsonb_build_object('limit', 30, 'offset', o))
    FROM generate_series(0, 150, 30) AS o;
  $$
);

-- Sealed products — 218 TCGCSV groups, ~80 per page.
SELECT cron.schedule(
  'refresh-sealed-products-nightly',
  '40 3 * * *',
  $$
  SELECT net.http_post(url := 'https://yfzfyeoaisspqlziaufx.supabase.co/functions/v1/refresh-sealed-products',
                       headers := jsonb_build_object('Content-Type', 'application/json'),
                       body := jsonb_build_object('limit', 80, 'offset', o))
    FROM generate_series(0, 160, 80) AS o;
  $$
);

-- Store inventory repricer — few active stores, one full sweep is fine.
SELECT cron.schedule(
  'refresh-store-prices-nightly',
  '10 4 * * *',
  $$
  SELECT net.http_post(url := 'https://yfzfyeoaisspqlziaufx.supabase.co/functions/v1/refresh-store-prices',
                       headers := jsonb_build_object('Content-Type', 'application/json'),
                       body := '{}'::jsonb);
  $$
);

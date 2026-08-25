-- The original auto-confirm-orders cron job read its shared secret via
-- current_setting('app.settings.cron_secret'), set through
-- ALTER DATABASE ... SET. That requires a privilege hosted Supabase doesn't
-- grant even to the project owner ("permission denied to set parameter"),
-- so the setting could never actually be configured. Supabase's supported
-- pattern for exactly this (a secret pg_cron's SQL needs to read) is Vault
-- (supabase_vault, already enabled on this project) — re-schedule the job
-- to pull the secret from vault.decrypted_secrets instead. The secret value
-- itself is stored via vault.create_secret(), never in a migration file.

SELECT cron.schedule(
  'auto-confirm-orders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://yfzfyeoaisspqlziaufx.supabase.co/functions/v1/auto-confirm-orders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

ALTER TABLE public.nav_metrics
ADD COLUMN app_version text,
ADD COLUMN browser text,
ADD COLUMN device_type text,
ADD COLUMN screen_size text;
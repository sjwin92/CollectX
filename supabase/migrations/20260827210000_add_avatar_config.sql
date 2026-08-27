-- Store the pixel-avatar builder's part choices so the builder can reopen
-- with the user's last design. The rendered PNG still lives in the `avatars`
-- bucket and profiles.avatar_url as before.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_config jsonb;

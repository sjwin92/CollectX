-- Fix: notifications INSERT allowed any authenticated user to spoof user_id.
DROP POLICY IF EXISTS "Anyone authenticated can insert notifications" ON public.notifications;

-- Only service_role (server-side / edge functions / DB triggers via SECURITY DEFINER) may insert notifications.
-- Clients must never insert directly; system-generated notifications are produced by trusted server code.
CREATE POLICY "Only service role can insert notifications"
  ON public.notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

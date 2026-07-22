-- Re-create the notification/chat helper RPCs against the current schema.
-- These were originally defined against an older chat_conversations/chat_messages
-- shape (participant_1_id/participant_2_id/sender_id, notifications.read_at) that
-- was later replaced (user1_id/user2_id/sender_user_id, no read_at column) without
-- these functions being updated to match — they referenced columns that no longer
-- exist. Rewritten here against the live schema.

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_action_url TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data, action_url, expires_at)
  VALUES (p_user_id, p_type, p_title, p_message, p_data, p_action_url, p_expires_at)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notifications_read(notification_ids UUID[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
     SET read = true
   WHERE id = ANY(notification_ids)
     AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_id UUID;
  current_user_id UUID := auth.uid();
BEGIN
  SELECT id INTO conversation_id
    FROM public.chat_conversations
   WHERE (user1_id = current_user_id AND user2_id = other_user_id)
      OR (user1_id = other_user_id AND user2_id = current_user_id);

  IF conversation_id IS NULL THEN
    INSERT INTO public.chat_conversations (user1_id, user2_id)
    VALUES (current_user_id, other_user_id)
    RETURNING id INTO conversation_id;
  END IF;

  RETURN conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_notification(uuid, text, text, text, jsonb, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_notifications_read(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_or_create_conversation(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid) TO authenticated;

-- Phase 1 Codex hardening
-- - move marketplace writes behind narrow RPCs
-- - prevent clients from manufacturing notifications
-- - make direct-message read state and conversation timestamps server-owned

-- ============================================================
-- 1. Marketplace writes
-- ============================================================

DROP POLICY IF EXISTS "Users can create their own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Users can update their own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Users can delete their own listings" ON public.marketplace_listings;

REVOKE INSERT, UPDATE, DELETE ON public.marketplace_listings FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_marketplace_listing(
  _user_card_id uuid,
  _trade_preferences text DEFAULT NULL,
  _description text DEFAULT NULL,
  _expires_at timestamptz DEFAULT NULL
)
RETURNS public.marketplace_listings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  caller uuid := auth.uid();
  card public.user_cards;
  listing public.marketplace_listings;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF length(coalesce(_trade_preferences, '')) > 1000 THEN
    RAISE EXCEPTION 'Trade preferences are too long';
  END IF;
  IF length(coalesce(_description, '')) > 4000 THEN
    RAISE EXCEPTION 'Listing description is too long';
  END IF;
  IF _expires_at IS NOT NULL
     AND (_expires_at <= now() OR _expires_at > now() + interval '1 year') THEN
    RAISE EXCEPTION 'Listing expiry must be within the next year';
  END IF;

  SELECT * INTO card
    FROM public.user_cards
   WHERE id = _user_card_id
   FOR UPDATE;

  IF card.id IS NULL OR card.user_id <> caller OR card.for_trade = false THEN
    RAISE EXCEPTION 'Card is not owned by you or is not marked for trade';
  END IF;
  IF public.user_card_locked_in_live_trade(card.id) THEN
    RAISE EXCEPTION 'Card is already committed to a live trade';
  END IF;

  INSERT INTO public.marketplace_listings (
    user_id,
    user_card_id,
    card_id,
    card_name,
    set_id,
    set_name,
    condition,
    listing_type,
    asking_price,
    trade_preferences,
    description,
    expires_at
  ) VALUES (
    caller,
    card.id,
    card.card_id,
    coalesce(card.card_name, ''),
    card.set_id,
    card.set_name,
    coalesce(card.condition, 'near_mint'),
    'trade',
    NULL,
    nullif(trim(coalesce(_trade_preferences, '')), ''),
    nullif(trim(coalesce(_description, '')), ''),
    _expires_at
  )
  RETURNING * INTO listing;

  RETURN listing;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'This card already has an active marketplace listing';
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_marketplace_listing(
  _listing_id uuid,
  _trade_preferences text DEFAULT NULL,
  _description text DEFAULT NULL,
  _expires_at timestamptz DEFAULT NULL
)
RETURNS public.marketplace_listings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  caller uuid := auth.uid();
  listing public.marketplace_listings;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF length(coalesce(_trade_preferences, '')) > 1000 THEN
    RAISE EXCEPTION 'Trade preferences are too long';
  END IF;
  IF length(coalesce(_description, '')) > 4000 THEN
    RAISE EXCEPTION 'Listing description is too long';
  END IF;
  IF _expires_at IS NOT NULL
     AND (_expires_at <= now() OR _expires_at > now() + interval '1 year') THEN
    RAISE EXCEPTION 'Listing expiry must be within the next year';
  END IF;

  SELECT * INTO listing
    FROM public.marketplace_listings
   WHERE id = _listing_id
   FOR UPDATE;

  IF listing.id IS NULL OR listing.user_id <> caller OR listing.status <> 'active' THEN
    RAISE EXCEPTION 'Active listing not found';
  END IF;
  IF NOT EXISTS (
    SELECT 1
      FROM public.user_cards card
     WHERE card.id = listing.user_card_id
       AND card.user_id = caller
       AND card.for_trade = true
  ) THEN
    RAISE EXCEPTION 'The linked card is no longer available for trade';
  END IF;

  UPDATE public.marketplace_listings
     SET trade_preferences = nullif(trim(coalesce(_trade_preferences, '')), ''),
         description = nullif(trim(coalesce(_description, '')), ''),
         expires_at = _expires_at,
         updated_at = now()
   WHERE id = listing.id
  RETURNING * INTO listing;

  RETURN listing;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_marketplace_listing(_listing_id uuid)
RETURNS public.marketplace_listings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  caller uuid := auth.uid();
  listing public.marketplace_listings;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO listing
    FROM public.marketplace_listings
   WHERE id = _listing_id
   FOR UPDATE;

  IF listing.id IS NULL OR listing.user_id <> caller THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;
  IF listing.status = 'cancelled' THEN
    RETURN listing;
  END IF;
  IF listing.status <> 'active' THEN
    RAISE EXCEPTION 'Only an active listing can be cancelled';
  END IF;

  UPDATE public.marketplace_listings
     SET status = 'cancelled', updated_at = now()
   WHERE id = listing.id
  RETURNING * INTO listing;

  RETURN listing;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_marketplace_listing(uuid, text, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_marketplace_listing(uuid, text, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_marketplace_listing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_marketplace_listing(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_marketplace_listing(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_marketplace_listing(uuid) TO authenticated;

-- ============================================================
-- 2. Notifications are server-created and user-readable
-- ============================================================

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone authenticated can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their notifications" ON public.notifications;
REVOKE INSERT, UPDATE, DELETE ON public.notifications FROM anon, authenticated;

DROP FUNCTION IF EXISTS public.create_notification(uuid, text, text, text, jsonb, text, timestamptz);

CREATE OR REPLACE FUNCTION public.mark_notifications_read(notification_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  UPDATE public.notifications
     SET read = true
   WHERE id = ANY(notification_ids)
     AND user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  UPDATE public.notifications
     SET read = true
   WHERE user_id = auth.uid() AND read = false;
$function$;

REVOKE ALL ON FUNCTION public.mark_notifications_read(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_trade_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'proposed' THEN
    INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
    VALUES (
      NEW.recipient_user_id,
      'trade_proposal',
      'New trade proposal',
      'You have received a new card trade proposal.',
      jsonb_build_object('trade_id', NEW.id),
      '/trades/' || NEW.id::text
    );
    RETURN NEW;
  END IF;

  IF TG_OP <> 'UPDATE' OR OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'accepted' THEN
    INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
    VALUES (
      NEW.initiator_user_id,
      'trade_accepted',
      'Trade accepted',
      'Your trade proposal has been accepted.',
      jsonb_build_object('trade_id', NEW.id),
      '/trades/' || NEW.id::text
    );
  ELSIF NEW.status = 'cancelled' THEN
    INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
    SELECT participant_id,
           'trade_declined',
           'Trade proposal closed',
           'This trade proposal is no longer active.',
           jsonb_build_object('trade_id', NEW.id),
           '/trades/' || NEW.id::text
      FROM unnest(ARRAY[NEW.initiator_user_id, NEW.recipient_user_id]) participant_id
     WHERE participant_id IS DISTINCT FROM auth.uid();
  ELSIF NEW.status = 'shipped' THEN
    INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
    SELECT participant_id,
           'system',
           'Both parcels shipped',
           'Both participants have recorded their shipments.',
           jsonb_build_object('trade_id', NEW.id),
           '/trades/' || NEW.id::text
      FROM unnest(ARRAY[NEW.initiator_user_id, NEW.recipient_user_id]) participant_id;
  ELSIF NEW.status = 'completed' THEN
    INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
    SELECT participant_id,
           'trade_completed',
           'Trade completed',
           'Both participants confirmed receipt. The traded cards are now in their new collections.',
           jsonb_build_object('trade_id', NEW.id),
           '/trades/' || NEW.id::text
      FROM unnest(ARRAY[NEW.initiator_user_id, NEW.recipient_user_id]) participant_id;
  ELSIF NEW.status = 'disputed' THEN
    INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
    SELECT participant_id,
           'system',
           'Issue reported',
           'An issue has been recorded on this trade. Contact the other participant before taking further action.',
           jsonb_build_object('trade_id', NEW.id),
           '/trades/' || NEW.id::text
      FROM unnest(ARRAY[NEW.initiator_user_id, NEW.recipient_user_id]) participant_id
     WHERE participant_id IS DISTINCT FROM auth.uid();
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_trade_change ON public.trades;
CREATE TRIGGER trg_notify_trade_change
  AFTER INSERT OR UPDATE OF status ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.notify_trade_change();

CREATE OR REPLACE FUNCTION public.notify_trade_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  recipient uuid;
BEGIN
  IF NEW.message_type = 'system' THEN
    RETURN NEW;
  END IF;

  SELECT CASE
           WHEN NEW.sender_user_id = trade.initiator_user_id THEN trade.recipient_user_id
           WHEN NEW.sender_user_id = trade.recipient_user_id THEN trade.initiator_user_id
         END
    INTO recipient
    FROM public.trades trade
   WHERE trade.id = NEW.trade_id;

  IF recipient IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
    VALUES (
      recipient,
      'trade_message',
      'New trade message',
      'You have a new message about a trade.',
      jsonb_build_object('trade_id', NEW.trade_id, 'message_id', NEW.id),
      '/trades/' || NEW.trade_id::text
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_trade_message ON public.trade_messages;
CREATE TRIGGER trg_notify_trade_message
  AFTER INSERT ON public.trade_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_trade_message();

REVOKE ALL ON FUNCTION public.notify_trade_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_trade_message() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 3. Direct messages: server-owned conversation state
-- ============================================================

DROP POLICY IF EXISTS "Users can create conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.chat_conversations;
REVOKE INSERT, UPDATE, DELETE ON public.chat_conversations FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  caller uuid := auth.uid();
  first_participant uuid;
  second_participant uuid;
  conversation_id uuid;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF other_user_id IS NULL OR other_user_id = caller THEN
    RAISE EXCEPTION 'Choose another user';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = other_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  first_participant := least(caller, other_user_id);
  second_participant := greatest(caller, other_user_id);

  INSERT INTO public.chat_conversations AS conversation (user1_id, user2_id)
  VALUES (first_participant, second_participant)
  ON CONFLICT (user1_id, user2_id)
  DO UPDATE SET last_message_at = conversation.last_message_at
  RETURNING id INTO conversation_id;

  RETURN conversation_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_or_create_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can update messages they can view" ON public.chat_messages;
DROP POLICY IF EXISTS "Conversation participants can send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Recipients can mark as read" ON public.chat_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.chat_messages;
REVOKE UPDATE, DELETE ON public.chat_messages FROM anon, authenticated;

CREATE POLICY "Participants can send messages"
  ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_user_id
    AND message_type <> 'system'
    AND EXISTS (
      SELECT 1
        FROM public.chat_conversations conversation
       WHERE conversation.id = chat_messages.conversation_id
         AND auth.uid() IN (conversation.user1_id, conversation.user2_id)
    )
  );

CREATE OR REPLACE FUNCTION public.touch_chat_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.chat_conversations
     SET last_message_at = NEW.created_at
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_touch_chat_conversation ON public.chat_messages;
CREATE TRIGGER trg_touch_chat_conversation
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_chat_conversation();

CREATE OR REPLACE FUNCTION public.mark_conversation_messages_read(_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL OR NOT EXISTS (
    SELECT 1
     FROM public.chat_conversations conversation
     WHERE conversation.id = _conversation_id
       AND caller IN (conversation.user1_id, conversation.user2_id)
  ) THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  UPDATE public.chat_messages
     SET read = true
   WHERE conversation_id = _conversation_id
     AND sender_user_id <> caller
     AND read = false;
END;
$function$;

REVOKE ALL ON FUNCTION public.touch_chat_conversation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_conversation_messages_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_conversation_messages_read(uuid) TO authenticated;

-- Trade-event notifications.
--
-- The trade state machine (proposed → accepted → shipped → completed |
-- cancelled | disputed) is driven entirely through SECURITY DEFINER RPCs
-- whose bodies have been rewritten several times. Rather than editing each
-- RPC, watch the `trades` table directly: one AFTER INSERT/UPDATE trigger
-- that notifies the *other* participant whenever a trade advances.
--
-- Mirrors the notify_wishlist_matches / notify_listing_interest style —
-- SECURITY DEFINER + a direct INSERT into `notifications` (which has no
-- client INSERT policy for arbitrary user_ids, so a trigger running as the
-- calling role would be blocked by RLS).

CREATE OR REPLACE FUNCTION public.notify_trade_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor   uuid := auth.uid();  -- whoever triggered this change, if any
  targets uuid[];
  n_type  text;
  n_title text;
  n_msg   text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- A brand-new proposal → tell the recipient. Anything created in a
    -- non-proposed state (shouldn't happen) is ignored.
    IF NEW.status = 'proposed' THEN
      INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
      VALUES (
        NEW.recipient_user_id,
        'trade_proposal',
        'New trade offer',
        'Someone proposed a card-for-card trade with you.',
        jsonb_build_object('trade_id', NEW.id),
        '/trades/' || NEW.id
      );
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: react to status transitions, plus the first "confirm receipt"
  -- (which doesn't move status off 'shipped' until both sides confirm).
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    CASE NEW.status
      WHEN 'accepted' THEN
        n_type := 'trade_accepted';
        n_title := 'Trade accepted';
        n_msg := 'Your trade offer was accepted — arrange shipping next.';
      WHEN 'shipped' THEN
        n_type := 'trade_shipped';
        n_title := 'Both sides shipped';
        n_msg := 'Both cards are on their way. Confirm receipt once yours arrives.';
      WHEN 'completed' THEN
        n_type := 'trade_completed';
        n_title := 'Trade complete';
        n_msg := 'Both sides confirmed receipt. Leave a rating for your trade partner.';
      WHEN 'cancelled' THEN
        n_type := 'trade_cancelled';
        n_title := 'Trade cancelled';
        n_msg := 'A trade you were part of was cancelled.';
      WHEN 'disputed' THEN
        n_type := 'trade_disputed';
        n_title := 'Trade disputed';
        n_msg := 'A dispute was opened on your trade. We''ll take a look.';
      ELSE
        n_type := NULL;
    END CASE;
  ELSIF NEW.status = 'shipped'
        AND ( (OLD.initiator_confirmed_at IS NULL) <> (NEW.initiator_confirmed_at IS NULL)
           OR (OLD.recipient_confirmed_at IS NULL) <> (NEW.recipient_confirmed_at IS NULL) ) THEN
    n_type := 'trade_received';
    n_title := 'Trade partner confirmed receipt';
    n_msg := 'The other trader confirmed they received your card. Confirm yours to finish.';
  END IF;

  IF n_type IS NULL THEN
    RETURN NEW;
  END IF;

  -- Notify both participants except whoever performed the action. With no
  -- actor (e.g. a cron sweep) notify both.
  targets := ARRAY(
    SELECT uid
    FROM unnest(ARRAY[NEW.initiator_user_id, NEW.recipient_user_id]) AS uid
    WHERE actor IS NULL OR uid <> actor
  );

  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  SELECT uid, n_type, n_title, n_msg,
         jsonb_build_object('trade_id', NEW.id, 'status', NEW.status),
         '/trades/' || NEW.id
  FROM unnest(targets) AS uid;

  RETURN NEW;
END;
$$;

-- Trigger functions are never called directly by clients.
REVOKE EXECUTE ON FUNCTION public.notify_trade_event() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_trade_event ON public.trades;
CREATE TRIGGER trg_notify_trade_event
  AFTER INSERT OR UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.notify_trade_event();

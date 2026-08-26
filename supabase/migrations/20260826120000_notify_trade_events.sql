-- Trade-event notifications.
--
-- The prod DB already had a `notify_trade_change()` function + a
-- `trg_notify_trade_change` trigger on `public.trades`, added out-of-band
-- and never captured in a migration (same schema-drift pattern noted in
-- the wishlist migration). This migration adopts it into version control
-- and improves it:
--   * `shipped` / `disputed` now use dedicated notification types instead
--     of the generic 'system' type;
--   * a new "trade partner confirmed receipt" notification fires when one
--     side confirms but the trade isn't complete yet — which the previous
--     trigger missed entirely because it only fired on `status` changes.
--
-- SECURITY DEFINER + direct INSERT into `notifications` (which has no
-- client INSERT policy for arbitrary user_ids), matching every other
-- notification trigger in this schema.

CREATE OR REPLACE FUNCTION public.notify_trade_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  -- Both participants except whoever performed the action (with no actor,
  -- e.g. a cron sweep, this is both of them).
  others uuid[] := ARRAY(
    SELECT uid
    FROM unnest(ARRAY[NEW.initiator_user_id, NEW.recipient_user_id]) AS uid
    WHERE uid IS DISTINCT FROM auth.uid()
  );
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'proposed' THEN
      INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
      VALUES (
        NEW.recipient_user_id, 'trade_proposal', 'New trade proposal',
        'You have received a new card trade proposal.',
        jsonb_build_object('trade_id', NEW.id), '/trades/' || NEW.id::text
      );
    END IF;
    RETURN NEW;
  END IF;

  -- Status transition.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'accepted' THEN
      INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
      VALUES (
        NEW.initiator_user_id, 'trade_accepted', 'Trade accepted',
        'Your trade proposal was accepted — arrange shipping next.',
        jsonb_build_object('trade_id', NEW.id), '/trades/' || NEW.id::text
      );
    ELSIF NEW.status = 'shipped' THEN
      INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
      SELECT uid, 'trade_shipped', 'Both parcels shipped',
             'Both cards are on their way. Confirm receipt once yours arrives.',
             jsonb_build_object('trade_id', NEW.id), '/trades/' || NEW.id::text
        FROM unnest(ARRAY[NEW.initiator_user_id, NEW.recipient_user_id]) AS uid;
    ELSIF NEW.status = 'completed' THEN
      INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
      SELECT uid, 'trade_completed', 'Trade completed',
             'Both sides confirmed receipt. Leave a rating for your trade partner.',
             jsonb_build_object('trade_id', NEW.id), '/trades/' || NEW.id::text
        FROM unnest(ARRAY[NEW.initiator_user_id, NEW.recipient_user_id]) AS uid;
    ELSIF NEW.status = 'cancelled' THEN
      INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
      SELECT uid, 'trade_declined', 'Trade proposal closed',
             'This trade proposal is no longer active.',
             jsonb_build_object('trade_id', NEW.id), '/trades/' || NEW.id::text
        FROM unnest(others) AS uid;
    ELSIF NEW.status = 'disputed' THEN
      INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
      SELECT uid, 'trade_disputed', 'Issue reported on trade',
             'An issue was recorded on this trade. Contact the other trader before taking further action.',
             jsonb_build_object('trade_id', NEW.id), '/trades/' || NEW.id::text
        FROM unnest(others) AS uid;
    END IF;
    RETURN NEW;
  END IF;

  -- No status change: catch the first receipt-confirmation. (The second
  -- confirmation flips the trade to 'completed', handled above.)
  IF NEW.status = 'shipped'
     AND ( (OLD.initiator_confirmed_at IS NULL) <> (NEW.initiator_confirmed_at IS NULL)
        OR (OLD.recipient_confirmed_at IS NULL) <> (NEW.recipient_confirmed_at IS NULL) ) THEN
    INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
    SELECT uid, 'trade_received', 'Trade partner confirmed receipt',
           'The other trader confirmed they received your card. Confirm yours to finish.',
           jsonb_build_object('trade_id', NEW.id), '/trades/' || NEW.id::text
      FROM unnest(others) AS uid;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.notify_trade_change() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.notify_trade_change() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_trade_change() TO service_role;

-- Recreate the trigger so it also fires on the confirm-receipt columns —
-- the previous definition only watched `status`.
DROP TRIGGER IF EXISTS trg_notify_trade_change ON public.trades;
CREATE TRIGGER trg_notify_trade_change
  AFTER INSERT OR UPDATE OF status, initiator_confirmed_at, recipient_confirmed_at
  ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.notify_trade_change();

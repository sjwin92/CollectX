
-- ────────────────────────────────────────────────────────────────────────────
-- Listing interest: notify the listing owner when someone expresses interest,
-- and keep marketplace_listings.interested_count real (feeds the Marketplace
-- "Hot Trades" tab). Mirrors the existing notify_trade_message trigger style.
-- ────────────────────────────────────────────────────────────────────────────

-- The migration history has two conflicting CREATE TABLE marketplace_interests
-- definitions (one with a UNIQUE(listing_id, user_id), one without) — make it
-- definite regardless of which actually landed, same pattern as
-- trade_ratings_one_per_rater / trade_shipments_one_per_sender.
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_interests_one_per_user
  ON public.marketplace_interests (listing_id, user_id);

CREATE OR REPLACE FUNCTION public.notify_listing_interest()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT user_id INTO owner_id
    FROM public.marketplace_listings
   WHERE id = NEW.listing_id;

  IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
    VALUES (
      owner_id,
      'listing_interest',
      'Someone is interested in your listing',
      'A collector expressed interest in trading for your listed card.',
      jsonb_build_object('listing_id', NEW.listing_id, 'interest_id', NEW.id),
      '/marketplace'
    );
  END IF;

  UPDATE public.marketplace_listings
     SET interested_count = interested_count + 1
   WHERE id = NEW.listing_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_listing_interest ON public.marketplace_interests;
CREATE TRIGGER trg_notify_listing_interest
  AFTER INSERT ON public.marketplace_interests
  FOR EACH ROW EXECUTE FUNCTION public.notify_listing_interest();

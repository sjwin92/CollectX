-- Want-list auto-matching. Community research: an automatic "notify me when
-- someone lists a card I want" is a widely-requested, unmet need — even
-- official Pokemon TCG tools lack it, forcing collectors onto ad-hoc forum
-- posts. The user_wishlist table already existed in an earlier migration
-- file but was never actually applied to this project (schema drift, same
-- pattern found elsewhere this session) — recreating it here, plus the
-- matching trigger that's the actual point of having it.

CREATE TABLE public.user_wishlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  card_name TEXT NOT NULL,
  set_id TEXT NOT NULL,
  set_name TEXT NOT NULL,
  image_url TEXT,
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  max_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, card_id)
);

ALTER TABLE public.user_wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wishlist"
ON public.user_wishlist FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wishlist items"
ON public.user_wishlist FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wishlist items"
ON public.user_wishlist FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wishlist items"
ON public.user_wishlist FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_user_wishlist_user_id ON public.user_wishlist(user_id);
CREATE INDEX idx_user_wishlist_card_id ON public.user_wishlist(card_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_wishlist TO authenticated;
GRANT ALL ON public.user_wishlist TO service_role;

-- Fires after a new listing lands as 'active': notifies every wishlister
-- whose card_id matches, skipping the lister's own wishlist entry and
-- respecting their max_price ceiling for cash-sale listings (a trade
-- listing has no price to check against, so it always matches on card_id
-- alone). SECURITY DEFINER, same as every other trigger/RPC in this schema
-- that needs to insert into `notifications` on behalf of someone other than
-- the acting user — without it, a normal authenticated INSERT firing this
-- trigger would hit `notifications`' own RLS (no client INSERT policy) and
-- fail, since a trigger function without SECURITY DEFINER runs as the
-- calling role, not the function owner.
CREATE OR REPLACE FUNCTION public.notify_wishlist_matches()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  SELECT
    w.user_id,
    'wishlist_match',
    'A card on your want list is available',
    NEW.card_name || ' just got listed' ||
      CASE WHEN NEW.listing_type = 'sale' THEN ' for ' || NEW.currency || ' ' || NEW.asking_price::text
           ELSE ' for trade' END,
    jsonb_build_object('listing_id', NEW.id, 'card_id', NEW.card_id),
    '/marketplace'
  FROM public.user_wishlist w
  WHERE w.card_id = NEW.card_id
    AND w.user_id <> NEW.user_id
    AND (NEW.listing_type <> 'sale' OR w.max_price IS NULL OR NEW.asking_price <= w.max_price);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_wishlist_matches
AFTER INSERT ON public.marketplace_listings
FOR EACH ROW
WHEN (NEW.status = 'active')
EXECUTE FUNCTION public.notify_wishlist_matches();

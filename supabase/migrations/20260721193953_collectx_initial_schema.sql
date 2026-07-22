-- CollectX consolidated clean-install schema.
-- Supersedes the incompatible Lovable-era migration chain archived in supabase/legacy_migrations.


-- Shared timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- profiles
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  reputation_score NUMERIC NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  successful_trades INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- user_cards
-- ============================================================
CREATE TABLE public.user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  card_name TEXT,
  card_image TEXT,
  set_id TEXT,
  set_name TEXT,
  card_number TEXT,
  rarity TEXT,
  product_type TEXT NOT NULL DEFAULT 'single',
  quantity INTEGER NOT NULL DEFAULT 1,
  condition TEXT,
  is_graded BOOLEAN NOT NULL DEFAULT false,
  grading_company TEXT,
  grade_score TEXT,
  for_trade BOOLEAN NOT NULL DEFAULT false,
  for_sale BOOLEAN NOT NULL DEFAULT false,
  trade_value NUMERIC,
  sale_price NUMERIC,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_cards_user_id ON public.user_cards(user_id);
CREATE INDEX idx_user_cards_card_id ON public.user_cards(card_id);

ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cards"
  ON public.user_cards FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view cards for trade or sale"
  ON public.user_cards FOR SELECT USING (for_trade = true OR for_sale = true);

CREATE POLICY "Users can insert their own cards"
  ON public.user_cards FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards"
  ON public.user_cards FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cards"
  ON public.user_cards FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_cards_updated_at
  BEFORE UPDATE ON public.user_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- card_images
-- ============================================================
CREATE TABLE public.card_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_card_id UUID REFERENCES public.user_cards(id) ON DELETE CASCADE,
  card_id TEXT,
  image_url TEXT NOT NULL,
  image_path TEXT NOT NULL,
  caption TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_card_images_user_card ON public.card_images(user_card_id);
CREATE INDEX idx_card_images_user_id ON public.card_images(user_id);

ALTER TABLE public.card_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Card images are viewable by everyone"
  ON public.card_images FOR SELECT USING (true);

CREATE POLICY "Users can insert their own card images"
  ON public.card_images FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own card images"
  ON public.card_images FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own card images"
  ON public.card_images FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- trades
-- ============================================================
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  initiator_cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  recipient_cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  initiator_value NUMERIC NOT NULL DEFAULT 0,
  recipient_value NUMERIC NOT NULL DEFAULT 0,
  escrow_required BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trades_initiator ON public.trades(initiator_user_id);
CREATE INDEX idx_trades_recipient ON public.trades(recipient_user_id);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trade participants can view trades"
  ON public.trades FOR SELECT
  USING (auth.uid() = initiator_user_id OR auth.uid() = recipient_user_id);

CREATE POLICY "Users can create trades they initiate"
  ON public.trades FOR INSERT WITH CHECK (auth.uid() = initiator_user_id);

CREATE POLICY "Trade participants can update trades"
  ON public.trades FOR UPDATE
  USING (auth.uid() = initiator_user_id OR auth.uid() = recipient_user_id);

CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- trade_messages
-- ============================================================
CREATE TABLE public.trade_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trade_messages_trade_id ON public.trade_messages(trade_id);

ALTER TABLE public.trade_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trade participants can view messages"
  ON public.trade_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trades t
    WHERE t.id = trade_id
      AND (auth.uid() = t.initiator_user_id OR auth.uid() = t.recipient_user_id)
  ));

CREATE POLICY "Trade participants can send messages"
  ON public.trade_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_user_id
    AND EXISTS (
      SELECT 1 FROM public.trades t
      WHERE t.id = trade_id
        AND (auth.uid() = t.initiator_user_id OR auth.uid() = t.recipient_user_id)
    )
  );

-- ============================================================
-- shipping_methods
-- ============================================================
CREATE TABLE public.shipping_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  carrier TEXT NOT NULL,
  service_type TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC NOT NULL DEFAULT 0,
  price_per_kg NUMERIC NOT NULL DEFAULT 0,
  max_weight_kg NUMERIC,
  max_dimensions_cm TEXT,
  tracking_included BOOLEAN NOT NULL DEFAULT false,
  insurance_included BOOLEAN NOT NULL DEFAULT false,
  estimated_delivery_days INTEGER,
  domestic_only BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shipping methods are viewable by everyone"
  ON public.shipping_methods FOR SELECT USING (true);

-- ============================================================
-- shipping_rates
-- ============================================================
CREATE TABLE public.shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipping_method_id UUID NOT NULL REFERENCES public.shipping_methods(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  zone TEXT,
  weight_from_kg NUMERIC NOT NULL DEFAULT 0,
  weight_to_kg NUMERIC,
  price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shipping_rates_method ON public.shipping_rates(shipping_method_id);

ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shipping rates are viewable by everyone"
  ON public.shipping_rates FOR SELECT USING (true);

-- ============================================================
-- trade_shipments
-- ============================================================
CREATE TABLE public.trade_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  shipping_method_id UUID REFERENCES public.shipping_methods(id),
  sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tracking_number TEXT,
  shipping_label_url TEXT,
  shipping_cost NUMERIC NOT NULL DEFAULT 0,
  insurance_value NUMERIC NOT NULL DEFAULT 0,
  weight_kg NUMERIC,
  dimensions_cm TEXT,
  sender_address JSONB,
  recipient_address JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trade_shipments_trade ON public.trade_shipments(trade_id);

ALTER TABLE public.trade_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trade participants can view shipments"
  ON public.trade_shipments FOR SELECT
  USING (auth.uid() = sender_user_id OR auth.uid() = recipient_user_id);

CREATE POLICY "Senders can create shipments"
  ON public.trade_shipments FOR INSERT
  WITH CHECK (auth.uid() = sender_user_id);

CREATE POLICY "Trade participants can update shipments"
  ON public.trade_shipments FOR UPDATE
  USING (auth.uid() = sender_user_id OR auth.uid() = recipient_user_id);

CREATE TRIGGER update_trade_shipments_updated_at
  BEFORE UPDATE ON public.trade_shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- tracking_events
-- ============================================================
CREATE TABLE public.tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.trade_shipments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_description TEXT NOT NULL,
  location TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  carrier_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tracking_events_shipment ON public.tracking_events(shipment_id);

ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trade participants can view tracking events"
  ON public.tracking_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trade_shipments s
    WHERE s.id = shipment_id
      AND (auth.uid() = s.sender_user_id OR auth.uid() = s.recipient_user_id)
  ));

CREATE POLICY "Senders can insert tracking events"
  ON public.tracking_events FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trade_shipments s
    WHERE s.id = shipment_id AND auth.uid() = s.sender_user_id
  ));

-- ============================================================
-- card-images storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('card-images', 'card-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Card images publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'card-images');

CREATE POLICY "Users upload to own card-images folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'card-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own card-images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'card-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own card-images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'card-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============ MARKETPLACE LISTINGS ============
CREATE TABLE public.marketplace_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_id TEXT NOT NULL,
  card_name TEXT NOT NULL,
  set_id TEXT,
  set_name TEXT,
  card_number TEXT,
  rarity TEXT,
  image_url TEXT,
  image_url_small TEXT,
  condition TEXT NOT NULL DEFAULT 'near_mint',
  is_graded BOOLEAN NOT NULL DEFAULT false,
  grade_company TEXT,
  grade_score NUMERIC,
  quantity INTEGER NOT NULL DEFAULT 1,
  listing_type TEXT NOT NULL DEFAULT 'trade',
  asking_price NUMERIC,
  trade_preferences TEXT,
  description TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  views_count INTEGER NOT NULL DEFAULT 0,
  interested_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active listings are viewable by everyone" ON public.marketplace_listings FOR SELECT USING (status = 'active' OR auth.uid() = user_id);
CREATE POLICY "Users can create their own listings" ON public.marketplace_listings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own listings" ON public.marketplace_listings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own listings" ON public.marketplace_listings FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_marketplace_listings_updated_at BEFORE UPDATE ON public.marketplace_listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MARKETPLACE INTERESTS ============
CREATE TABLE public.marketplace_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  interest_type TEXT NOT NULL DEFAULT 'trade',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Listing owner and interested user can view" ON public.marketplace_interests FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.marketplace_listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
);
CREATE POLICY "Users can express their own interest" ON public.marketplace_interests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own interest" ON public.marketplace_interests FOR DELETE USING (auth.uid() = user_id);

-- ============ MARKETPLACE FAVORITES ============
CREATE TABLE public.marketplace_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, user_id)
);
ALTER TABLE public.marketplace_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own favorites" ON public.marketplace_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add their own favorites" ON public.marketplace_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their own favorites" ON public.marketplace_favorites FOR DELETE USING (auth.uid() = user_id);

-- ============ INCREMENT VIEWS RPC ============
CREATE OR REPLACE FUNCTION public.increment_listing_views(listing_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.marketplace_listings SET views_count = views_count + 1 WHERE id = listing_id;
END;
$$;

-- ============ ESCROW TRANSACTIONS ============
CREATE TABLE public.escrow_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  initiator_user_id UUID NOT NULL,
  recipient_user_id UUID NOT NULL,
  initiator_escrow_amount NUMERIC NOT NULL DEFAULT 0,
  recipient_escrow_amount NUMERIC NOT NULL DEFAULT 0,
  initiator_paid BOOLEAN NOT NULL DEFAULT false,
  recipient_paid BOOLEAN NOT NULL DEFAULT false,
  initiator_payment_id TEXT,
  recipient_payment_id TEXT,
  release_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view escrow" ON public.escrow_transactions FOR SELECT USING (auth.uid() = initiator_user_id OR auth.uid() = recipient_user_id);
CREATE POLICY "Participants can create escrow" ON public.escrow_transactions FOR INSERT WITH CHECK (auth.uid() = initiator_user_id OR auth.uid() = recipient_user_id);
CREATE POLICY "Participants can update escrow" ON public.escrow_transactions FOR UPDATE USING (auth.uid() = initiator_user_id OR auth.uid() = recipient_user_id);
CREATE TRIGGER update_escrow_transactions_updated_at BEFORE UPDATE ON public.escrow_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TRADE RATINGS ============
CREATE TABLE public.trade_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  rater_user_id UUID NOT NULL,
  rated_user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trade_id, rater_user_id)
);
ALTER TABLE public.trade_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ratings are viewable by everyone" ON public.trade_ratings FOR SELECT USING (true);
CREATE POLICY "Trade participants can create ratings" ON public.trade_ratings FOR INSERT WITH CHECK (
  auth.uid() = rater_user_id AND EXISTS (
    SELECT 1 FROM public.trades t WHERE t.id = trade_id AND (t.initiator_user_id = auth.uid() OR t.recipient_user_id = auth.uid())
  )
);

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  action_url TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Anyone authenticated can insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============ NOTIFICATION PREFERENCES ============
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  trade_proposals BOOLEAN NOT NULL DEFAULT true,
  trade_updates BOOLEAN NOT NULL DEFAULT true,
  marketplace_interest BOOLEAN NOT NULL DEFAULT true,
  messages BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own preferences" ON public.notification_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CHAT CONVERSATIONS ============
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view conversations" ON public.chat_conversations FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users can create conversations" ON public.chat_conversations FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Participants can update conversations" ON public.chat_conversations FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON public.chat_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CHAT MESSAGES ============
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  metadata JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view messages" ON public.chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
);
CREATE POLICY "Participants can send messages" ON public.chat_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_user_id AND EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
);
CREATE POLICY "Recipients can mark as read" ON public.chat_messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
);
CREATE TABLE public.nav_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  route text NOT NULL,
  prefetched boolean NOT NULL,
  duration_ms integer NOT NULL CHECK (duration_ms >= 0 AND duration_ms < 600000),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX nav_metrics_route_idx ON public.nav_metrics (route);
CREATE INDEX nav_metrics_created_at_idx ON public.nav_metrics (created_at DESC);

GRANT INSERT ON public.nav_metrics TO anon, authenticated;
GRANT ALL ON public.nav_metrics TO service_role;

ALTER TABLE public.nav_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert nav metrics"
  ON public.nav_metrics
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
ALTER TABLE public.nav_metrics
ADD COLUMN app_version text,
ADD COLUMN browser text,
ADD COLUMN device_type text,
ADD COLUMN screen_size text;
ALTER TABLE public.nav_metrics
ADD COLUMN os_name text,
ADD COLUMN os_version text;

-- 1. New columns on nav_metrics
ALTER TABLE public.nav_metrics
  ADD COLUMN IF NOT EXISTS from_route text,
  ADD COLUMN IF NOT EXISTS nav_type text,
  ADD COLUMN IF NOT EXISTS connection_type text,
  ADD COLUMN IF NOT EXISTS downlink_mbps numeric,
  ADD COLUMN IF NOT EXISTS save_data boolean,
  ADD COLUMN IF NOT EXISTS is_authenticated boolean,
  ADD COLUMN IF NOT EXISTS referrer_host text,
  ADD COLUMN IF NOT EXISTS web_vitals_lcp_ms numeric,
  ADD COLUMN IF NOT EXISTS web_vitals_inp_ms numeric,
  ADD COLUMN IF NOT EXISTS web_vitals_cls numeric,
  ADD COLUMN IF NOT EXISTS region text;

-- Replace any prior duration check with a sane bounded one
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.nav_metrics'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%duration_ms%'
  LOOP
    EXECUTE format('ALTER TABLE public.nav_metrics DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE public.nav_metrics
  ADD CONSTRAINT nav_metrics_duration_range
  CHECK (duration_ms >= 0 AND duration_ms <= 60000);

CREATE INDEX IF NOT EXISTS nav_metrics_route_prefetched_created_idx
  ON public.nav_metrics (route, prefetched, created_at DESC);

-- 2. Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Admin can read nav_metrics
DROP POLICY IF EXISTS "Admins can read nav_metrics" ON public.nav_metrics;
CREATE POLICY "Admins can read nav_metrics"
  ON public.nav_metrics FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.nav_metrics TO authenticated;

-- 4. Aggregated summary function (admin-only)
CREATE OR REPLACE FUNCTION public.get_nav_metrics_summary(_days int DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH base AS (
    SELECT *
    FROM public.nav_metrics
    WHERE created_at > now() - make_interval(days => _days)
  ),
  by_route AS (
    SELECT route, prefetched,
           count(*)::int AS count,
           round(avg(duration_ms))::int AS avg_ms,
           round(percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms))::int AS p50_ms,
           round(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms))::int AS p95_ms
    FROM base
    GROUP BY route, prefetched
  ),
  by_version AS (
    SELECT coalesce(app_version, 'unknown') AS app_version,
           count(*)::int AS count,
           round(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms))::int AS p95_ms
    FROM base
    GROUP BY 1
  ),
  by_os AS (
    SELECT coalesce(os_name, 'unknown') AS os_name,
           count(*)::int AS count,
           round(avg(duration_ms))::int AS avg_ms,
           round(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms))::int AS p95_ms
    FROM base
    GROUP BY 1
  ),
  by_conn AS (
    SELECT coalesce(connection_type, 'unknown') AS connection_type,
           count(*)::int AS count,
           round(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms))::int AS p95_ms
    FROM base
    GROUP BY 1
  ),
  by_transition AS (
    SELECT coalesce(from_route, '(initial)') AS from_route,
           route,
           count(*)::int AS count,
           round(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms))::int AS p95_ms
    FROM base
    GROUP BY 1, 2
    ORDER BY p95_ms DESC NULLS LAST
    LIMIT 20
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM base),
    'days', _days,
    'by_route', coalesce((SELECT jsonb_agg(by_route) FROM by_route), '[]'::jsonb),
    'by_version', coalesce((SELECT jsonb_agg(by_version) FROM by_version), '[]'::jsonb),
    'by_os', coalesce((SELECT jsonb_agg(by_os) FROM by_os), '[]'::jsonb),
    'by_connection', coalesce((SELECT jsonb_agg(by_conn) FROM by_conn), '[]'::jsonb),
    'worst_transitions', coalesce((SELECT jsonb_agg(by_transition) FROM by_transition), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_nav_metrics_summary(int) TO authenticated;

-- 1. Revoke API execution on trigger-only SECURITY DEFINER functions.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 2. Stop the card-images bucket from being publicly listable.
-- Files remain publicly downloadable by URL (bucket is public); only the
-- list/enumerate API is restricted to the file's owner.
DROP POLICY IF EXISTS "Card images publicly readable" ON storage.objects;

CREATE POLICY "Users list own card-images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'card-images'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Recreate Pokemon mirror tables (dropped previously) and add freshness tracking.

CREATE TABLE IF NOT EXISTS public.pokemon_sets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  series TEXT,
  printed_total INTEGER,
  total INTEGER,
  ptcgo_code TEXT,
  release_date TEXT,
  logo_url TEXT,
  symbol_url TEXT,
  legalities JSONB,
  images JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pokemon_cards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  supertype TEXT,
  subtypes TEXT[],
  hp TEXT,
  types TEXT[],
  set_id TEXT REFERENCES public.pokemon_sets(id) ON DELETE CASCADE,
  set_name TEXT,
  number TEXT,
  artist TEXT,
  rarity TEXT,
  flavor_text TEXT,
  images JSONB,
  tcgplayer_prices JSONB,
  small_image_url TEXT,
  large_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.set_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id TEXT REFERENCES public.pokemon_sets(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type TEXT NOT NULL CHECK (image_type IN ('logo','symbol')),
  source TEXT,
  is_working BOOLEAN NOT NULL DEFAULT true,
  last_checked TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (set_id, image_type, image_url)
);

CREATE TABLE IF NOT EXISTS public.set_imports (
  set_id TEXT PRIMARY KEY REFERENCES public.pokemon_sets(id) ON DELETE CASCADE,
  last_imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  card_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

-- Grants: public read (catalog data is non-sensitive), writes are service-role only via edge function.
GRANT SELECT ON public.pokemon_sets   TO anon, authenticated;
GRANT SELECT ON public.pokemon_cards  TO anon, authenticated;
GRANT SELECT ON public.set_images     TO anon, authenticated;
GRANT SELECT ON public.set_imports    TO anon, authenticated;
GRANT ALL    ON public.pokemon_sets   TO service_role;
GRANT ALL    ON public.pokemon_cards  TO service_role;
GRANT ALL    ON public.set_images     TO service_role;
GRANT ALL    ON public.set_imports    TO service_role;

ALTER TABLE public.pokemon_sets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_images    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_imports   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pokemon sets are public"   ON public.pokemon_sets  FOR SELECT USING (true);
CREATE POLICY "Pokemon cards are public"  ON public.pokemon_cards FOR SELECT USING (true);
CREATE POLICY "Set images are public"     ON public.set_images    FOR SELECT USING (true);
CREATE POLICY "Set imports are public"    ON public.set_imports   FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_pokemon_cards_set_id        ON public.pokemon_cards(set_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_set_id_number ON public.pokemon_cards(set_id, number);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_name          ON public.pokemon_cards USING gin (to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_pokemon_sets_release_date   ON public.pokemon_sets(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_set_images_set_id           ON public.set_images(set_id);

CREATE TRIGGER trg_pokemon_sets_updated_at
  BEFORE UPDATE ON public.pokemon_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_pokemon_cards_updated_at
  BEFORE UPDATE ON public.pokemon_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Trigger-only functions: revoke EXECUTE from anon/authenticated/PUBLIC.
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- Admin-only RPC: revoke from anon (function still self-gates with has_role).
REVOKE EXECUTE ON FUNCTION public.get_nav_metrics_summary(integer) FROM PUBLIC, anon;

-- ────────────────────────────────────────────────────────────────────────────
-- Phase 1: reliable card-for-card trade journey
-- ────────────────────────────────────────────────────────────────────────────

-- 1. TRADES ------------------------------------------------------------------

-- Normalize any legacy statuses first so new CHECK passes
UPDATE public.trades
   SET status = CASE
     WHEN status IN ('processing','escrowed','received') THEN 'accepted'
     WHEN status = 'declined' THEN 'cancelled'
     ELSE status
   END
 WHERE status NOT IN ('proposed','accepted','shipped','completed','cancelled','disputed');

ALTER TABLE public.trades
  DROP COLUMN IF EXISTS escrow_required,
  DROP COLUMN IF EXISTS initiator_value,
  DROP COLUMN IF EXISTS recipient_value;

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS accepted_at            timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at           timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at           timestamptz,
  ADD COLUMN IF NOT EXISTS initiator_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS recipient_confirmed_at timestamptz;

ALTER TABLE public.trades
  DROP CONSTRAINT IF EXISTS trades_status_check,
  ADD  CONSTRAINT trades_status_check
       CHECK (status IN ('proposed','accepted','shipped','completed','cancelled','disputed'));

ALTER TABLE public.trades
  DROP CONSTRAINT IF EXISTS trades_distinct_participants,
  ADD  CONSTRAINT trades_distinct_participants
       CHECK (initiator_user_id <> recipient_user_id);

-- Require non-empty card arrays on both sides
CREATE OR REPLACE FUNCTION public.trades_require_both_sides()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.initiator_cards IS NULL
     OR jsonb_typeof(NEW.initiator_cards) <> 'array'
     OR jsonb_array_length(NEW.initiator_cards) = 0 THEN
    RAISE EXCEPTION 'initiator_cards must be a non-empty array';
  END IF;
  IF NEW.recipient_cards IS NULL
     OR jsonb_typeof(NEW.recipient_cards) <> 'array'
     OR jsonb_array_length(NEW.recipient_cards) = 0 THEN
    RAISE EXCEPTION 'recipient_cards must be a non-empty array (counter-offer required)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trades_require_both_sides ON public.trades;
CREATE TRIGGER trg_trades_require_both_sides
  BEFORE INSERT ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.trades_require_both_sides();

-- Lock down direct UPDATEs (all status transitions go via RPCs)
DROP POLICY IF EXISTS "Trade participants can update trades" ON public.trades;
CREATE POLICY "No direct updates to trades"
  ON public.trades FOR UPDATE
  USING (false);

-- 2. TRADE MESSAGES ----------------------------------------------------------

ALTER TABLE public.trade_messages
  ADD COLUMN IF NOT EXISTS image_url text;

-- 3. TRADE RATINGS -----------------------------------------------------------

ALTER TABLE public.trade_ratings
  DROP CONSTRAINT IF EXISTS trade_ratings_rating_check,
  ADD  CONSTRAINT trade_ratings_rating_check CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE public.trade_ratings
  DROP CONSTRAINT IF EXISTS trade_ratings_no_self,
  ADD  CONSTRAINT trade_ratings_no_self CHECK (rater_user_id <> rated_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS trade_ratings_one_per_rater
  ON public.trade_ratings (trade_id, rater_user_id);

DROP POLICY IF EXISTS "Trade participants can create ratings" ON public.trade_ratings;
CREATE POLICY "Participants can rate completed trades"
  ON public.trade_ratings FOR INSERT
  WITH CHECK (
    auth.uid() = rater_user_id
    AND EXISTS (
      SELECT 1 FROM public.trades t
      WHERE t.id = trade_ratings.trade_id
        AND t.status = 'completed'
        AND (
          (t.initiator_user_id = auth.uid() AND t.recipient_user_id = rated_user_id) OR
          (t.recipient_user_id = auth.uid() AND t.initiator_user_id = rated_user_id)
        )
    )
  );

-- 4. TRADE SHIPMENTS ---------------------------------------------------------

-- One shipment per sender per trade
CREATE UNIQUE INDEX IF NOT EXISTS trade_shipments_one_per_sender
  ON public.trade_shipments (trade_id, sender_user_id);

-- Public projection: everything except private/sensitive fields
DROP VIEW IF EXISTS public.trade_shipments_public;
CREATE VIEW public.trade_shipments_public
WITH (security_invoker = on) AS
SELECT
  id, trade_id, sender_user_id, recipient_user_id,
  shipping_method_id, tracking_number,
  shipping_cost, insurance_value, weight_kg, dimensions_cm,
  status, shipped_at, delivered_at,
  created_at, updated_at
FROM public.trade_shipments;

GRANT SELECT ON public.trade_shipments_public TO authenticated;

-- Base-table SELECT restricted to the sender only (private address stays private)
DROP POLICY IF EXISTS "Trade participants can view shipments" ON public.trade_shipments;
CREATE POLICY "Sender can view own shipment"
  ON public.trade_shipments FOR SELECT
  USING (auth.uid() = sender_user_id);

-- Recipients cannot UPDATE base rows
DROP POLICY IF EXISTS "Trade participants can update shipments" ON public.trade_shipments;
CREATE POLICY "Sender can update own shipment"
  ON public.trade_shipments FOR UPDATE
  USING (auth.uid() = sender_user_id)
  WITH CHECK (auth.uid() = sender_user_id);

-- 5. RPCs --------------------------------------------------------------------

-- accept_trade
CREATE OR REPLACE FUNCTION public.accept_trade(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated public.trades;
BEGIN
  UPDATE public.trades
     SET status = 'accepted',
         accepted_at = now(),
         updated_at = now()
   WHERE id = _trade_id
     AND status = 'proposed'
     AND recipient_user_id = auth.uid()
  RETURNING * INTO updated;

  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'Cannot accept trade: not recipient or not in proposed state';
  END IF;
  RETURN updated;
END;
$$;

-- decline_trade
CREATE OR REPLACE FUNCTION public.decline_trade(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE updated public.trades;
BEGIN
  UPDATE public.trades
     SET status = 'cancelled',
         cancelled_at = now(),
         updated_at = now()
   WHERE id = _trade_id
     AND status = 'proposed'
     AND recipient_user_id = auth.uid()
  RETURNING * INTO updated;
  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'Cannot decline trade';
  END IF;
  RETURN updated;
END;
$$;

-- cancel_trade (initiator only, while proposed)
CREATE OR REPLACE FUNCTION public.cancel_trade(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE updated public.trades;
BEGIN
  UPDATE public.trades
     SET status = 'cancelled',
         cancelled_at = now(),
         updated_at = now()
   WHERE id = _trade_id
     AND status = 'proposed'
     AND initiator_user_id = auth.uid()
  RETURNING * INTO updated;
  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'Cannot cancel trade';
  END IF;
  RETURN updated;
END;
$$;

-- mark_trade_shipped
CREATE OR REPLACE FUNCTION public.mark_trade_shipped(
  _trade_id uuid,
  _tracking text,
  _carrier text
)
RETURNS public.trade_shipments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ship public.trade_shipments;
  other_shipped boolean;
BEGIN
  IF _tracking IS NULL OR length(trim(_tracking)) = 0 THEN
    RAISE EXCEPTION 'Tracking number required';
  END IF;

  UPDATE public.trade_shipments
     SET tracking_number = _tracking,
         status = 'shipped',
         shipped_at = COALESCE(shipped_at, now()),
         metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('carrier', _carrier),
         updated_at = now()
   WHERE trade_id = _trade_id
     AND sender_user_id = auth.uid()
  RETURNING * INTO ship;

  IF ship.id IS NULL THEN
    RAISE EXCEPTION 'No shipment found for this trade/sender';
  END IF;

  -- If both parties have shipped, flip the trade to shipped
  SELECT EXISTS (
    SELECT 1 FROM public.trade_shipments s
     WHERE s.trade_id = _trade_id
       AND s.sender_user_id <> auth.uid()
       AND s.status IN ('shipped','delivered')
       AND s.tracking_number IS NOT NULL
  ) INTO other_shipped;

  IF other_shipped THEN
    UPDATE public.trades
       SET status = 'shipped',
           updated_at = now()
     WHERE id = _trade_id
       AND status = 'accepted';
  END IF;

  RETURN ship;
END;
$$;

-- confirm_trade_receipt
CREATE OR REPLACE FUNCTION public.confirm_trade_receipt(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.trades;
BEGIN
  SELECT * INTO t FROM public.trades WHERE id = _trade_id;
  IF t.id IS NULL THEN
    RAISE EXCEPTION 'Trade not found';
  END IF;
  IF auth.uid() NOT IN (t.initiator_user_id, t.recipient_user_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  IF t.status <> 'shipped' THEN
    RAISE EXCEPTION 'Trade must be shipped before confirming receipt';
  END IF;

  IF auth.uid() = t.initiator_user_id THEN
    UPDATE public.trades
       SET initiator_confirmed_at = COALESCE(initiator_confirmed_at, now()),
           updated_at = now()
     WHERE id = _trade_id AND initiator_confirmed_at IS NULL
    RETURNING * INTO t;
  ELSE
    UPDATE public.trades
       SET recipient_confirmed_at = COALESCE(recipient_confirmed_at, now()),
           updated_at = now()
     WHERE id = _trade_id AND recipient_confirmed_at IS NULL
    RETURNING * INTO t;
  END IF;

  -- If both confirmed, complete trade
  SELECT * INTO t FROM public.trades WHERE id = _trade_id;
  IF t.initiator_confirmed_at IS NOT NULL AND t.recipient_confirmed_at IS NOT NULL AND t.status = 'shipped' THEN
    UPDATE public.trades
       SET status = 'completed',
           completed_at = now(),
           updated_at = now()
     WHERE id = _trade_id
    RETURNING * INTO t;

    UPDATE public.profiles
       SET total_trades = total_trades + 1,
           successful_trades = successful_trades + 1,
           updated_at = now()
     WHERE user_id IN (t.initiator_user_id, t.recipient_user_id);
  END IF;

  RETURN t;
END;
$$;

-- open_trade_dispute
CREATE OR REPLACE FUNCTION public.open_trade_dispute(_trade_id uuid, _reason text)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE t public.trades;
BEGIN
  UPDATE public.trades
     SET status = 'disputed',
         metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
           'dispute', jsonb_build_object(
             'opened_by', auth.uid(),
             'opened_at', now(),
             'reason', _reason
           )),
         updated_at = now()
   WHERE id = _trade_id
     AND auth.uid() IN (initiator_user_id, recipient_user_id)
     AND status IN ('accepted','shipped')
  RETURNING * INTO t;
  IF t.id IS NULL THEN
    RAISE EXCEPTION 'Cannot open dispute';
  END IF;
  RETURN t;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_trade(uuid)               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decline_trade(uuid)              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_trade(uuid)               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_trade_shipped(uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_trade_receipt(uuid)      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.open_trade_dispute(uuid,text)    FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.accept_trade(uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_trade(uuid)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_trade(uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_trade_shipped(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_trade_receipt(uuid)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_trade_dispute(uuid,text)    TO authenticated;

-- 6. REPUTATION TRIGGER ------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recompute_profile_reputation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid := COALESCE(NEW.rated_user_id, OLD.rated_user_id);
  avg_rating numeric;
BEGIN
  SELECT COALESCE(AVG(rating), 0) INTO avg_rating
    FROM public.trade_ratings
   WHERE rated_user_id = target;

  UPDATE public.profiles
     SET reputation_score = avg_rating,
         updated_at = now()
   WHERE user_id = target;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ratings_reputation ON public.trade_ratings;
CREATE TRIGGER trg_ratings_reputation
  AFTER INSERT OR UPDATE OR DELETE ON public.trade_ratings
  FOR EACH ROW EXECUTE FUNCTION public.recompute_profile_reputation();

-- 1. Correct default status
ALTER TABLE public.trades ALTER COLUMN status SET DEFAULT 'proposed';

-- 2. Link listings to a real collection row (optional, backfill-safe)
ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS user_card_id uuid REFERENCES public.user_cards(id) ON DELETE SET NULL;

-- 3. Per-trade delivery addresses (each participant submits their own)
CREATE TABLE IF NOT EXISTS public.trade_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trade_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_addresses TO authenticated;
GRANT ALL ON public.trade_addresses TO service_role;
ALTER TABLE public.trade_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can view own address" ON public.trade_addresses;
DROP POLICY IF EXISTS "Owner can insert own address" ON public.trade_addresses;
DROP POLICY IF EXISTS "Owner can update own address" ON public.trade_addresses;
DROP POLICY IF EXISTS "Owner can delete own address" ON public.trade_addresses;

CREATE POLICY "Owner can view own address" ON public.trade_addresses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert own address" ON public.trade_addresses
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.trades t
      WHERE t.id = trade_id AND auth.uid() IN (t.initiator_user_id, t.recipient_user_id)
    )
  );
CREATE POLICY "Owner can update own address" ON public.trade_addresses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can delete own address" ON public.trade_addresses
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_trade_addresses_updated_at ON public.trade_addresses;
CREATE TRIGGER update_trade_addresses_updated_at
  BEFORE UPDATE ON public.trade_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Chat messages must carry text or an image
ALTER TABLE public.trade_messages
  DROP CONSTRAINT IF EXISTS trade_messages_content_required;
ALTER TABLE public.trade_messages
  ADD CONSTRAINT trade_messages_content_required
  CHECK (length(coalesce(message,'')) > 0 OR image_url IS NOT NULL);

-- 5. propose_trade RPC — server verifies ownership, builds snapshots
CREATE OR REPLACE FUNCTION public.propose_trade(
  _listing_id uuid,
  _offered_user_card_ids uuid[],
  _message text DEFAULT NULL
) RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  listing public.marketplace_listings;
  offered_cards jsonb;
  recipient_snapshot jsonb;
  trade_row public.trades;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _offered_user_card_ids IS NULL OR array_length(_offered_user_card_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Select at least one card to offer';
  END IF;

  SELECT * INTO listing FROM public.marketplace_listings WHERE id = _listing_id;
  IF listing.id IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF listing.status <> 'active' THEN RAISE EXCEPTION 'Listing is not active'; END IF;
  IF listing.user_id = caller THEN RAISE EXCEPTION 'Cannot propose against your own listing'; END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(_offered_user_card_ids) AS oid
    LEFT JOIN public.user_cards uc ON uc.id = oid
    WHERE uc.id IS NULL OR uc.user_id <> caller OR uc.for_trade = false
  ) THEN
    RAISE EXCEPTION 'One or more offered cards are not owned by you or not marked for trade';
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id', uc.card_id,
    'user_card_id', uc.id,
    'card_name', uc.card_name,
    'imageUrl', uc.card_image,
    'condition', COALESCE(uc.condition,'near_mint'),
    'estimatedValue', COALESCE(uc.trade_value::text,'0'),
    'quantity', 1,
    'graded', uc.is_graded,
    'grading_company', uc.grading_company,
    'grade_score', uc.grade_score
  ))
  INTO offered_cards
  FROM public.user_cards uc
  WHERE uc.id = ANY(_offered_user_card_ids);

  recipient_snapshot := jsonb_build_array(jsonb_build_object(
    'id', listing.card_id,
    'listing_id', listing.id,
    'user_card_id', listing.user_card_id,
    'card_name', listing.card_name,
    'imageUrl', listing.image_url,
    'condition', COALESCE(listing.condition,'near_mint'),
    'estimatedValue', COALESCE(listing.asking_price::text,'0'),
    'quantity', 1,
    'graded', listing.is_graded,
    'grading_company', listing.grade_company,
    'grade_score', listing.grade_score::text
  ));

  INSERT INTO public.trades (
    initiator_user_id, recipient_user_id, status,
    initiator_cards, recipient_cards, description, metadata
  ) VALUES (
    caller, listing.user_id, 'proposed',
    offered_cards, recipient_snapshot,
    NULLIF(trim(coalesce(_message,'')),''),
    jsonb_build_object('listing_id', listing.id)
  ) RETURNING * INTO trade_row;

  RETURN trade_row;
END;
$$;
REVOKE ALL ON FUNCTION public.propose_trade(uuid, uuid[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.propose_trade(uuid, uuid[], text) TO authenticated;

-- 6. accept_trade — also creates both shipment rows idempotently
CREATE OR REPLACE FUNCTION public.accept_trade(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE updated public.trades;
BEGIN
  UPDATE public.trades
     SET status = 'accepted',
         accepted_at = now(),
         updated_at = now()
   WHERE id = _trade_id
     AND status = 'proposed'
     AND recipient_user_id = auth.uid()
  RETURNING * INTO updated;

  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'Cannot accept trade: not recipient or not in proposed state';
  END IF;

  INSERT INTO public.trade_shipments (trade_id, sender_user_id, recipient_user_id, status)
  VALUES
    (updated.id, updated.initiator_user_id, updated.recipient_user_id, 'pending'),
    (updated.id, updated.recipient_user_id, updated.initiator_user_id, 'pending')
  ON CONFLICT (trade_id, sender_user_id) DO NOTHING;

  RETURN updated;
END;
$$;

-- 7. mark_trade_shipped — require destination address, tracking, carrier
CREATE OR REPLACE FUNCTION public.mark_trade_shipped(_trade_id uuid, _tracking text, _carrier text)
RETURNS public.trade_shipments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  ship public.trade_shipments;
  dest_ready boolean;
  other_shipped boolean;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _tracking IS NULL OR length(trim(_tracking)) = 0 THEN RAISE EXCEPTION 'Tracking number required'; END IF;
  IF _carrier  IS NULL OR length(trim(_carrier))  = 0 THEN RAISE EXCEPTION 'Carrier required'; END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.trade_shipments s
      JOIN public.trade_addresses ta
        ON ta.trade_id = s.trade_id AND ta.user_id = s.recipient_user_id
     WHERE s.trade_id = _trade_id AND s.sender_user_id = caller
  ) INTO dest_ready;

  IF NOT dest_ready THEN
    RAISE EXCEPTION 'Waiting for the other participant to submit their delivery address';
  END IF;

  UPDATE public.trade_shipments
     SET tracking_number = _tracking,
         status = 'shipped',
         shipped_at = COALESCE(shipped_at, now()),
         metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('carrier', _carrier),
         updated_at = now()
   WHERE trade_id = _trade_id AND sender_user_id = caller
  RETURNING * INTO ship;

  IF ship.id IS NULL THEN RAISE EXCEPTION 'No shipment found for this trade/sender'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.trade_shipments s
    WHERE s.trade_id = _trade_id AND s.sender_user_id <> caller
      AND s.status IN ('shipped','delivered')
      AND s.tracking_number IS NOT NULL
  ) INTO other_shipped;

  IF other_shipped THEN
    UPDATE public.trades SET status='shipped', updated_at=now()
     WHERE id = _trade_id AND status='accepted';
  END IF;

  RETURN ship;
END;
$$;

-- 8. Remove broken public view; add safe RPC that returns both parcels
DROP VIEW IF EXISTS public.trade_shipments_public;

CREATE OR REPLACE FUNCTION public.get_trade_shipments(_trade_id uuid)
RETURNS TABLE (
  id uuid,
  sender_user_id uuid,
  recipient_user_id uuid,
  status text,
  tracking_number text,
  carrier text,
  shipped_at timestamptz,
  delivered_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT s.id, s.sender_user_id, s.recipient_user_id, s.status,
         s.tracking_number,
         (s.metadata->>'carrier')::text AS carrier,
         s.shipped_at, s.delivered_at
    FROM public.trade_shipments s
    JOIN public.trades t ON t.id = s.trade_id
   WHERE s.trade_id = _trade_id
     AND auth.uid() IN (t.initiator_user_id, t.recipient_user_id);
$$;
REVOKE ALL ON FUNCTION public.get_trade_shipments(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trade_shipments(uuid) TO authenticated;

-- 9. submit_trade_address RPC (upsert own address)
CREATE OR REPLACE FUNCTION public.submit_trade_address(_trade_id uuid, _address jsonb)
RETURNS public.trade_addresses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  row_out public.trade_addresses;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _address IS NULL OR jsonb_typeof(_address) <> 'object' THEN
    RAISE EXCEPTION 'Address required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.trades t
    WHERE t.id = _trade_id AND caller IN (t.initiator_user_id, t.recipient_user_id)
      AND t.status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'Trade must be accepted to submit an address';
  END IF;

  INSERT INTO public.trade_addresses (trade_id, user_id, address)
    VALUES (_trade_id, caller, _address)
  ON CONFLICT (trade_id, user_id) DO UPDATE
    SET address = EXCLUDED.address, updated_at = now()
  RETURNING * INTO row_out;
  RETURN row_out;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_trade_address(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_trade_address(uuid, jsonb) TO authenticated;

-- 10. get_trade_destination_address — only for the shipment sender
CREATE OR REPLACE FUNCTION public.get_trade_destination_address(_trade_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  dest jsonb;
BEGIN
  IF caller IS NULL THEN RETURN NULL; END IF;
  SELECT ta.address INTO dest
    FROM public.trade_shipments s
    JOIN public.trade_addresses ta
      ON ta.trade_id = s.trade_id AND ta.user_id = s.recipient_user_id
   WHERE s.trade_id = _trade_id AND s.sender_user_id = caller;
  RETURN dest;
END;
$$;
REVOKE ALL ON FUNCTION public.get_trade_destination_address(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trade_destination_address(uuid) TO authenticated;

-- 1. marketplace_listings.user_card_id: NOT NULL (0 rows in prod, safe)
ALTER TABLE public.marketplace_listings
  ALTER COLUMN user_card_id SET NOT NULL;

-- 2. Rebuild listing RLS: require user_card_id ownership + for_trade + card_id match
DROP POLICY IF EXISTS "Users can create their own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Users can update their own listings" ON public.marketplace_listings;

CREATE POLICY "Users can create their own listings"
  ON public.marketplace_listings
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.user_cards uc
      WHERE uc.id = marketplace_listings.user_card_id
        AND uc.user_id = auth.uid()
        AND uc.for_trade = true
        AND uc.card_id = marketplace_listings.card_id
    )
  );

CREATE POLICY "Users can update their own listings"
  ON public.marketplace_listings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.user_cards uc
      WHERE uc.id = marketplace_listings.user_card_id
        AND uc.user_id = auth.uid()
        AND uc.for_trade = true
        AND uc.card_id = marketplace_listings.card_id
    )
  );

-- 3. Block direct trade inserts: only propose_trade (SECURITY DEFINER) may create trades
DROP POLICY IF EXISTS "Users can create trades they initiate" ON public.trades;
REVOKE INSERT ON public.trades FROM authenticated;

-- 4. trade_addresses: revoke direct writes, keep SELECT for owner
DROP POLICY IF EXISTS "Owner can insert own address" ON public.trade_addresses;
DROP POLICY IF EXISTS "Owner can update own address" ON public.trade_addresses;
DROP POLICY IF EXISTS "Owner can delete own address" ON public.trade_addresses;
REVOKE INSERT, UPDATE, DELETE ON public.trade_addresses FROM authenticated, anon;

-- 5. Harden submit_trade_address: validate required fields + block after other side shipped
CREATE OR REPLACE FUNCTION public.submit_trade_address(_trade_id uuid, _address jsonb)
RETURNS public.trade_addresses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  row_out public.trade_addresses;
  full_name text;
  line1 text;
  city text;
  postal_code text;
  country text;
  other uuid;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _address IS NULL OR jsonb_typeof(_address) <> 'object' THEN
    RAISE EXCEPTION 'Address required';
  END IF;

  -- Participant + accepted-state gate
  SELECT CASE WHEN t.initiator_user_id = caller THEN t.recipient_user_id
              WHEN t.recipient_user_id = caller THEN t.initiator_user_id END
    INTO other
    FROM public.trades t
   WHERE t.id = _trade_id
     AND t.status = 'accepted'
     AND caller IN (t.initiator_user_id, t.recipient_user_id);
  IF other IS NULL THEN
    RAISE EXCEPTION 'Trade must be accepted to submit an address';
  END IF;

  -- Field validation
  full_name   := trim(coalesce(_address->>'full_name',''));
  line1       := trim(coalesce(_address->>'line1',''));
  city        := trim(coalesce(_address->>'city',''));
  postal_code := trim(coalesce(_address->>'postal_code',''));
  country     := trim(coalesce(_address->>'country',''));
  IF full_name = '' OR line1 = '' OR city = '' OR postal_code = '' OR country = '' THEN
    RAISE EXCEPTION 'Address must include full_name, line1, city, postal_code and country';
  END IF;
  IF length(full_name) > 200 OR length(line1) > 300 OR length(city) > 120
     OR length(postal_code) > 40 OR length(country) > 80 THEN
    RAISE EXCEPTION 'Address field too long';
  END IF;

  -- Block changes after the other party's outgoing parcel to caller has shipped
  IF EXISTS (
    SELECT 1 FROM public.trade_shipments s
     WHERE s.trade_id = _trade_id
       AND s.sender_user_id = other
       AND s.recipient_user_id = caller
       AND s.status IN ('shipped','delivered')
  ) THEN
    RAISE EXCEPTION 'Address is locked: the other participant has already shipped to you';
  END IF;

  INSERT INTO public.trade_addresses (trade_id, user_id, address)
    VALUES (_trade_id, caller, _address)
  ON CONFLICT (trade_id, user_id) DO UPDATE
    SET address = EXCLUDED.address, updated_at = now()
  RETURNING * INTO row_out;
  RETURN row_out;
END;
$function$;

-- 6. Harden propose_trade: require valid user_card_id on the listing, snapshot from user_cards
CREATE OR REPLACE FUNCTION public.propose_trade(
  _listing_id uuid,
  _offered_user_card_ids uuid[],
  _message text DEFAULT NULL
)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  listing public.marketplace_listings;
  listed_card public.user_cards;
  offered_cards jsonb;
  recipient_snapshot jsonb;
  trade_row public.trades;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _offered_user_card_ids IS NULL OR array_length(_offered_user_card_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Select at least one card to offer';
  END IF;

  SELECT * INTO listing FROM public.marketplace_listings WHERE id = _listing_id;
  IF listing.id IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF listing.status <> 'active' THEN RAISE EXCEPTION 'Listing is not active'; END IF;
  IF listing.user_id = caller THEN RAISE EXCEPTION 'Cannot propose against your own listing'; END IF;
  IF listing.user_card_id IS NULL THEN
    RAISE EXCEPTION 'Listing is no longer backed by a tradable collection card';
  END IF;

  -- Recipient side: verify the listed user_cards row is still owned, tradable, matches card_id
  SELECT * INTO listed_card
    FROM public.user_cards
   WHERE id = listing.user_card_id
     AND user_id = listing.user_id
     AND for_trade = true
     AND card_id = listing.card_id;
  IF listed_card.id IS NULL THEN
    RAISE EXCEPTION 'Listing is no longer backed by a tradable collection card';
  END IF;

  -- Offered side: caller must own each offered user_cards row and it must be tradable
  IF EXISTS (
    SELECT 1 FROM unnest(_offered_user_card_ids) AS oid
    LEFT JOIN public.user_cards uc ON uc.id = oid
    WHERE uc.id IS NULL OR uc.user_id <> caller OR uc.for_trade = false
  ) THEN
    RAISE EXCEPTION 'One or more offered cards are not owned by you or not marked for trade';
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id', uc.card_id,
    'user_card_id', uc.id,
    'card_name', uc.card_name,
    'imageUrl', uc.card_image,
    'condition', COALESCE(uc.condition,'near_mint'),
    'estimatedValue', COALESCE(uc.trade_value::text,'0'),
    'quantity', 1,
    'graded', uc.is_graded,
    'grading_company', uc.grading_company,
    'grade_score', uc.grade_score
  ))
  INTO offered_cards
  FROM public.user_cards uc
  WHERE uc.id = ANY(_offered_user_card_ids);

  recipient_snapshot := jsonb_build_array(jsonb_build_object(
    'id', listed_card.card_id,
    'listing_id', listing.id,
    'user_card_id', listed_card.id,
    'card_name', listed_card.card_name,
    'imageUrl', listed_card.card_image,
    'condition', COALESCE(listed_card.condition,'near_mint'),
    'estimatedValue', COALESCE(listed_card.trade_value::text,'0'),
    'quantity', 1,
    'graded', listed_card.is_graded,
    'grading_company', listed_card.grading_company,
    'grade_score', listed_card.grade_score
  ));

  INSERT INTO public.trades (
    initiator_user_id, recipient_user_id, status,
    initiator_cards, recipient_cards, description, metadata
  ) VALUES (
    caller, listing.user_id, 'proposed',
    offered_cards, recipient_snapshot,
    NULLIF(trim(coalesce(_message,'')),''),
    jsonb_build_object('listing_id', listing.id, 'user_card_id', listed_card.id)
  ) RETURNING * INTO trade_row;

  RETURN trade_row;
END;
$function$;

-- 7. accept_trade: lock listing FOR UPDATE, re-validate, mark listing pending
CREATE OR REPLACE FUNCTION public.accept_trade(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated public.trades;
  listing_id uuid;
  listing public.marketplace_listings;
BEGIN
  -- Load & authorize
  SELECT * INTO updated FROM public.trades
    WHERE id = _trade_id AND status = 'proposed' AND recipient_user_id = auth.uid();
  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'Cannot accept trade: not recipient or not in proposed state';
  END IF;

  listing_id := (updated.metadata->>'listing_id')::uuid;
  IF listing_id IS NULL THEN
    RAISE EXCEPTION 'Trade has no linked listing';
  END IF;

  -- Lock listing row to prevent double-accept race
  SELECT * INTO listing
    FROM public.marketplace_listings
   WHERE id = listing_id
   FOR UPDATE;
  IF listing.id IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;
  IF listing.status <> 'active' THEN
    RAISE EXCEPTION 'Listing is no longer available';
  END IF;
  IF listing.user_id <> updated.recipient_user_id THEN
    RAISE EXCEPTION 'Listing owner mismatch';
  END IF;
  IF listing.user_card_id IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.user_cards uc
        WHERE uc.id = listing.user_card_id
          AND uc.user_id = listing.user_id
          AND uc.for_trade = true
          AND uc.card_id = listing.card_id
     ) THEN
    RAISE EXCEPTION 'Listing is no longer backed by a tradable collection card';
  END IF;

  -- Flip listing to pending (blocks other proposals from being accepted)
  UPDATE public.marketplace_listings
     SET status = 'pending', updated_at = now()
   WHERE id = listing_id;

  -- Accept the trade
  UPDATE public.trades
     SET status = 'accepted', accepted_at = now(), updated_at = now()
   WHERE id = _trade_id
  RETURNING * INTO updated;

  -- Ensure shipment placeholders exist idempotently
  INSERT INTO public.trade_shipments (trade_id, sender_user_id, recipient_user_id, status)
  VALUES
    (updated.id, updated.initiator_user_id, updated.recipient_user_id, 'pending'),
    (updated.id, updated.recipient_user_id, updated.initiator_user_id, 'pending')
  ON CONFLICT (trade_id, sender_user_id) DO NOTHING;

  RETURN updated;
END;
$function$;

-- 8. confirm_trade_receipt: on completion mark listing completed
CREATE OR REPLACE FUNCTION public.confirm_trade_receipt(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t public.trades;
  listing_id uuid;
BEGIN
  SELECT * INTO t FROM public.trades WHERE id = _trade_id;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Trade not found'; END IF;
  IF auth.uid() NOT IN (t.initiator_user_id, t.recipient_user_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  IF t.status <> 'shipped' THEN
    RAISE EXCEPTION 'Trade must be shipped before confirming receipt';
  END IF;

  IF auth.uid() = t.initiator_user_id THEN
    UPDATE public.trades
       SET initiator_confirmed_at = COALESCE(initiator_confirmed_at, now()),
           updated_at = now()
     WHERE id = _trade_id AND initiator_confirmed_at IS NULL
    RETURNING * INTO t;
  ELSE
    UPDATE public.trades
       SET recipient_confirmed_at = COALESCE(recipient_confirmed_at, now()),
           updated_at = now()
     WHERE id = _trade_id AND recipient_confirmed_at IS NULL
    RETURNING * INTO t;
  END IF;

  SELECT * INTO t FROM public.trades WHERE id = _trade_id;
  IF t.initiator_confirmed_at IS NOT NULL
     AND t.recipient_confirmed_at IS NOT NULL
     AND t.status = 'shipped' THEN
    UPDATE public.trades
       SET status = 'completed', completed_at = now(), updated_at = now()
     WHERE id = _trade_id
    RETURNING * INTO t;

    UPDATE public.profiles
       SET total_trades = total_trades + 1,
           successful_trades = successful_trades + 1,
           updated_at = now()
     WHERE user_id IN (t.initiator_user_id, t.recipient_user_id);

    listing_id := (t.metadata->>'listing_id')::uuid;
    IF listing_id IS NOT NULL THEN
      UPDATE public.marketplace_listings
         SET status = 'completed', updated_at = now()
       WHERE id = listing_id
         AND status IN ('pending','active');
    END IF;
  END IF;

  RETURN t;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.propose_trade(uuid, uuid[], text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.accept_trade(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.confirm_trade_receipt(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.submit_trade_address(uuid, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.propose_trade(uuid, uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_trade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_trade_receipt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_trade_address(uuid, jsonb) TO authenticated;

-- 1. Lock trade_shipments writes to RPCs only
DROP POLICY IF EXISTS "Senders can create shipments" ON public.trade_shipments;
DROP POLICY IF EXISTS "Sender can update own shipment" ON public.trade_shipments;
REVOKE INSERT, UPDATE, DELETE ON public.trade_shipments FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.trade_shipments FROM anon;
-- Preserve sender-only SELECT policy + get_trade_shipments RPC (unchanged)

-- 2. Restrict marketplace_listings direct writes to active/cancelled states
DROP POLICY IF EXISTS "Users can update their own listings" ON public.marketplace_listings;
CREATE POLICY "Users can update their own listings"
  ON public.marketplace_listings
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status IN ('active','cancelled')
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status IN ('active','cancelled')
    AND EXISTS (
      SELECT 1 FROM public.user_cards uc
      WHERE uc.id = marketplace_listings.user_card_id
        AND uc.user_id = auth.uid()
        AND uc.for_trade = true
        AND uc.card_id = marketplace_listings.card_id
    )
  );

DROP POLICY IF EXISTS "Users can delete their own listings" ON public.marketplace_listings;
CREATE POLICY "Users can delete their own listings"
  ON public.marketplace_listings
  FOR DELETE
  USING (
    auth.uid() = user_id
    AND status IN ('active','cancelled')
  );

-- 3. RPC least privilege
REVOKE EXECUTE ON FUNCTION public.get_trade_shipments(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_trade_shipments(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_trade_destination_address(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_trade_destination_address(uuid) TO authenticated;

-- 1) Harden accept_trade
CREATE OR REPLACE FUNCTION public.accept_trade(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  caller uuid := auth.uid();
  trade_row public.trades;
  listing_id uuid;
  listing public.marketplace_listings;
  listed_card public.user_cards;
  offered_ids uuid[];
  offered_id uuid;
  seen_ids uuid[] := ARRAY[]::uuid[];
  involved_ids uuid[];
  card_row public.user_cards;
  conflict_count int;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Lock the trade row first
  SELECT * INTO trade_row FROM public.trades
    WHERE id = _trade_id
    FOR UPDATE;
  IF trade_row.id IS NULL THEN RAISE EXCEPTION 'Trade not found'; END IF;
  IF trade_row.recipient_user_id <> caller THEN
    RAISE EXCEPTION 'Only the recipient can accept this trade';
  END IF;
  IF trade_row.status <> 'proposed' THEN
    RAISE EXCEPTION 'Trade is no longer proposed';
  END IF;

  listing_id := (trade_row.metadata->>'listing_id')::uuid;
  IF listing_id IS NULL THEN
    RAISE EXCEPTION 'Trade has no linked listing';
  END IF;

  -- Lock the linked listing row
  SELECT * INTO listing FROM public.marketplace_listings
    WHERE id = listing_id
    FOR UPDATE;
  IF listing.id IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF listing.status <> 'active' THEN
    RAISE EXCEPTION 'Listing is no longer available';
  END IF;
  IF listing.user_id <> trade_row.recipient_user_id THEN
    RAISE EXCEPTION 'Listing owner mismatch';
  END IF;
  IF listing.user_card_id IS NULL THEN
    RAISE EXCEPTION 'Listing is no longer backed by a tradable collection card';
  END IF;

  -- Lock and revalidate the listed (recipient's) card
  SELECT * INTO listed_card FROM public.user_cards
    WHERE id = listing.user_card_id
    FOR UPDATE;
  IF listed_card.id IS NULL
     OR listed_card.user_id <> listing.user_id
     OR listed_card.for_trade = false
     OR listed_card.card_id <> listing.card_id THEN
    RAISE EXCEPTION 'Listing is no longer backed by a tradable collection card';
  END IF;

  -- Extract offered user_card_ids from the server-recorded initiator_cards
  IF jsonb_typeof(trade_row.initiator_cards) <> 'array'
     OR jsonb_array_length(trade_row.initiator_cards) = 0 THEN
    RAISE EXCEPTION 'Trade has no offered cards';
  END IF;

  SELECT array_agg((elem->>'user_card_id')::uuid ORDER BY (elem->>'user_card_id'))
    INTO offered_ids
    FROM jsonb_array_elements(trade_row.initiator_cards) AS elem;

  IF offered_ids IS NULL OR array_length(offered_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Offered cards missing user_card_id';
  END IF;

  -- Reject nulls and duplicates
  FOREACH offered_id IN ARRAY offered_ids LOOP
    IF offered_id IS NULL THEN
      RAISE EXCEPTION 'Invalid offered card reference';
    END IF;
    IF offered_id = ANY(seen_ids) THEN
      RAISE EXCEPTION 'Duplicate offered card in trade';
    END IF;
    seen_ids := array_append(seen_ids, offered_id);
  END LOOP;

  -- Lock every offered user_cards row in deterministic (sorted) order
  FOREACH offered_id IN ARRAY offered_ids LOOP
    SELECT * INTO card_row FROM public.user_cards
      WHERE id = offered_id
      FOR UPDATE;
    IF card_row.id IS NULL THEN
      RAISE EXCEPTION 'Offered card is no longer available';
    END IF;
    IF card_row.user_id <> trade_row.initiator_user_id THEN
      RAISE EXCEPTION 'Offered card is not owned by the initiator';
    END IF;
    IF card_row.for_trade = false THEN
      RAISE EXCEPTION 'Offered card is no longer marked for trade';
    END IF;
  END LOOP;

  -- Build the full involved id list (offered + listed)
  involved_ids := offered_ids || ARRAY[listed_card.id]::uuid[];

  -- Reject if any involved user_card_id is committed to another live trade
  SELECT count(*) INTO conflict_count
    FROM public.trades t,
         LATERAL (
           SELECT (e->>'user_card_id')::uuid AS uc_id
             FROM jsonb_array_elements(t.initiator_cards) e
           UNION ALL
           SELECT (e->>'user_card_id')::uuid
             FROM jsonb_array_elements(t.recipient_cards) e
         ) x
   WHERE t.id <> trade_row.id
     AND t.status IN ('accepted','shipped','disputed')
     AND x.uc_id = ANY(involved_ids);
  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'One or more cards are already committed to another live trade';
  END IF;

  -- Reserve every involved user_cards row
  UPDATE public.user_cards
     SET for_trade = false, updated_at = now()
   WHERE id = ANY(involved_ids);

  -- Flip listing to pending
  UPDATE public.marketplace_listings
     SET status = 'pending', updated_at = now()
   WHERE id = listing_id;

  -- Accept the trade
  UPDATE public.trades
     SET status = 'accepted', accepted_at = now(), updated_at = now()
   WHERE id = _trade_id
  RETURNING * INTO trade_row;

  -- Ensure exactly two shipment rows (idempotent)
  INSERT INTO public.trade_shipments (trade_id, sender_user_id, recipient_user_id, status)
  VALUES
    (trade_row.id, trade_row.initiator_user_id, trade_row.recipient_user_id, 'pending'),
    (trade_row.id, trade_row.recipient_user_id, trade_row.initiator_user_id, 'pending')
  ON CONFLICT (trade_id, sender_user_id) DO NOTHING;

  -- Cancel other proposed trades touching any newly reserved card
  UPDATE public.trades t
     SET status = 'cancelled',
         cancelled_at = now(),
         updated_at = now()
   WHERE t.status = 'proposed'
     AND t.id <> trade_row.id
     AND EXISTS (
       SELECT 1
         FROM (
           SELECT (e->>'user_card_id')::uuid AS uc_id
             FROM jsonb_array_elements(t.initiator_cards) e
           UNION ALL
           SELECT (e->>'user_card_id')::uuid
             FROM jsonb_array_elements(t.recipient_cards) e
         ) y
        WHERE y.uc_id = ANY(involved_ids)
     );

  -- Cancel other active listings backed by any newly reserved offered card
  UPDATE public.marketplace_listings ml
     SET status = 'cancelled', updated_at = now()
   WHERE ml.status = 'active'
     AND ml.id <> listing_id
     AND ml.user_card_id = ANY(offered_ids);

  RETURN trade_row;
END;
$fn$;

-- 2) Harden mark_trade_shipped
CREATE OR REPLACE FUNCTION public.mark_trade_shipped(_trade_id uuid, _tracking text, _carrier text)
RETURNS public.trade_shipments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  caller uuid := auth.uid();
  trade_row public.trades;
  ship public.trade_shipments;
  dest_ready boolean;
  other_shipped boolean;
  t_track text;
  t_carrier text;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  t_track   := trim(coalesce(_tracking, ''));
  t_carrier := trim(coalesce(_carrier, ''));
  IF t_track = ''   THEN RAISE EXCEPTION 'Tracking number required'; END IF;
  IF t_carrier = '' THEN RAISE EXCEPTION 'Carrier required'; END IF;
  IF length(t_track)   > 100 THEN RAISE EXCEPTION 'Tracking number is too long'; END IF;
  IF length(t_carrier) > 80  THEN RAISE EXCEPTION 'Carrier name is too long'; END IF;

  SELECT * INTO trade_row FROM public.trades
    WHERE id = _trade_id
    FOR UPDATE;
  IF trade_row.id IS NULL THEN RAISE EXCEPTION 'Trade not found'; END IF;
  IF caller NOT IN (trade_row.initiator_user_id, trade_row.recipient_user_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  IF trade_row.status <> 'accepted' THEN
    RAISE EXCEPTION 'Trade must be in the accepted state to record a shipment';
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.trade_shipments s
      JOIN public.trade_addresses ta
        ON ta.trade_id = s.trade_id AND ta.user_id = s.recipient_user_id
     WHERE s.trade_id = _trade_id AND s.sender_user_id = caller
  ) INTO dest_ready;
  IF NOT dest_ready THEN
    RAISE EXCEPTION 'Waiting for the other participant to submit their delivery address';
  END IF;

  UPDATE public.trade_shipments
     SET tracking_number = t_track,
         status = 'shipped',
         shipped_at = COALESCE(shipped_at, now()),
         metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('carrier', t_carrier),
         updated_at = now()
   WHERE trade_id = _trade_id
     AND sender_user_id = caller
     AND status = 'pending'
  RETURNING * INTO ship;

  IF ship.id IS NULL THEN
    RAISE EXCEPTION 'Your shipment is not pending or has already been recorded';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.trade_shipments s
    WHERE s.trade_id = _trade_id
      AND s.sender_user_id <> caller
      AND s.status IN ('shipped','delivered')
      AND s.tracking_number IS NOT NULL
  ) INTO other_shipped;

  IF other_shipped THEN
    UPDATE public.trades SET status='shipped', updated_at=now()
     WHERE id = _trade_id AND status='accepted';
  END IF;

  RETURN ship;
END;
$fn$;

-- 3) Harden open_trade_dispute
CREATE OR REPLACE FUNCTION public.open_trade_dispute(_trade_id uuid, _reason text)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  t public.trades;
  reason_clean text;
BEGIN
  reason_clean := trim(coalesce(_reason, ''));
  IF reason_clean = '' THEN
    RAISE EXCEPTION 'A reason is required to open a dispute';
  END IF;
  IF length(reason_clean) > 2000 THEN
    RAISE EXCEPTION 'Dispute reason is too long';
  END IF;

  UPDATE public.trades
     SET status = 'disputed',
         metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
           'dispute', jsonb_build_object(
             'opened_by', auth.uid(),
             'opened_at', now(),
             'reason', reason_clean
           )),
         updated_at = now()
   WHERE id = _trade_id
     AND auth.uid() IN (initiator_user_id, recipient_user_id)
     AND status IN ('accepted','shipped')
  RETURNING * INTO t;
  IF t.id IS NULL THEN
    RAISE EXCEPTION 'Cannot open dispute';
  END IF;
  RETURN t;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.accept_trade(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  caller uuid := auth.uid();
  trade_peek public.trades;
  listing_peek public.marketplace_listings;
  trade_row public.trades;
  listing public.marketplace_listings;
  listed_user_card_id uuid;
  listing_id uuid;
  offered_ids uuid[];
  involved_ids uuid[];
  offered_id uuid;
  seen_ids uuid[] := ARRAY[]::uuid[];
  elem jsonb;
  raw_id text;
  uuid_re constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  locked_count int;
  ok_count int;
  conflict_count int;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  ------------------------------------------------------------------
  -- 1) Non-locking reads to discover the ids we will need to lock.
  ------------------------------------------------------------------
  SELECT * INTO trade_peek FROM public.trades WHERE id = _trade_id;
  IF trade_peek.id IS NULL THEN RAISE EXCEPTION 'Trade not found'; END IF;
  IF trade_peek.recipient_user_id <> caller THEN
    RAISE EXCEPTION 'Only the recipient can accept this trade';
  END IF;
  IF trade_peek.status <> 'proposed' THEN
    RAISE EXCEPTION 'Trade is no longer proposed';
  END IF;

  listing_id := (trade_peek.metadata->>'listing_id')::uuid;
  IF listing_id IS NULL THEN
    RAISE EXCEPTION 'Trade has no linked listing';
  END IF;

  SELECT * INTO listing_peek FROM public.marketplace_listings WHERE id = listing_id;
  IF listing_peek.id IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF listing_peek.user_card_id IS NULL THEN
    RAISE EXCEPTION 'Listing is no longer backed by a tradable collection card';
  END IF;
  listed_user_card_id := listing_peek.user_card_id;

  ------------------------------------------------------------------
  -- 2) Validate initiator_cards element shape and collect offered ids.
  ------------------------------------------------------------------
  IF jsonb_typeof(trade_peek.initiator_cards) <> 'array'
     OR jsonb_array_length(trade_peek.initiator_cards) = 0 THEN
    RAISE EXCEPTION 'Trade has no offered cards';
  END IF;

  offered_ids := ARRAY[]::uuid[];
  FOR elem IN SELECT * FROM jsonb_array_elements(trade_peek.initiator_cards) LOOP
    IF jsonb_typeof(elem) <> 'object' THEN
      RAISE EXCEPTION 'Invalid offered card entry';
    END IF;
    raw_id := elem->>'user_card_id';
    IF raw_id IS NULL OR raw_id !~ uuid_re THEN
      RAISE EXCEPTION 'Offered cards missing or malformed user_card_id';
    END IF;
    offered_id := raw_id::uuid;
    IF offered_id = ANY(seen_ids) THEN
      RAISE EXCEPTION 'Duplicate offered card in trade';
    END IF;
    seen_ids := array_append(seen_ids, offered_id);
    offered_ids := array_append(offered_ids, offered_id);
  END LOOP;

  ------------------------------------------------------------------
  -- 3) Sorted, unique involved_ids (offered + listed).
  ------------------------------------------------------------------
  SELECT array_agg(x ORDER BY x)
    INTO involved_ids
    FROM (SELECT DISTINCT unnest(offered_ids || ARRAY[listed_user_card_id]::uuid[]) AS x) s;

  ------------------------------------------------------------------
  -- 4) Lock ALL involved user_cards base rows in a single ordered query.
  --    This is the global serialization point for concurrent accepts.
  ------------------------------------------------------------------
  PERFORM 1
    FROM (
      SELECT id FROM public.user_cards
       WHERE id = ANY(involved_ids)
       ORDER BY id
       FOR UPDATE
    ) locked;
  GET DIAGNOSTICS locked_count = ROW_COUNT;
  IF locked_count <> array_length(involved_ids, 1) THEN
    RAISE EXCEPTION 'One or more cards are no longer available';
  END IF;

  ------------------------------------------------------------------
  -- 5) Lock the linked listing row.
  ------------------------------------------------------------------
  SELECT * INTO listing FROM public.marketplace_listings
    WHERE id = listing_id
    FOR UPDATE;
  IF listing.id IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF;

  ------------------------------------------------------------------
  -- 6) Lock the trade row.
  ------------------------------------------------------------------
  SELECT * INTO trade_row FROM public.trades
    WHERE id = _trade_id
    FOR UPDATE;
  IF trade_row.id IS NULL THEN RAISE EXCEPTION 'Trade not found'; END IF;

  ------------------------------------------------------------------
  -- 7) Post-lock re-validation against locked rows.
  ------------------------------------------------------------------
  IF trade_row.recipient_user_id <> caller THEN
    RAISE EXCEPTION 'Only the recipient can accept this trade';
  END IF;
  IF trade_row.status <> 'proposed' THEN
    RAISE EXCEPTION 'Trade is no longer proposed';
  END IF;
  IF (trade_row.metadata->>'listing_id')::uuid <> listing_id THEN
    RAISE EXCEPTION 'Trade listing reference changed';
  END IF;

  IF listing.status <> 'active' THEN
    RAISE EXCEPTION 'Listing is no longer available';
  END IF;
  IF listing.user_id <> trade_row.recipient_user_id THEN
    RAISE EXCEPTION 'Listing owner mismatch';
  END IF;
  IF listing.user_card_id IS DISTINCT FROM listed_user_card_id THEN
    RAISE EXCEPTION 'Listing is no longer backed by the expected collection card';
  END IF;

  -- Listed card is owned by listing owner, still for_trade, matches card_id
  SELECT count(*) INTO ok_count
    FROM public.user_cards
   WHERE id = listed_user_card_id
     AND user_id = listing.user_id
     AND for_trade = true
     AND card_id = listing.card_id;
  IF ok_count <> 1 THEN
    RAISE EXCEPTION 'Listing is no longer backed by a tradable collection card';
  END IF;

  -- Every offered card is owned by the initiator and still for_trade
  SELECT count(*) INTO ok_count
    FROM public.user_cards
   WHERE id = ANY(offered_ids)
     AND user_id = trade_row.initiator_user_id
     AND for_trade = true;
  IF ok_count <> array_length(offered_ids, 1) THEN
    RAISE EXCEPTION 'One or more offered cards are not owned by the initiator or not marked for trade';
  END IF;

  -- Live-trade conflict check across every involved id
  SELECT count(*) INTO conflict_count
    FROM public.trades t,
         LATERAL (
           SELECT (e->>'user_card_id')::uuid AS uc_id
             FROM jsonb_array_elements(t.initiator_cards) e
           UNION ALL
           SELECT (e->>'user_card_id')::uuid
             FROM jsonb_array_elements(t.recipient_cards) e
         ) x
   WHERE t.id <> trade_row.id
     AND t.status IN ('accepted','shipped','disputed')
     AND x.uc_id = ANY(involved_ids);
  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'One or more cards are already committed to another live trade';
  END IF;

  ------------------------------------------------------------------
  -- 8) Commit the trade: reserve, flip listing, accept, seed shipments,
  --    cancel competing proposals.
  ------------------------------------------------------------------
  UPDATE public.user_cards
     SET for_trade = false, updated_at = now()
   WHERE id = ANY(involved_ids);

  UPDATE public.marketplace_listings
     SET status = 'pending', updated_at = now()
   WHERE id = listing_id;

  UPDATE public.trades
     SET status = 'accepted', accepted_at = now(), updated_at = now()
   WHERE id = _trade_id
  RETURNING * INTO trade_row;

  INSERT INTO public.trade_shipments (trade_id, sender_user_id, recipient_user_id, status)
  VALUES
    (trade_row.id, trade_row.initiator_user_id, trade_row.recipient_user_id, 'pending'),
    (trade_row.id, trade_row.recipient_user_id, trade_row.initiator_user_id, 'pending')
  ON CONFLICT (trade_id, sender_user_id) DO NOTHING;

  UPDATE public.trades t
     SET status = 'cancelled',
         cancelled_at = now(),
         updated_at = now()
   WHERE t.status = 'proposed'
     AND t.id <> trade_row.id
     AND EXISTS (
       SELECT 1
         FROM (
           SELECT (e->>'user_card_id')::uuid AS uc_id
             FROM jsonb_array_elements(t.initiator_cards) e
           UNION ALL
           SELECT (e->>'user_card_id')::uuid
             FROM jsonb_array_elements(t.recipient_cards) e
         ) y
        WHERE y.uc_id = ANY(involved_ids)
     );

  ------------------------------------------------------------------
  -- 9) Cancel other active listings backed by ANY involved card,
  --    excluding this trade's linked listing.
  ------------------------------------------------------------------
  UPDATE public.marketplace_listings ml
     SET status = 'cancelled', updated_at = now()
   WHERE ml.status = 'active'
     AND ml.id <> listing_id
     AND ml.user_card_id = ANY(involved_ids);

  RETURN trade_row;
END;
$fn$;

-- ============================================================
-- 1. Marketplace: trade-only normalization + snapshot trigger
-- ============================================================

-- Normalize legacy rows to trade-only, clear any asking_price
UPDATE public.marketplace_listings
   SET listing_type = 'trade',
       asking_price = NULL
 WHERE listing_type <> 'trade' OR asking_price IS NOT NULL;

-- Deduplicate: keep newest active/pending per user_card_id, cancel the rest
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_card_id
           ORDER BY (status = 'pending') DESC, created_at DESC
         ) AS rn
    FROM public.marketplace_listings
   WHERE status IN ('active','pending')
)
UPDATE public.marketplace_listings ml
   SET status = 'cancelled', updated_at = now()
  FROM ranked r
 WHERE ml.id = r.id AND r.rn > 1;

-- Constrain listing_type to 'trade'
ALTER TABLE public.marketplace_listings DROP CONSTRAINT IF EXISTS marketplace_listings_listing_type_check;
ALTER TABLE public.marketplace_listings
  ADD CONSTRAINT marketplace_listings_listing_type_check
  CHECK (listing_type = 'trade');

-- Partial unique index: one active/pending listing per user_card_id
DROP INDEX IF EXISTS uniq_active_listing_per_user_card;
CREATE UNIQUE INDEX uniq_active_listing_per_user_card
  ON public.marketplace_listings (user_card_id)
  WHERE status IN ('active','pending');

-- Snapshot trigger: source identity from user_cards; forbid link mutation
CREATE OR REPLACE FUNCTION public.marketplace_listing_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uc public.user_cards;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id <> OLD.user_id THEN
      RAISE EXCEPTION 'user_id is immutable on marketplace_listings';
    END IF;
    IF NEW.user_card_id IS DISTINCT FROM OLD.user_card_id THEN
      RAISE EXCEPTION 'user_card_id is immutable on marketplace_listings';
    END IF;
  END IF;

  IF NEW.user_card_id IS NULL THEN
    RAISE EXCEPTION 'user_card_id is required';
  END IF;

  SELECT * INTO uc FROM public.user_cards WHERE id = NEW.user_card_id;
  IF uc.id IS NULL THEN
    RAISE EXCEPTION 'Linked collection card not found';
  END IF;
  IF uc.user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'Collection card is not owned by listing user';
  END IF;

  -- Trusted snapshot (overrides any client-supplied identity fields)
  NEW.card_id         := uc.card_id;
  NEW.card_name       := COALESCE(uc.card_name, '');
  NEW.image_url       := uc.card_image;
  NEW.image_url_small := uc.card_image;
  NEW.set_id          := uc.set_id;
  NEW.set_name        := uc.set_name;
  NEW.card_number     := uc.card_number;
  NEW.rarity          := uc.rarity;
  NEW.condition       := COALESCE(uc.condition, 'near_mint');
  NEW.is_graded       := uc.is_graded;
  NEW.grade_company   := uc.grading_company;
  NEW.grade_score     := CASE
                            WHEN uc.grade_score IS NULL OR uc.grade_score = '' THEN NULL
                            ELSE NULLIF(regexp_replace(uc.grade_score, '[^0-9.]', '', 'g'), '')::numeric
                          END;
  NEW.quantity        := GREATEST(uc.quantity, 1);

  -- Trade-only enforcement
  NEW.listing_type := 'trade';
  NEW.asking_price := NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_listing_snapshot ON public.marketplace_listings;
CREATE TRIGGER trg_marketplace_listing_snapshot
  BEFORE INSERT OR UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.marketplace_listing_snapshot();

-- ============================================================
-- 2. user_cards: block mutation/deletion while reserved in a live trade
-- ============================================================

CREATE OR REPLACE FUNCTION public.user_card_locked_in_live_trade(_user_card_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.trades t,
           LATERAL (
             SELECT (e->>'user_card_id') AS uc_id
               FROM jsonb_array_elements(
                      CASE WHEN jsonb_typeof(t.initiator_cards) = 'array'
                           THEN t.initiator_cards ELSE '[]'::jsonb END
                    ) e
             UNION ALL
             SELECT (e->>'user_card_id')
               FROM jsonb_array_elements(
                      CASE WHEN jsonb_typeof(t.recipient_cards) = 'array'
                           THEN t.recipient_cards ELSE '[]'::jsonb END
                    ) e
           ) x
     WHERE t.status IN ('accepted','shipped','disputed')
       AND x.uc_id = _user_card_id::text
  );
$$;

DROP POLICY IF EXISTS "Users can update their own cards" ON public.user_cards;
CREATE POLICY "Users can update their own cards" ON public.user_cards
  FOR UPDATE
  USING (auth.uid() = user_id AND NOT public.user_card_locked_in_live_trade(id))
  WITH CHECK (auth.uid() = user_id AND NOT public.user_card_locked_in_live_trade(id));

DROP POLICY IF EXISTS "Users can delete their own cards" ON public.user_cards;
CREATE POLICY "Users can delete their own cards" ON public.user_cards
  FOR DELETE
  USING (auth.uid() = user_id AND NOT public.user_card_locked_in_live_trade(id));

-- ============================================================
-- 3. propose_trade: snapshot real quantities
-- ============================================================

CREATE OR REPLACE FUNCTION public.propose_trade(_listing_id uuid, _offered_user_card_ids uuid[], _message text DEFAULT NULL::text)
 RETURNS public.trades
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  listing public.marketplace_listings;
  listed_card public.user_cards;
  offered_cards jsonb;
  recipient_snapshot jsonb;
  trade_row public.trades;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _offered_user_card_ids IS NULL OR array_length(_offered_user_card_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Select at least one card to offer';
  END IF;

  SELECT * INTO listing FROM public.marketplace_listings WHERE id = _listing_id;
  IF listing.id IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF listing.status <> 'active' THEN RAISE EXCEPTION 'Listing is not active'; END IF;
  IF listing.user_id = caller THEN RAISE EXCEPTION 'Cannot propose against your own listing'; END IF;
  IF listing.user_card_id IS NULL THEN
    RAISE EXCEPTION 'Listing is no longer backed by a tradable collection card';
  END IF;

  SELECT * INTO listed_card
    FROM public.user_cards
   WHERE id = listing.user_card_id
     AND user_id = listing.user_id
     AND for_trade = true
     AND card_id = listing.card_id;
  IF listed_card.id IS NULL THEN
    RAISE EXCEPTION 'Listing is no longer backed by a tradable collection card';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(_offered_user_card_ids) AS oid
    LEFT JOIN public.user_cards uc ON uc.id = oid
    WHERE uc.id IS NULL OR uc.user_id <> caller OR uc.for_trade = false
  ) THEN
    RAISE EXCEPTION 'One or more offered cards are not owned by you or not marked for trade';
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id', uc.card_id,
    'user_card_id', uc.id,
    'card_name', uc.card_name,
    'imageUrl', uc.card_image,
    'condition', COALESCE(uc.condition,'near_mint'),
    'estimatedValue', COALESCE(uc.trade_value::text,'0'),
    'quantity', GREATEST(uc.quantity, 1),
    'graded', uc.is_graded,
    'grading_company', uc.grading_company,
    'grade_score', uc.grade_score
  ))
  INTO offered_cards
  FROM public.user_cards uc
  WHERE uc.id = ANY(_offered_user_card_ids);

  recipient_snapshot := jsonb_build_array(jsonb_build_object(
    'id', listed_card.card_id,
    'listing_id', listing.id,
    'user_card_id', listed_card.id,
    'card_name', listed_card.card_name,
    'imageUrl', listed_card.card_image,
    'condition', COALESCE(listed_card.condition,'near_mint'),
    'estimatedValue', COALESCE(listed_card.trade_value::text,'0'),
    'quantity', GREATEST(listed_card.quantity, 1),
    'graded', listed_card.is_graded,
    'grading_company', listed_card.grading_company,
    'grade_score', listed_card.grade_score
  ));

  INSERT INTO public.trades (
    initiator_user_id, recipient_user_id, status,
    initiator_cards, recipient_cards, description, metadata
  ) VALUES (
    caller, listing.user_id, 'proposed',
    offered_cards, recipient_snapshot,
    NULLIF(trim(coalesce(_message,'')),''),
    jsonb_build_object('listing_id', listing.id, 'user_card_id', listed_card.id)
  ) RETURNING * INTO trade_row;

  RETURN trade_row;
END;
$function$;

-- ============================================================
-- 4. Ownership-transfer audit table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trade_ownership_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_card_id uuid NOT NULL,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  transferred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trade_id, user_card_id)
);

GRANT SELECT ON public.trade_ownership_transfers TO authenticated;
GRANT ALL ON public.trade_ownership_transfers TO service_role;

ALTER TABLE public.trade_ownership_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view transfers for their trades" ON public.trade_ownership_transfers;
CREATE POLICY "Participants can view transfers for their trades"
  ON public.trade_ownership_transfers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trades t
       WHERE t.id = trade_ownership_transfers.trade_id
         AND auth.uid() IN (t.initiator_user_id, t.recipient_user_id)
    )
  );

-- No client writes; only SECURITY DEFINER functions can write.

-- ============================================================
-- 5. confirm_trade_receipt: atomic dual-confirm + ownership swap
-- ============================================================

CREATE OR REPLACE FUNCTION public.confirm_trade_receipt(_trade_id uuid)
 RETURNS public.trades
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  t public.trades;
  listing_id uuid;
  init_ids uuid[];
  recp_ids uuid[];
  all_ids uuid[];
  ok_count int;
  uid uuid;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO t FROM public.trades WHERE id = _trade_id FOR UPDATE;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Trade not found'; END IF;
  IF caller NOT IN (t.initiator_user_id, t.recipient_user_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  IF t.status <> 'shipped' THEN
    RAISE EXCEPTION 'Trade must be shipped before confirming receipt';
  END IF;

  IF caller = t.initiator_user_id THEN
    IF t.initiator_confirmed_at IS NULL THEN
      UPDATE public.trades
         SET initiator_confirmed_at = now(), updated_at = now()
       WHERE id = _trade_id
      RETURNING * INTO t;
    END IF;
  ELSE
    IF t.recipient_confirmed_at IS NULL THEN
      UPDATE public.trades
         SET recipient_confirmed_at = now(), updated_at = now()
       WHERE id = _trade_id
      RETURNING * INTO t;
    END IF;
  END IF;

  -- Only proceed to completion when both sides have confirmed and still 'shipped'
  IF t.initiator_confirmed_at IS NULL
     OR t.recipient_confirmed_at IS NULL
     OR t.status <> 'shipped' THEN
    RETURN t;
  END IF;

  -- Collect user_card_ids from snapshots (text->uuid)
  SELECT COALESCE(array_agg((e->>'user_card_id')::uuid), ARRAY[]::uuid[])
    INTO init_ids
    FROM jsonb_array_elements(
           CASE WHEN jsonb_typeof(t.initiator_cards)='array' THEN t.initiator_cards ELSE '[]'::jsonb END
         ) e
   WHERE (e->>'user_card_id') ~ '^[0-9a-fA-F-]{36}$';

  SELECT COALESCE(array_agg((e->>'user_card_id')::uuid), ARRAY[]::uuid[])
    INTO recp_ids
    FROM jsonb_array_elements(
           CASE WHEN jsonb_typeof(t.recipient_cards)='array' THEN t.recipient_cards ELSE '[]'::jsonb END
         ) e
   WHERE (e->>'user_card_id') ~ '^[0-9a-fA-F-]{36}$';

  IF array_length(init_ids, 1) IS NULL OR array_length(recp_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Trade snapshots are missing card references';
  END IF;

  SELECT array_agg(x ORDER BY x) INTO all_ids
    FROM (SELECT DISTINCT unnest(init_ids || recp_ids) x) s;

  -- Lock the involved user_cards deterministically
  PERFORM 1 FROM (
    SELECT id FROM public.user_cards WHERE id = ANY(all_ids) ORDER BY id FOR UPDATE
  ) locked;

  -- Validate initiator side is still owned by initiator and reserved
  SELECT count(*) INTO ok_count
    FROM public.user_cards
   WHERE id = ANY(init_ids)
     AND user_id = t.initiator_user_id
     AND for_trade = false;
  IF ok_count <> array_length(init_ids, 1) THEN
    RAISE EXCEPTION 'Initiator cards are no longer reserved or owned';
  END IF;

  SELECT count(*) INTO ok_count
    FROM public.user_cards
   WHERE id = ANY(recp_ids)
     AND user_id = t.recipient_user_id
     AND for_trade = false;
  IF ok_count <> array_length(recp_ids, 1) THEN
    RAISE EXCEPTION 'Recipient cards are no longer reserved or owned';
  END IF;

  -- Mark linked listing completed before ownership change
  listing_id := (t.metadata->>'listing_id')::uuid;
  IF listing_id IS NOT NULL THEN
    UPDATE public.marketplace_listings
       SET status = 'completed', updated_at = now()
     WHERE id = listing_id
       AND status IN ('pending','active');
  END IF;

  -- Record audit rows (idempotent via unique constraint)
  INSERT INTO public.trade_ownership_transfers (trade_id, user_card_id, from_user_id, to_user_id)
    SELECT t.id, uid, t.initiator_user_id, t.recipient_user_id FROM unnest(init_ids) uid
    ON CONFLICT (trade_id, user_card_id) DO NOTHING;
  INSERT INTO public.trade_ownership_transfers (trade_id, user_card_id, from_user_id, to_user_id)
    SELECT t.id, uid, t.recipient_user_id, t.initiator_user_id FROM unnest(recp_ids) uid
    ON CONFLICT (trade_id, user_card_id) DO NOTHING;

  -- Swap ownership; ensure for_trade/for_sale remain false
  UPDATE public.user_cards
     SET user_id = t.recipient_user_id, for_trade = false, for_sale = false, updated_at = now()
   WHERE id = ANY(init_ids);
  UPDATE public.user_cards
     SET user_id = t.initiator_user_id, for_trade = false, for_sale = false, updated_at = now()
   WHERE id = ANY(recp_ids);

  -- Move linked card_images to the new owner
  UPDATE public.card_images
     SET user_id = t.recipient_user_id
   WHERE user_card_id = ANY(init_ids);
  UPDATE public.card_images
     SET user_id = t.initiator_user_id
   WHERE user_card_id = ANY(recp_ids);

  -- Complete the trade
  UPDATE public.trades
     SET status = 'completed', completed_at = now(), updated_at = now()
   WHERE id = _trade_id AND status = 'shipped'
  RETURNING * INTO t;

  -- Increment trade counters once per participant
  UPDATE public.profiles
     SET total_trades = total_trades + 1,
         successful_trades = successful_trades + 1,
         updated_at = now()
   WHERE user_id IN (t.initiator_user_id, t.recipient_user_id);

  RETURN t;
END;
$function$;

-- ============================================================
-- 6. Storage: card-images update/delete tied to card_images ownership
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_manage_card_image_object(_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN auth.uid() IS NULL THEN false
      -- If the object is linked to a card_images row, only the current owner may manage it.
      WHEN EXISTS (SELECT 1 FROM public.card_images ci WHERE ci.image_path = _name)
        THEN EXISTS (
          SELECT 1 FROM public.card_images ci
           WHERE ci.image_path = _name
             AND ci.user_id = auth.uid()
        )
      -- Otherwise (unlinked upload) fall back to own-folder rule.
      ELSE (auth.uid())::text = (storage.foldername(_name))[1]
    END;
$$;

DROP POLICY IF EXISTS "Users delete own card-images" ON storage.objects;
CREATE POLICY "Users delete own card-images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'card-images' AND public.can_manage_card_image_object(name));

DROP POLICY IF EXISTS "Users update own card-images" ON storage.objects;
CREATE POLICY "Users update own card-images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'card-images' AND public.can_manage_card_image_object(name));

REVOKE ALL ON FUNCTION public.marketplace_listing_snapshot() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_manage_card_image_object(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_card_locked_in_live_trade(uuid) FROM PUBLIC, anon;
-- Keep authenticated EXECUTE on the two helpers referenced by RLS/storage policies
GRANT EXECUTE ON FUNCTION public.can_manage_card_image_object(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_card_locked_in_live_trade(uuid) TO authenticated;
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

-- CollectX new-project compatibility and least-privilege API grants.
DROP TABLE IF EXISTS public.escrow_transactions CASCADE;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif']
WHERE id = 'card-images';

DROP POLICY IF EXISTS "Users select own avatar objects" ON storage.objects;
DROP POLICY IF EXISTS "Users insert own avatar objects" ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatar objects" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatar objects" ON storage.objects;

CREATE POLICY "Users select own avatar objects"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users insert own avatar objects"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users update own avatar objects"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own avatar objects"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
);

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_cards TO authenticated;
GRANT SELECT ON public.card_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.card_images TO authenticated;

GRANT SELECT ON public.marketplace_listings TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.marketplace_interests TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.marketplace_favorites TO authenticated;

GRANT SELECT ON public.trades TO authenticated;
GRANT SELECT, INSERT ON public.trade_messages TO authenticated;
GRANT SELECT ON public.trade_addresses TO authenticated;
GRANT SELECT ON public.trade_shipments TO authenticated;
GRANT SELECT ON public.trade_ownership_transfers TO authenticated;

GRANT SELECT ON public.trade_ratings TO anon, authenticated;
GRANT INSERT ON public.trade_ratings TO authenticated;

GRANT SELECT ON public.shipping_methods, public.shipping_rates TO anon, authenticated;
GRANT SELECT ON public.tracking_events TO authenticated;

GRANT SELECT ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT SELECT ON public.chat_conversations TO authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;

REVOKE ALL ON FUNCTION public.increment_listing_views(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_listing_views(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

DO $verify$
DECLARE
  missing_rls text;
BEGIN
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
    INTO missing_rls
    FROM pg_tables
   WHERE schemaname = 'public'
     AND NOT rowsecurity;

  IF missing_rls IS NOT NULL THEN
    RAISE EXCEPTION 'Public tables without RLS: %', missing_rls;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars')
     OR NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'card-images') THEN
    RAISE EXCEPTION 'Required storage buckets were not created';
  END IF;
END
$verify$;

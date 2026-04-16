
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

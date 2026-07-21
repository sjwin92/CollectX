
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

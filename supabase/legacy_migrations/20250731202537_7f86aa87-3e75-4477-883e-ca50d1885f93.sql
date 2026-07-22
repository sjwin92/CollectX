-- Create marketplace_listings table
CREATE TABLE public.marketplace_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_id TEXT NOT NULL,
  card_name TEXT NOT NULL,
  set_id TEXT NOT NULL,
  set_name TEXT NOT NULL,
  card_number TEXT,
  rarity TEXT,
  image_url TEXT,
  image_url_small TEXT,
  condition TEXT NOT NULL DEFAULT 'near_mint',
  is_graded BOOLEAN DEFAULT false,
  grade_company TEXT,
  grade_score NUMERIC,
  quantity INTEGER NOT NULL DEFAULT 1,
  listing_type TEXT NOT NULL DEFAULT 'trade' CHECK (listing_type IN ('trade', 'sale', 'both')),
  asking_price NUMERIC,
  trade_preferences TEXT,
  description TEXT,
  featured BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'completed', 'cancelled', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE,
  views_count INTEGER DEFAULT 0,
  interested_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create marketplace_interests table for tracking user interest
CREATE TABLE public.marketplace_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  interest_type TEXT NOT NULL DEFAULT 'trade' CHECK (interest_type IN ('trade', 'buy')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(listing_id, user_id)
);

-- Create marketplace_favorites table for user favorites
CREATE TABLE public.marketplace_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(listing_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketplace_listings
CREATE POLICY "Anyone can view active listings" 
ON public.marketplace_listings 
FOR SELECT 
USING (status = 'active');

CREATE POLICY "Users can create their own listings" 
ON public.marketplace_listings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listings" 
ON public.marketplace_listings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listings" 
ON public.marketplace_listings 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for marketplace_interests
CREATE POLICY "Users can view interests on their listings" 
ON public.marketplace_interests 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.marketplace_listings 
    WHERE marketplace_listings.id = marketplace_interests.listing_id 
    AND marketplace_listings.user_id = auth.uid()
  )
);

CREATE POLICY "Users can express interest" 
ON public.marketplace_interests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interests" 
ON public.marketplace_interests 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interests" 
ON public.marketplace_interests 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for marketplace_favorites
CREATE POLICY "Users can view their own favorites" 
ON public.marketplace_favorites 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites" 
ON public.marketplace_favorites 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their favorites" 
ON public.marketplace_favorites 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_marketplace_listings_user_id ON public.marketplace_listings(user_id);
CREATE INDEX idx_marketplace_listings_status ON public.marketplace_listings(status);
CREATE INDEX idx_marketplace_listings_listing_type ON public.marketplace_listings(listing_type);
CREATE INDEX idx_marketplace_listings_card_name ON public.marketplace_listings(card_name);
CREATE INDEX idx_marketplace_listings_set_id ON public.marketplace_listings(set_id);
CREATE INDEX idx_marketplace_listings_created_at ON public.marketplace_listings(created_at);
CREATE INDEX idx_marketplace_listings_featured ON public.marketplace_listings(featured);
CREATE INDEX idx_marketplace_interests_listing_id ON public.marketplace_interests(listing_id);
CREATE INDEX idx_marketplace_interests_user_id ON public.marketplace_interests(user_id);
CREATE INDEX idx_marketplace_favorites_listing_id ON public.marketplace_favorites(listing_id);
CREATE INDEX idx_marketplace_favorites_user_id ON public.marketplace_favorites(user_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_marketplace_listings_updated_at
  BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to increment views
CREATE OR REPLACE FUNCTION public.increment_listing_views(listing_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.marketplace_listings 
  SET views_count = views_count + 1 
  WHERE id = listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update interested count
CREATE OR REPLACE FUNCTION public.update_interested_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.marketplace_listings 
    SET interested_count = interested_count + 1 
    WHERE id = NEW.listing_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.marketplace_listings 
    SET interested_count = interested_count - 1 
    WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for interested count
CREATE TRIGGER update_marketplace_interested_count
  AFTER INSERT OR DELETE ON public.marketplace_interests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_interested_count();

-- Enable realtime for marketplace tables
ALTER TABLE public.marketplace_listings REPLICA IDENTITY FULL;
ALTER TABLE public.marketplace_interests REPLICA IDENTITY FULL;
ALTER TABLE public.marketplace_favorites REPLICA IDENTITY FULL;
-- Create card collections table
CREATE TABLE public.user_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  card_name TEXT NOT NULL,
  set_id TEXT NOT NULL,
  set_name TEXT NOT NULL,
  card_number TEXT,
  rarity TEXT,
  image_url TEXT,
  image_url_small TEXT,
  tcg_player_url TEXT,
  
  -- Collection specific fields
  quantity INTEGER NOT NULL DEFAULT 1,
  condition TEXT DEFAULT 'near_mint',
  is_graded BOOLEAN DEFAULT false,
  grade_company TEXT,
  grade_score NUMERIC,
  grade_population INTEGER,
  
  -- Trading fields
  for_trade BOOLEAN DEFAULT false,
  trade_value NUMERIC,
  
  -- Product type fields
  product_type TEXT DEFAULT 'single' CHECK (product_type IN ('single', 'sealed')),
  sealed_product_type TEXT,
  release_date DATE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure user can't have duplicate cards with same attributes
  UNIQUE(user_id, card_id, condition, is_graded, grade_company, grade_score, product_type, sealed_product_type)
);

-- Enable Row Level Security
ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;

-- Create policies for user_cards
CREATE POLICY "Users can view their own cards" 
ON public.user_cards 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cards" 
ON public.user_cards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards" 
ON public.user_cards 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cards" 
ON public.user_cards 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on user_cards
CREATE TRIGGER update_user_cards_updated_at
BEFORE UPDATE ON public.user_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_user_cards_user_id ON public.user_cards(user_id);
CREATE INDEX idx_user_cards_card_id ON public.user_cards(card_id);
CREATE INDEX idx_user_cards_set_id ON public.user_cards(set_id);
CREATE INDEX idx_user_cards_for_trade ON public.user_cards(for_trade) WHERE for_trade = true;
CREATE INDEX idx_user_cards_graded ON public.user_cards(is_graded) WHERE is_graded = true;

-- Create user wishlist table (optional feature)
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
  
  -- Ensure user can't have duplicate wishlist items
  UNIQUE(user_id, card_id)
);

-- Enable Row Level Security on wishlist
ALTER TABLE public.user_wishlist ENABLE ROW LEVEL SECURITY;

-- Create policies for user_wishlist
CREATE POLICY "Users can view their own wishlist" 
ON public.user_wishlist 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wishlist items" 
ON public.user_wishlist 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wishlist items" 
ON public.user_wishlist 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wishlist items" 
ON public.user_wishlist 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for wishlist
CREATE INDEX idx_user_wishlist_user_id ON public.user_wishlist(user_id);
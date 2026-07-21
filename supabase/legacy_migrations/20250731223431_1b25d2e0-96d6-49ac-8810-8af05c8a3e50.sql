-- Create tables for Pokemon data that don't conflict with existing ones
-- Only create tables that don't already exist

-- Pokemon Sets table
CREATE TABLE IF NOT EXISTS public.pokemon_sets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  series TEXT,
  printed_total INTEGER,
  total INTEGER,
  ptcgo_code TEXT,
  release_date DATE,
  logo_url TEXT,
  symbol_url TEXT,
  legalities JSONB,
  images JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pokemon Cards table
CREATE TABLE IF NOT EXISTS public.pokemon_cards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  supertype TEXT,
  subtypes TEXT[],
  hp TEXT,
  types TEXT[],
  evolves_from TEXT,
  evolves_to TEXT[],
  abilities JSONB,
  attacks JSONB,
  weaknesses JSONB,
  resistances JSONB,
  retreat_cost TEXT[],
  converted_retreat_cost INTEGER,
  set_id TEXT REFERENCES public.pokemon_sets(id),
  set_name TEXT,
  number TEXT,
  artist TEXT,
  rarity TEXT,
  flavor_text TEXT,
  national_pokedex_numbers INTEGER[],
  legalities JSONB,
  regulation_mark TEXT,
  images JSONB,
  tcgplayer_prices JSONB,
  cardmarket_prices JSONB,
  rules TEXT[],
  small_image_url TEXT,
  large_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set Images table for storing multiple logo/symbol sources
CREATE TABLE IF NOT EXISTS public.set_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id TEXT REFERENCES public.pokemon_sets(id),
  image_type TEXT NOT NULL, -- 'logo', 'symbol'
  image_url TEXT NOT NULL,
  source TEXT NOT NULL,
  is_working BOOLEAN DEFAULT true,
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.pokemon_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_images ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Pokemon sets are viewable by everyone" 
ON public.pokemon_sets FOR SELECT USING (true);

CREATE POLICY "Pokemon cards are viewable by everyone" 
ON public.pokemon_cards FOR SELECT USING (true);

CREATE POLICY "Set images are viewable by everyone" 
ON public.set_images FOR SELECT USING (true);

-- Create policies for authenticated users to insert/update data
CREATE POLICY "Authenticated users can manage pokemon sets" 
ON public.pokemon_sets FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage pokemon cards" 
ON public.pokemon_cards FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage set images" 
ON public.set_images FOR ALL USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_set_id ON public.pokemon_cards(set_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_name ON public.pokemon_cards(name);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_rarity ON public.pokemon_cards(rarity);
CREATE INDEX IF NOT EXISTS idx_set_images_set_id ON public.set_images(set_id);
CREATE INDEX IF NOT EXISTS idx_set_images_working ON public.set_images(is_working);

-- Create triggers for automatic timestamp updates (only if tables were created)
CREATE TRIGGER update_pokemon_sets_updated_at
  BEFORE UPDATE ON public.pokemon_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pokemon_cards_updated_at
  BEFORE UPDATE ON public.pokemon_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
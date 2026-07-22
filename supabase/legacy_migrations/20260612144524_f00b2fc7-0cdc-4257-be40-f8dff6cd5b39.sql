
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

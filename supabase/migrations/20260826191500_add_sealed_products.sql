-- Sealed product catalogue (Booster Boxes, ETBs, Bundles, Blisters, Tins,
-- Cases, Decks). Source: tcgcsv.com — a free, no-auth static-JSON mirror of
-- TCGplayer's catalogue (same price source as the singles pricing on
-- pokemon_cards.tcgplayer_prices). Replaces the never-configured
-- ebay-integration function for sealed data.
--
-- One row per TCGplayer productId. `set_id` links back to pokemon_sets when we
-- could match the TCGCSV group (by TCGplayer abbreviation <-> ptcgo_code, else
-- fuzzy name); left null when unmatched so the row is still usable on /products.

CREATE TABLE IF NOT EXISTS public.sealed_products (
  id                 BIGINT PRIMARY KEY,               -- TCGplayer productId
  set_id             TEXT REFERENCES public.pokemon_sets(id) ON DELETE SET NULL,
  group_id           INTEGER NOT NULL,                 -- TCGCSV / TCGplayer groupId
  group_name         TEXT,
  name               TEXT NOT NULL,
  product_type       TEXT NOT NULL DEFAULT 'other',    -- box | etb | bundle | blister | tin | case | deck | other
  image_url          TEXT,
  tcgplayer_url      TEXT,
  market_price_usd   NUMERIC(10,2),
  low_price_usd      NUMERIC(10,2),
  released_on        DATE,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sealed_products_set_idx   ON public.sealed_products(set_id);
CREATE INDEX IF NOT EXISTS sealed_products_group_idx ON public.sealed_products(group_id);

-- Freshness tracking for the refresh function (one row per TCGCSV group).
CREATE TABLE IF NOT EXISTS public.sealed_product_imports (
  group_id          INTEGER PRIMARY KEY,
  set_id            TEXT,
  last_imported_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  product_count     INTEGER NOT NULL DEFAULT 0,
  last_error        TEXT
);

GRANT SELECT ON public.sealed_products         TO anon, authenticated;
GRANT SELECT ON public.sealed_product_imports  TO anon, authenticated;
GRANT ALL    ON public.sealed_products         TO service_role;
GRANT ALL    ON public.sealed_product_imports  TO service_role;

ALTER TABLE public.sealed_products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sealed_product_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sealed products are public"
  ON public.sealed_products FOR SELECT USING (true);
CREATE POLICY "Sealed product imports are public"
  ON public.sealed_product_imports FOR SELECT USING (true);

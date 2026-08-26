-- CollectX for Business — Phase 2a: the inventory engine.
-- A store's stock is a SKU ledger with quantities + a price rule that
-- re-prices itself (see the refresh-store-prices edge function), not a pile
-- of individual user_cards rows. Parallel to marketplace_listings, the way
-- orders parallels trades. Buyer checkout for store SKUs is Phase 2b.

-- ============================================================================
-- 1. store_price_rules — "list at X% of market, floor £Y, never below cost"
-- ============================================================================
CREATE TABLE public.store_price_rules (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         uuid NOT NULL REFERENCES public.store_profiles(user_id) ON DELETE CASCADE,
  name             text NOT NULL DEFAULT 'Default',
  pct_of_market    int NOT NULL DEFAULT 95 CHECK (pct_of_market BETWEEN 1 AND 500),
  floor_gbp        numeric(12,2) NOT NULL DEFAULT 0.50 CHECK (floor_gbp >= 0),
  never_below_cost boolean NOT NULL DEFAULT true,
  is_default       boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX store_price_rules_store_idx ON public.store_price_rules (store_id);
CREATE UNIQUE INDEX store_price_rules_one_default ON public.store_price_rules (store_id) WHERE is_default;

ALTER TABLE public.store_price_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owner manages own price rules"
  ON public.store_price_rules FOR ALL
  USING (auth.uid() = store_id)
  WITH CHECK (auth.uid() = store_id);

CREATE TRIGGER update_store_price_rules_updated_at
  BEFORE UPDATE ON public.store_price_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_price_rules TO authenticated;
GRANT ALL ON public.store_price_rules TO service_role;

-- ============================================================================
-- 2. store_inventory — the SKU ledger
-- ============================================================================
CREATE TABLE public.store_inventory (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES public.store_profiles(user_id) ON DELETE CASCADE,
  card_id       text NOT NULL,
  card_name     text NOT NULL,
  set_id        text,
  set_name      text,
  card_number   text,
  rarity        text,
  image_url     text,
  condition     text NOT NULL DEFAULT 'near_mint',
  is_graded     boolean NOT NULL DEFAULT false,
  grade_company text,
  grade_score   numeric,
  quantity      int NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved      int NOT NULL DEFAULT 0 CHECK (reserved >= 0),   -- in-flight checkouts (Phase 2b)
  cost_gbp      numeric(12,2),
  price_gbp     numeric(12,2),
  price_rule_id uuid REFERENCES public.store_price_rules(id) ON DELETE SET NULL,
  bin           text,
  listed        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, card_id, condition, is_graded, grade_company, grade_score)
);

CREATE INDEX store_inventory_store_idx ON public.store_inventory (store_id);
CREATE INDEX store_inventory_card_idx  ON public.store_inventory (card_id);
-- The marketplace reads live store stock from here (Phase 2b).
CREATE INDEX store_inventory_live_idx  ON public.store_inventory (store_id)
  WHERE listed AND price_gbp IS NOT NULL AND quantity > reserved;

ALTER TABLE public.store_inventory ENABLE ROW LEVEL SECURITY;

-- Owner sees + manages everything; the public sees only live, priced, in-stock
-- rows belonging to an ACTIVE store (so pending stores can prep privately).
CREATE POLICY "Store owner manages own inventory"
  ON public.store_inventory FOR ALL
  USING (auth.uid() = store_id)
  WITH CHECK (auth.uid() = store_id);

CREATE POLICY "Live store inventory is public"
  ON public.store_inventory FOR SELECT
  USING (
    listed
    AND price_gbp IS NOT NULL
    AND quantity > reserved
    AND public.is_active_store(store_id)
  );

CREATE TRIGGER update_store_inventory_updated_at
  BEFORE UPDATE ON public.store_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_inventory TO authenticated;
GRANT SELECT ON public.store_inventory TO anon;
GRANT ALL ON public.store_inventory TO service_role;

-- ============================================================================
-- 3. seed_default_price_rule() — give a new store one editable rule to start.
-- Called from the store setup flow; idempotent.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ensure_default_price_rule()
RETURNS public.store_price_rules
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.store_price_rules;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.store_profiles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'no store profile';
  END IF;

  SELECT * INTO r FROM public.store_price_rules WHERE store_id = auth.uid() AND is_default;
  IF r.id IS NULL THEN
    INSERT INTO public.store_price_rules (store_id, name, is_default)
    VALUES (auth.uid(), 'Default', true)
    RETURNING * INTO r;
  END IF;
  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_default_price_rule() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_default_price_rule() TO authenticated;

-- Normalise every stored card-condition string to the canonical vocabulary
-- (M / NM / LP / MP / HP / D / SEALED). Before this the app wrote three
-- different vocabularies to different tables, which broke the marketplace
-- condition filter and made buylist scope-matching miss.
--
-- Deterministic, idempotent (canonical values map to themselves). Mirrors
-- src/lib/cardCondition.ts.

CREATE OR REPLACE FUNCTION public.canonical_card_condition(_raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE regexp_replace(regexp_replace(lower(trim(coalesce(_raw, ''))), '[_/-]+', ' ', 'g'), '\s+', ' ', 'g')
    WHEN 'm' THEN 'M'
    WHEN 'mint' THEN 'M'
    WHEN 'gem mint' THEN 'M'
    WHEN 'gem' THEN 'M'
    WHEN 'gm' THEN 'M'
    WHEN 'nm' THEN 'NM'
    WHEN 'near mint' THEN 'NM'
    WHEN 'nearmint' THEN 'NM'
    WHEN 'nm mint' THEN 'NM'
    WHEN 'nm m' THEN 'NM'
    WHEN 'near mint mint' THEN 'NM'
    WHEN 'lp' THEN 'LP'
    WHEN 'lightly played' THEN 'LP'
    WHEN 'light play' THEN 'LP'
    WHEN 'lightplay' THEN 'LP'
    WHEN 'excellent' THEN 'LP'
    WHEN 'ex' THEN 'LP'
    WHEN 'exc' THEN 'LP'
    WHEN 'mp' THEN 'MP'
    WHEN 'moderately played' THEN 'MP'
    WHEN 'moderate play' THEN 'MP'
    WHEN 'good' THEN 'MP'
    WHEN 'played' THEN 'MP'
    WHEN 'vg' THEN 'MP'
    WHEN 'very good' THEN 'MP'
    WHEN 'hp' THEN 'HP'
    WHEN 'heavily played' THEN 'HP'
    WHEN 'heavy play' THEN 'HP'
    WHEN 'poor' THEN 'HP'
    WHEN 'pl' THEN 'HP'
    WHEN 'd' THEN 'D'
    WHEN 'dmg' THEN 'D'
    WHEN 'damaged' THEN 'D'
    WHEN 'damage' THEN 'D'
    WHEN 'dm' THEN 'D'
    WHEN 'sealed' THEN 'SEALED'
    WHEN 'new' THEN 'SEALED'
    WHEN 'factory sealed' THEN 'SEALED'
    ELSE 'NM'
  END
$$;

-- user_cards: sealed products keep SEALED; everything else canonicalised.
UPDATE public.user_cards
   SET condition = CASE
         WHEN coalesce(product_type, 'single') <> 'single' THEN 'SEALED'
         ELSE public.canonical_card_condition(condition)
       END,
       updated_at = now()
 WHERE condition IS DISTINCT FROM (CASE
         WHEN coalesce(product_type, 'single') <> 'single' THEN 'SEALED'
         ELSE public.canonical_card_condition(condition)
       END);

UPDATE public.marketplace_listings
   SET condition = public.canonical_card_condition(condition), updated_at = now()
 WHERE condition IS DISTINCT FROM public.canonical_card_condition(condition);

UPDATE public.store_inventory
   SET condition = public.canonical_card_condition(condition), updated_at = now()
 WHERE condition IS DISTINCT FROM public.canonical_card_condition(condition);

-- store_buylist / buylist_orders: NULL condition means "any" — leave those.
UPDATE public.store_buylist
   SET condition = public.canonical_card_condition(condition), updated_at = now()
 WHERE condition IS NOT NULL
   AND condition IS DISTINCT FROM public.canonical_card_condition(condition);

UPDATE public.buylist_orders
   SET condition = public.canonical_card_condition(condition), updated_at = now()
 WHERE condition IS NOT NULL
   AND condition IS DISTINCT FROM public.canonical_card_condition(condition);

UPDATE public.store_orders
   SET condition = public.canonical_card_condition(condition), updated_at = now()
 WHERE condition IS NOT NULL
   AND condition IS DISTINCT FROM public.canonical_card_condition(condition);

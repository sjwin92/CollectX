-- Purge digital redemption codes (Pokémon TCG Live "Code Card - …" products)
-- from the sealed catalogue — they're worthless (~$0.03) and cheapen the UI.
-- refresh-sealed-products now filters them on ingest so they won't return.

DELETE FROM public.sealed_products
WHERE name ILIKE 'Code Card%'
   OR name ILIKE '%online code%';

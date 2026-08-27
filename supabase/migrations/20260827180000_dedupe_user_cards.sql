-- Collapse duplicate collection rows.
--
-- addCardToCollection's "does this card already exist" check used
-- `.eq('grading_company', null)`, which in PostgREST never matches a NULL —
-- so every quick-add of a non-graded card inserted a brand-new user_cards
-- row instead of bumping quantity. Result: the same card shows up as many
-- separate single-card lines. The service bug is fixed alongside this
-- migration; this folds the rows that already exist.
--
-- Conservative: a duplicate line is only folded into its keeper when it is
-- NOT referenced by an order / listing / grading scan / trade. Anything
-- referenced is left as its own line (rare). No unique constraint is added —
-- user_cards is referenced by half a dozen tables with mixed cascade rules,
-- so the fixed service dedup is the guard going forward.

DO $$
DECLARE
  grp RECORD;
  keeper uuid;
  loser uuid;
  i int;
  lq int;
  lt boolean;
BEGIN
  FOR grp IN
    SELECT
      array_agg(id ORDER BY created_at, id) AS ids
    FROM public.user_cards
    GROUP BY
      user_id, card_id,
      public.canonical_card_condition(condition),
      is_graded,
      coalesce(grading_company, ''),
      coalesce(grade_score, ''),
      coalesce(product_type, 'single')
    HAVING count(*) > 1
  LOOP
    keeper := grp.ids[1];

    -- keeper's condition to canonical, in case the group spanned spellings
    UPDATE public.user_cards
       SET condition = public.canonical_card_condition(condition), updated_at = now()
     WHERE id = keeper
       AND condition IS DISTINCT FROM public.canonical_card_condition(condition);

    FOR i IN 2 .. array_length(grp.ids, 1) LOOP
      loser := grp.ids[i];

      IF EXISTS (SELECT 1 FROM public.orders WHERE user_card_id = loser)
         OR EXISTS (SELECT 1 FROM public.marketplace_listings WHERE user_card_id = loser)
         OR EXISTS (SELECT 1 FROM public.card_grading_scans WHERE user_card_id = loser) THEN
        CONTINUE;  -- referenced elsewhere — leave it as its own line
      END IF;

      SELECT quantity, for_trade INTO lq, lt FROM public.user_cards WHERE id = loser;

      BEGIN
        -- move any condition photos onto the keeper (card_images is ON DELETE
        -- CASCADE, so this must happen before the delete)
        UPDATE public.card_images SET user_card_id = keeper WHERE user_card_id = loser;
        DELETE FROM public.user_cards WHERE id = loser;
        UPDATE public.user_cards
           SET quantity = quantity + COALESCE(lq, 0),
               for_trade = for_trade OR COALESCE(lt, false),
               updated_at = now()
         WHERE id = keeper;
      EXCEPTION WHEN foreign_key_violation THEN
        -- loser is referenced by a trade after all; its photos are now on the
        -- keeper (same physical card) which is harmless. Leave the row.
        NULL;
      END;
    END LOOP;
  END LOOP;
END $$;

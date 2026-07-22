-- End-to-end backend journey for CollectX.
--
-- This test deliberately creates two synthetic auth users inside one transaction,
-- exercises the authenticated trade workflow, and then rolls everything back.
-- It is safe to run against an otherwise empty verification database because the
-- final query proves that none of the fixed test identifiers remain.

BEGIN;

SET LOCAL statement_timeout = '30s';

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-0000000000a1',
    'authenticated',
    'authenticated',
    'collectx-journey-a@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Journey A"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-0000000000b2',
    'authenticated',
    'authenticated',
    'collectx-journey-b@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Journey B"}'::jsonb,
    now(),
    now()
  );

INSERT INTO public.user_cards (
  id,
  user_id,
  card_id,
  card_name,
  card_image,
  set_id,
  set_name,
  card_number,
  rarity,
  condition,
  quantity,
  for_trade
)
VALUES
  (
    '00000000-0000-4000-8000-0000000000c1',
    '00000000-0000-4000-8000-0000000000a1',
    'base1-1',
    'Alakazam',
    'https://images.pokemontcg.io/base1/1_hires.png',
    'base1',
    'Base',
    '1',
    'Rare Holo',
    'near_mint',
    1,
    true
  ),
  (
    '00000000-0000-4000-8000-0000000000c2',
    '00000000-0000-4000-8000-0000000000b2',
    'base1-2',
    'Blastoise',
    'https://images.pokemontcg.io/base1/2_hires.png',
    'base1',
    'Base',
    '2',
    'Rare Holo',
    'near_mint',
    1,
    true
  );

SET LOCAL ROLE authenticated;

DO $assert_privileges$
BEGIN
  IF has_table_privilege(current_user, 'public.marketplace_listings', 'INSERT')
     OR has_table_privilege(current_user, 'public.marketplace_listings', 'UPDATE')
     OR has_table_privilege(current_user, 'public.marketplace_listings', 'DELETE') THEN
    RAISE EXCEPTION 'Authenticated users still have direct marketplace write privileges';
  END IF;

  IF has_table_privilege(current_user, 'public.trade_shipments', 'INSERT')
     OR has_table_privilege(current_user, 'public.trade_shipments', 'UPDATE')
     OR has_table_privilege(current_user, 'public.trade_shipments', 'DELETE') THEN
    RAISE EXCEPTION 'Authenticated users still have direct shipment write privileges';
  END IF;
END
$assert_privileges$;

-- Recipient B lists their collection card.
SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-0000000000b2',
  true
);

SELECT set_config(
  'collectx_test.listing_id',
  (public.create_marketplace_listing(
    '00000000-0000-4000-8000-0000000000c2',
    'Looking for a Base Set Alakazam',
    'Rollback-only journey listing',
    now() + interval '7 days'
  )).id::text,
  true
);

-- Initiator A proposes their own collection card.
SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-0000000000a1',
  true
);

SELECT set_config(
  'collectx_test.trade_id',
  (public.propose_trade(
    current_setting('collectx_test.listing_id')::uuid,
    ARRAY['00000000-0000-4000-8000-0000000000c1'::uuid],
    'Would you trade for my Alakazam?'
  )).id::text,
  true
);

-- The proposer must not be able to accept their own proposal.
DO $unauthorised_accept$
DECLARE
  rejected boolean := false;
BEGIN
  BEGIN
    PERFORM public.accept_trade(current_setting('collectx_test.trade_id')::uuid);
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Only the recipient can accept this trade' THEN
        rejected := true;
      ELSE
        RAISE;
      END IF;
  END;

  IF NOT rejected THEN
    RAISE EXCEPTION 'The proposer was able to accept their own proposal';
  END IF;
END
$unauthorised_accept$;

-- Recipient B accepts. Both collection rows must be reserved atomically.
SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-0000000000b2',
  true
);

SELECT (public.accept_trade(current_setting('collectx_test.trade_id')::uuid)).id;

-- Inspect the cross-user reservation as the database verifier. A participant's
-- normal user_cards SELECT policy intentionally hides the other reserved card.
RESET ROLE;

DO $accepted_state$
BEGIN
  IF (
    SELECT count(*)
    FROM public.user_cards
    WHERE id IN (
      '00000000-0000-4000-8000-0000000000c1',
      '00000000-0000-4000-8000-0000000000c2'
    )
      AND for_trade = false
  ) <> 2 THEN
    RAISE EXCEPTION 'Accepted trade did not reserve both collection cards';
  END IF;

  IF (
    SELECT count(*)
    FROM public.trade_shipments
    WHERE trade_id = current_setting('collectx_test.trade_id')::uuid
      AND status = 'pending'
  ) <> 2 THEN
    RAISE EXCEPTION 'Accepted trade did not create exactly two pending shipments';
  END IF;
END
$accepted_state$;

-- Each participant submits their own private address.
SET LOCAL ROLE authenticated;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-0000000000a1',
  true
);

SELECT (public.submit_trade_address(
  current_setting('collectx_test.trade_id')::uuid,
  '{
    "full_name":"Journey A",
    "line1":"1 Test Street",
    "city":"London",
    "postal_code":"SW1A 1AA",
    "country":"United Kingdom"
  }'::jsonb
)).id;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-0000000000b2',
  true
);

SELECT (public.submit_trade_address(
  current_setting('collectx_test.trade_id')::uuid,
  '{
    "full_name":"Journey B",
    "line1":"2 Test Avenue",
    "city":"Manchester",
    "postal_code":"M1 1AA",
    "country":"United Kingdom"
  }'::jsonb
)).id;

-- Direct table reads expose only the signed-in participant's own address.
DO $address_rls_b$
BEGIN
  IF (
    SELECT count(*)
    FROM public.trade_addresses
    WHERE trade_id = current_setting('collectx_test.trade_id')::uuid
  ) <> 1 THEN
    RAISE EXCEPTION 'Address RLS exposed another participant address';
  END IF;

  IF public.get_trade_destination_address(
       current_setting('collectx_test.trade_id')::uuid
     )->>'line1' <> '1 Test Street' THEN
    RAISE EXCEPTION 'Recipient B did not receive the correct shipping destination';
  END IF;
END
$address_rls_b$;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-0000000000a1',
  true
);

DO $address_rls_a$
BEGIN
  IF (
    SELECT count(*)
    FROM public.trade_addresses
    WHERE trade_id = current_setting('collectx_test.trade_id')::uuid
  ) <> 1 THEN
    RAISE EXCEPTION 'Address RLS exposed another participant address';
  END IF;

  IF public.get_trade_destination_address(
       current_setting('collectx_test.trade_id')::uuid
     )->>'line1' <> '2 Test Avenue' THEN
    RAISE EXCEPTION 'Initiator A did not receive the correct shipping destination';
  END IF;
END
$address_rls_a$;

-- Both participants can message and record their own tracked shipment.
INSERT INTO public.trade_messages (trade_id, sender_user_id, message)
VALUES (
  current_setting('collectx_test.trade_id')::uuid,
  '00000000-0000-4000-8000-0000000000a1',
  'Packed and ready to send.'
);

SELECT (public.mark_trade_shipped(
  current_setting('collectx_test.trade_id')::uuid,
  'TEST-A-TRACKING',
  'Royal Mail'
)).id;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-0000000000b2',
  true
);

INSERT INTO public.trade_messages (trade_id, sender_user_id, message)
VALUES (
  current_setting('collectx_test.trade_id')::uuid,
  '00000000-0000-4000-8000-0000000000b2',
  'Mine is on its way too.'
);

SELECT (public.mark_trade_shipped(
  current_setting('collectx_test.trade_id')::uuid,
  'TEST-B-TRACKING',
  'Royal Mail'
)).id;

DO $shipped_state$
BEGIN
  IF (
    SELECT status
    FROM public.trades
    WHERE id = current_setting('collectx_test.trade_id')::uuid
  ) <> 'shipped' THEN
    RAISE EXCEPTION 'Trade did not become shipped after both parcels were recorded';
  END IF;

  IF (
    SELECT count(*)
    FROM public.trade_messages
    WHERE trade_id = current_setting('collectx_test.trade_id')::uuid
  ) <> 2 THEN
    RAISE EXCEPTION 'Trade participants could not exchange messages';
  END IF;
END
$shipped_state$;

-- Both receipts are required. The second confirmation completes the trade.
SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-0000000000a1',
  true
);

SELECT (public.confirm_trade_receipt(
  current_setting('collectx_test.trade_id')::uuid
)).status;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-0000000000b2',
  true
);

SELECT (public.confirm_trade_receipt(
  current_setting('collectx_test.trade_id')::uuid
)).status;

RESET ROLE;

DO $completed_state$
BEGIN
  IF (
    SELECT status
    FROM public.trades
    WHERE id = current_setting('collectx_test.trade_id')::uuid
  ) <> 'completed' THEN
    RAISE EXCEPTION 'Trade did not complete after both receipts';
  END IF;

  IF (
    SELECT status
    FROM public.marketplace_listings
    WHERE id = current_setting('collectx_test.listing_id')::uuid
  ) <> 'completed' THEN
    RAISE EXCEPTION 'Listing was not completed with its trade';
  END IF;

  IF (
    SELECT user_id
    FROM public.user_cards
    WHERE id = '00000000-0000-4000-8000-0000000000c1'
  ) <> '00000000-0000-4000-8000-0000000000b2'::uuid THEN
    RAISE EXCEPTION 'Initiator card ownership was not transferred to recipient';
  END IF;

  IF (
    SELECT user_id
    FROM public.user_cards
    WHERE id = '00000000-0000-4000-8000-0000000000c2'
  ) <> '00000000-0000-4000-8000-0000000000a1'::uuid THEN
    RAISE EXCEPTION 'Recipient card ownership was not transferred to initiator';
  END IF;

  IF (
    SELECT count(*)
    FROM public.trade_ownership_transfers
    WHERE trade_id = current_setting('collectx_test.trade_id')::uuid
  ) <> 2 THEN
    RAISE EXCEPTION 'Ownership transfer audit is incomplete';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id IN (
      '00000000-0000-4000-8000-0000000000a1',
      '00000000-0000-4000-8000-0000000000b2'
    )
      AND (total_trades <> 1 OR successful_trades <> 1)
  ) THEN
    RAISE EXCEPTION 'Participant trade counters were not updated exactly once';
  END IF;
END
$completed_state$;

-- Completed-trade ratings are accepted and update the opposite profile.
SET LOCAL ROLE authenticated;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-0000000000a1',
  true
);

INSERT INTO public.trade_ratings (
  trade_id,
  rater_user_id,
  rated_user_id,
  rating,
  review
)
VALUES (
  current_setting('collectx_test.trade_id')::uuid,
  '00000000-0000-4000-8000-0000000000a1',
  '00000000-0000-4000-8000-0000000000b2',
  5,
  'Rollback-only rating from A'
);

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-0000000000b2',
  true
);

INSERT INTO public.trade_ratings (
  trade_id,
  rater_user_id,
  rated_user_id,
  rating,
  review
)
VALUES (
  current_setting('collectx_test.trade_id')::uuid,
  '00000000-0000-4000-8000-0000000000b2',
  '00000000-0000-4000-8000-0000000000a1',
  4,
  'Rollback-only rating from B'
);

RESET ROLE;

DO $rating_state$
BEGIN
  IF (
    SELECT reputation_score
    FROM public.profiles
    WHERE user_id = '00000000-0000-4000-8000-0000000000a1'
  ) <> 4 THEN
    RAISE EXCEPTION 'Initiator reputation did not reflect the received rating';
  END IF;

  IF (
    SELECT reputation_score
    FROM public.profiles
    WHERE user_id = '00000000-0000-4000-8000-0000000000b2'
  ) <> 5 THEN
    RAISE EXCEPTION 'Recipient reputation did not reflect the received rating';
  END IF;
END
$rating_state$;

ROLLBACK;

SELECT
  (SELECT count(*) FROM auth.users
    WHERE id IN (
      '00000000-0000-4000-8000-0000000000a1',
      '00000000-0000-4000-8000-0000000000b2'
    )) AS test_users_remaining,
  (SELECT count(*) FROM public.user_cards
    WHERE id IN (
      '00000000-0000-4000-8000-0000000000c1',
      '00000000-0000-4000-8000-0000000000c2'
    )) AS test_cards_remaining,
  (SELECT count(*) FROM public.trades
    WHERE initiator_user_id = '00000000-0000-4000-8000-0000000000a1'
       OR recipient_user_id = '00000000-0000-4000-8000-0000000000b2'
  ) AS test_trades_remaining;

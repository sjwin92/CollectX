import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getStripeClient } from "./stripeClient.ts";

const ZERO_DECIMAL_CURRENCIES = new Set(['jpy', 'krw', 'vnd']);
function toMinorUnits(amount: number, currency: string): number {
  const multiplier = ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase()) ? 1 : 100;
  return Math.round(amount * multiplier);
}

const serviceClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

export type ReleaseResult = { ok: true } | { ok: false; error: string; status: number };

// Shared by release-order-payout (buyer-initiated "Confirm receipt") and
// auto-confirm-orders (the pg_cron sweep). Creates the Stripe Transfer to the
// seller's connected account FIRST, and only calls complete_order (which does
// the card ownership swap) after Stripe confirms success — the DB must never
// say "completed" before the seller has actually been paid.
export async function releaseOrderPayout(orderId: string): Promise<ReleaseResult> {
  const { data: order, error: orderError } = await serviceClient
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();
  if (orderError) return { ok: false, error: orderError.message, status: 500 };
  if (!order) return { ok: false, error: 'Order not found', status: 404 };
  if (order.status !== 'shipped') {
    return { ok: false, error: 'Order must be shipped (and not disputed) to release payout', status: 400 };
  }
  if (order.stripe_transfer_id) {
    return { ok: false, error: 'Payout already released', status: 409 };
  }

  const { data: sellerAccount, error: sellerAccountError } = await serviceClient
    .from('seller_stripe_accounts')
    .select('stripe_account_id')
    .eq('user_id', order.seller_user_id)
    .maybeSingle();
  if (sellerAccountError) return { ok: false, error: sellerAccountError.message, status: 500 };
  if (!sellerAccount) return { ok: false, error: 'Seller has no connected payout account', status: 400 };

  let transfer;
  try {
    const stripe = getStripeClient();
    transfer = await stripe.transfers.create({
      amount: toMinorUnits(Number(order.seller_payout_amount), order.currency),
      currency: order.currency,
      destination: sellerAccount.stripe_account_id,
      transfer_group: order.id,
    });
  } catch (stripeError) {
    return { ok: false, error: stripeError instanceof Error ? stripeError.message : String(stripeError), status: 500 };
  }

  const { error: completeError } = await serviceClient.rpc('complete_order', {
    _order_id: order.id,
    _stripe_transfer_id: transfer.id,
  });
  if (completeError) {
    console.error('Stripe transfer succeeded but complete_order failed — needs manual reconciliation:', order.id, completeError);
    return { ok: false, error: 'Payout sent but order completion failed; contact support.', status: 500 };
  }

  return { ok: true };
}

// Store-SKU version (CollectX for Business — Phase 2b). Same shape as
// releaseOrderPayout: create the Stripe Transfer to the store's connected
// account FIRST, then call complete_store_order (which decrements
// store_inventory.quantity) only after Stripe confirms the transfer.
export async function releaseStoreOrderPayout(storeOrderId: string): Promise<ReleaseResult> {
  const { data: order, error: orderError } = await serviceClient
    .from('store_orders')
    .select('*')
    .eq('id', storeOrderId)
    .maybeSingle();
  if (orderError) return { ok: false, error: orderError.message, status: 500 };
  if (!order) return { ok: false, error: 'Order not found', status: 404 };
  if (order.status !== 'shipped') {
    return { ok: false, error: 'Order must be shipped (and not disputed) to release payout', status: 400 };
  }
  if (order.stripe_transfer_id) {
    return { ok: false, error: 'Payout already released', status: 409 };
  }

  const { data: sellerAccount, error: sellerAccountError } = await serviceClient
    .from('seller_stripe_accounts')
    .select('stripe_account_id')
    .eq('user_id', order.store_id)
    .maybeSingle();
  if (sellerAccountError) return { ok: false, error: sellerAccountError.message, status: 500 };
  if (!sellerAccount) return { ok: false, error: 'Store has no connected payout account', status: 400 };

  let transfer;
  try {
    const stripe = getStripeClient();
    transfer = await stripe.transfers.create({
      amount: toMinorUnits(Number(order.seller_payout_amount), order.currency),
      currency: order.currency,
      destination: sellerAccount.stripe_account_id,
      transfer_group: order.id,
    });
  } catch (stripeError) {
    return { ok: false, error: stripeError instanceof Error ? stripeError.message : String(stripeError), status: 500 };
  }

  const { error: completeError } = await serviceClient.rpc('complete_store_order', {
    _order_id: order.id,
    _stripe_transfer_id: transfer.id,
  });
  if (completeError) {
    console.error('Stripe transfer succeeded but complete_store_order failed — needs manual reconciliation:', order.id, completeError);
    return { ok: false, error: 'Payout sent but order completion failed; contact support.', status: 500 };
  }

  return { ok: true };
}

// Buylist version (CollectX for Business — Phase 3). Roles reversed: the payee
// is the COLLECTOR (seller_user_id), not a store. Transfer to their connected
// account FIRST, then complete_buylist_order (which moves the card from their
// collection into the store's inventory) only after Stripe confirms.
export async function releaseBuylistOrderPayout(buylistOrderId: string): Promise<ReleaseResult> {
  const { data: order, error: orderError } = await serviceClient
    .from('buylist_orders')
    .select('*')
    .eq('id', buylistOrderId)
    .maybeSingle();
  if (orderError) return { ok: false, error: orderError.message, status: 500 };
  if (!order) return { ok: false, error: 'Order not found', status: 404 };
  if (order.status !== 'shipped') {
    return { ok: false, error: 'Order must be shipped (and not disputed) to release payout', status: 400 };
  }
  if (order.stripe_transfer_id) {
    return { ok: false, error: 'Payout already released', status: 409 };
  }

  const { data: sellerAccount, error: sellerAccountError } = await serviceClient
    .from('seller_stripe_accounts')
    .select('stripe_account_id')
    .eq('user_id', order.seller_user_id)
    .maybeSingle();
  if (sellerAccountError) return { ok: false, error: sellerAccountError.message, status: 500 };
  if (!sellerAccount) return { ok: false, error: 'The collector has no connected payout account', status: 400 };

  let transfer;
  try {
    const stripe = getStripeClient();
    transfer = await stripe.transfers.create({
      amount: toMinorUnits(Number(order.seller_payout_amount), order.currency),
      currency: order.currency,
      destination: sellerAccount.stripe_account_id,
      transfer_group: order.id,
    });
  } catch (stripeError) {
    return { ok: false, error: stripeError instanceof Error ? stripeError.message : String(stripeError), status: 500 };
  }

  const { error: completeError } = await serviceClient.rpc('complete_buylist_order', {
    _order_id: order.id,
    _stripe_transfer_id: transfer.id,
  });
  if (completeError) {
    console.error('Stripe transfer succeeded but complete_buylist_order failed — needs manual reconciliation:', order.id, completeError);
    return { ok: false, error: 'Payout sent but order completion failed; contact support.', status: 500 };
  }

  return { ok: true };
}

export { serviceClient };

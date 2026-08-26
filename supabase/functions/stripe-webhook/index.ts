import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type Stripe from "https://esm.sh/stripe@17.4.0?target=deno";
import { getStripeClient } from "../_shared/stripeClient.ts";

// No CORS headers here: this endpoint is called server-to-server by Stripe,
// never from a browser. verify_jwt is disabled for this function in
// supabase/config.toml since Stripe's request carries no Supabase JWT — the
// only authentication is the Stripe-Signature header verified below, over
// the RAW request body (which must be read before any JSON parsing).

const serviceClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('Stripe-Signature');
  if (!signature) {
    return new Response('Missing Stripe-Signature header', { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.metadata?.type === 'scan_credits') {
          if (session.payment_status !== 'paid') break;
          const userId = session.metadata.user_id;
          const credits = parseInt(session.metadata.credits ?? '0', 10);
          if (!userId || !credits) {
            console.error('scan_credits checkout with missing user_id/credits', session.id);
            break;
          }
          const { data: profile, error: profileError } = await serviceClient
            .from('profiles')
            .select('purchased_scan_credits')
            .eq('id', userId)
            .maybeSingle();
          if (profileError) throw profileError;
          const { error } = await serviceClient
            .from('profiles')
            .update({ purchased_scan_credits: (profile?.purchased_scan_credits ?? 0) + credits })
            .eq('id', userId);
          if (error) throw error;
          break;
        }

        // Business subscription — a store started a monthly plan (Phase 4).
        if (session.metadata?.type === 'business_subscription') {
          const storeId = session.metadata.store_id;
          const planId = session.metadata.plan_id;
          const subId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id ?? null;
          const customerId = typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id ?? null;
          if (!storeId || !planId || !subId) {
            console.error('business_subscription checkout with missing metadata/subscription', session.id);
            break;
          }
          let periodEnd: string | null = null;
          try {
            const stripe = getStripeClient();
            const sub = await stripe.subscriptions.retrieve(subId);
            if (sub.current_period_end) periodEnd = new Date(sub.current_period_end * 1000).toISOString();
          } catch (e) {
            console.error('Could not retrieve subscription for period end', subId, e);
          }
          const { error } = await serviceClient.rpc('activate_business_subscription', {
            _store_id: storeId,
            _plan_id: planId,
            _stripe_customer_id: customerId,
            _stripe_subscription_id: subId,
            _current_period_end: periodEnd,
          });
          if (error) throw error;
          break;
        }

        // Buylist order — the store paid the quote into escrow (Phase 3).
        if (session.metadata?.type === 'buylist_order') {
          const buylistOrderId = session.metadata.buylist_order_id;
          if (!buylistOrderId) {
            console.error('buylist_order checkout.session.completed with no buylist_order_id', session.id);
            break;
          }
          if (session.payment_status === 'paid') {
            const paymentIntentId = typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id ?? null;
            const { error } = await serviceClient.rpc('mark_buylist_order_paid', {
              _order_id: buylistOrderId,
              _stripe_payment_intent_id: paymentIntentId,
            });
            if (error) throw error;
          }
          break;
        }

        // Promoted listing / storefront pin (CollectX for Business — Phase 2c).
        if (session.metadata?.type === 'promotion') {
          const promotionId = session.metadata.promotion_id;
          if (!promotionId) {
            console.error('promotion checkout.session.completed with no promotion_id', session.id);
            break;
          }
          if (session.payment_status === 'paid') {
            const paymentIntentId = typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id ?? null;
            const { error } = await serviceClient.rpc('activate_store_promotion', {
              _promotion_id: promotionId,
              _stripe_payment_intent_id: paymentIntentId,
            });
            if (error) throw error;
          }
          break;
        }

        // Store-SKU order (CollectX for Business — Phase 2b).
        if (session.metadata?.type === 'store_order') {
          const storeOrderId = session.metadata.store_order_id;
          if (!storeOrderId) {
            console.error('store_order checkout.session.completed with no store_order_id', session.id);
            break;
          }
          if (session.payment_status === 'paid') {
            const paymentIntentId = typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id ?? null;
            const { error } = await serviceClient.rpc('mark_store_order_paid', {
              _order_id: storeOrderId,
              _stripe_payment_intent_id: paymentIntentId,
            });
            if (error) throw error;
          }
          break;
        }

        const orderId = session.metadata?.order_id;
        if (!orderId) {
          console.error('checkout.session.completed with no order_id in metadata', session.id);
          break;
        }
        if (session.payment_status === 'paid') {
          const paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null;
          const { error } = await serviceClient.rpc('mark_order_paid', {
            _order_id: orderId,
            _stripe_payment_intent_id: paymentIntentId,
          });
          if (error) throw error;
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.type === 'buylist_order') {
          const id = session.metadata.buylist_order_id;
          if (!id) break;
          const { error } = await serviceClient.rpc('mark_buylist_order_payment_failed', { _order_id: id });
          if (error) throw error;
          break;
        }
        if (session.metadata?.type === 'promotion') {
          const promotionId = session.metadata.promotion_id;
          if (!promotionId) break;
          const { error } = await serviceClient.rpc('fail_store_promotion', { _promotion_id: promotionId });
          if (error) throw error;
          break;
        }
        if (session.metadata?.type === 'store_order') {
          const storeOrderId = session.metadata.store_order_id;
          if (!storeOrderId) break;
          const { error } = await serviceClient.rpc('mark_store_order_payment_failed', { _order_id: storeOrderId });
          if (error) throw error;
          break;
        }
        const orderId = session.metadata?.order_id;
        if (!orderId) break;
        const { error } = await serviceClient.rpc('mark_order_payment_failed', { _order_id: orderId });
        if (error) throw error;
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        if (intent.metadata?.type === 'buylist_order') {
          const id = intent.metadata.buylist_order_id;
          if (!id) break;
          const { error } = await serviceClient.rpc('mark_buylist_order_payment_failed', { _order_id: id });
          if (error) throw error;
          break;
        }
        if (intent.metadata?.type === 'promotion') {
          const promotionId = intent.metadata.promotion_id;
          if (!promotionId) break;
          const { error } = await serviceClient.rpc('fail_store_promotion', { _promotion_id: promotionId });
          if (error) throw error;
          break;
        }
        if (intent.metadata?.type === 'store_order') {
          const storeOrderId = intent.metadata.store_order_id;
          if (!storeOrderId) break;
          const { error } = await serviceClient.rpc('mark_store_order_payment_failed', { _order_id: storeOrderId });
          if (error) throw error;
          break;
        }
        const orderId = intent.metadata?.order_id;
        if (!orderId) break;
        const { error } = await serviceClient.rpc('mark_order_payment_failed', { _order_id: orderId });
        if (error) throw error;
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const onboarding_status = account.charges_enabled
          ? 'complete'
          : account.details_submitted
            ? 'restricted'
            : 'pending';
        const { error } = await serviceClient
          .from('seller_stripe_accounts')
          .update({
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
            onboarding_status,
          })
          .eq('stripe_account_id', account.id);
        if (error) throw error;

        if (onboarding_status === 'complete') {
          const { data: sellerAccount } = await serviceClient
            .from('seller_stripe_accounts')
            .select('user_id')
            .eq('stripe_account_id', account.id)
            .maybeSingle();
          if (sellerAccount) {
            await serviceClient.from('notifications').insert({
              user_id: sellerAccount.user_id,
              type: 'seller_onboarding_complete',
              title: 'Payouts connected',
              message: 'Your payout account is verified — you can now list cards for sale.',
              data: {},
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const canceled = event.type === 'customer.subscription.deleted';
        const { error } = await serviceClient.rpc('sync_business_subscription', {
          _stripe_subscription_id: sub.id,
          _status: canceled ? 'canceled' : sub.status,
          _current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          _cancel_at_period_end: canceled ? false : !!sub.cancel_at_period_end,
        });
        if (error) throw error;
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id ?? null;
        if (!subId) break;
        const { error } = await serviceClient.rpc('sync_business_subscription', {
          _stripe_subscription_id: subId,
          _status: 'past_due',
          _current_period_end: null,
          _cancel_at_period_end: null,
        });
        if (error) throw error;
        break;
      }

      default:
        // Unhandled event types are expected and ignored (e.g. transfer.* audit events).
        break;
    }
  } catch (error) {
    console.error(`Error handling webhook event ${event.type}:`, error);
    // Return 500 so Stripe retries — handlers above are written to be idempotent
    // (guarded on current row status), so a retry is safe.
    return new Response('Internal error handling webhook', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

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
        const orderId = session.metadata?.order_id;
        if (!orderId) break;
        const { error } = await serviceClient.rpc('mark_order_payment_failed', { _order_id: orderId });
        if (error) throw error;
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
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

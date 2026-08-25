import Stripe from "https://esm.sh/stripe@17.4.0?target=deno";

// Lazily constructs the Stripe client on first actual use, INSIDE the request
// handler — never at module scope. Stripe's SDK constructor throws
// synchronously on a missing/invalid key, and a module-scope throw crashes
// the entire Deno isolate before serve()'s OPTIONS/CORS handling ever runs,
// turning every request (including preflight) into an opaque 500. Until
// STRIPE_SECRET_KEY is configured, callers get a clean, catchable error
// instead of a broken function.
let cached: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (cached) return cached;
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  cached = new Stripe(key, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });
  return cached;
}

export { Stripe };

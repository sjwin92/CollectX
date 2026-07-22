# CollectX deployment

CollectX is currently hosted by Lovable. GitHub is the source of truth and
`collectx-prod` in Supabase is the owned backend.

## Production components

- Frontend host: Lovable
- Source repository: `sjwin92/CollectX`
- Synced branch: `main`
- Supabase project: `collectx-prod` (`yfzfyeoaisspqlziaufx`)
- Build: `npm run build`
- Output: `dist`

## Public build variables

Lovable requires browser-visible `VITE_*` variables in the committed `.env`
file. The file may contain only public values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_ENABLE_GOOGLE_AUTH`

Never put a Supabase secret key, service-role key, Stripe secret, or webhook
secret in `.env`. Backend credentials belong in Supabase Edge Function
secrets.

## Release process

1. Open or update a feature branch and draft pull request.
2. Require GitHub Actions to pass typecheck and the production build.
3. Review database migrations and apply them to `collectx-prod` before merging
   frontend code that depends on them.
4. Run the two-account trade journey against a preview or controlled test.
5. Merge the verified pull request into `main`.
6. Confirm Lovable has synced `main` in **Project settings → Git → GitHub**.
7. In Lovable, open **Publish** and choose **Update**.
8. Verify sign-up, sign-in, catalogue browsing, collection management, listing,
   proposal, messaging, shipping, receipt, rating, and billing on the published
   URL.

Lovable publishes snapshots; merging to `main` does not automatically update
the public site.

## Supabase Auth URLs

Before public release, set the Supabase Auth **Site URL** to the published
Lovable URL and add redirect URLs for:

- the published Lovable URL
- the Lovable preview URL used for testing
- `http://localhost:8080` for local development

Keep Google sign-in disabled until its OAuth provider and all redirect URLs have
been tested.

## Stripe

Subscription checkout, customer-portal, and webhook handlers run as Supabase
Edge Functions. Store `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the
Stripe price identifier in Supabase secrets. Use Stripe test mode until the
billing journey and webhook replay tests pass.

## Rollback

Lovable retains the previously published snapshot until **Publish → Update** is
confirmed. If a new release fails verification, do not publish it. Database
migrations must be backwards-compatible with the currently published frontend
during the release window.

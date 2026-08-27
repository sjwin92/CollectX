# CollectX — go-live runbook

Prod Supabase project: `yfzfyeoaisspqlziaufx` (`collectx-prod`, eu-west-2).
Local dev is currently the only running instance. This is the ordered path to a
public site taking real money.

---

## 1. Ship the pending backend changes

```bash
supabase db push --linked          # applies all pending migrations
supabase functions deploy create-checkout-session --project-ref yfzfyeoaisspqlziaufx
supabase functions deploy grade-card             --project-ref yfzfyeoaisspqlziaufx
git push
```

Pending migrations at time of writing:
- `20260828170000_defer_seller_payout_onboarding` — list/sell without onboarding
- `20260828180000_defer_marketplace_listing_onboarding` — same, for personal listings
- `20260828190000_content_reports` — report-a-listing table + `file_content_report` RPC

---

## 2. Deploy the frontend

Vite + React SPA. Any static host works; Netlify / Cloudflare Pages / Vercel are
all free-tier and git-connected. SPA fallback is already configured
(`public/_redirects` for Netlify/Cloudflare, `vercel.json` for Vercel).

**Build settings**
- Build command: `npm run build`
- Output directory: `dist`
- Node: 18+

**Environment variables** (set in the host dashboard):
| Var | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://yfzfyeoaisspqlziaufx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the prod anon/publishable key from Supabase → Project Settings → API |
| `VITE_SUPABASE_PROJECT_ID` | `yfzfyeoaisspqlziaufx` |
| `VITE_POKEMON_TCG_API_KEY` | optional — pokemontcg.io key, raises rate limits |

Connect the git repo so pushes to `main` auto-deploy.

---

## 3. Domain + email

- Point the domain at the host (CNAME / A record per host docs), enable HTTPS.
- Set up transactional email: verify the domain with the email provider
  (Resend) so order/trade notifications don't land in spam. Add the sender
  address used by the edge functions.

---

## 4. Stripe — switch from test to live

1. Stripe Dashboard → toggle **live mode**.
2. Complete CollectX's own business verification (this is the *platform*
   account — sole trader is fine) and add a **bank account** for payouts. This
   is how platform fees (buyer-protection %, store commissions, grading, subs,
   promoted listings) reach you — they accrue in the CollectX Stripe balance
   and pay out on Stripe's schedule.
3. Create a **live-mode webhook endpoint**:
   URL `https://yfzfyeoaisspqlziaufx.supabase.co/functions/v1/stripe-webhook`
   Events: `checkout.session.completed`, `checkout.session.expired`,
   `payment_intent.payment_failed`, `account.updated`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.payment_failed`. Copy its signing secret (`whsec_…`).
4. Grab the live secret key (`sk_live_…`).
5. Set the secrets (replaces the test values):
   ```bash
   supabase secrets set \
     STRIPE_SECRET_KEY=sk_live_xxx \
     STRIPE_WEBHOOK_SECRET=whsec_xxx \
     SITE_URL=https://YOUR-DOMAIN \
     --project-ref yfzfyeoaisspqlziaufx
   ```
   No function redeploy needed — the key is read per request.

---

## 5. Anthropic API (card grading)

1. console.anthropic.com → API keys → create a key; add billing/credit.
2. ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx --project-ref yfzfyeoaisspqlziaufx
   ```
   (It is not currently set — grading fails without it.) Model is
   `claude-sonnet-5`, already wired; the rubric is prompt-cached.

---

## 6. Fill the legal placeholders

In `src/pages/legal/LegalLayout.tsx`: `OPERATOR`, `OPERATOR_ADDRESS`,
`LEGAL_EFFECTIVE_DATE`, and the three `@collectx.example` contact addresses.
A sole trader's terms must name the individual. Get the docs a solicitor
review before taking real money — especially the escrow/liability sections.

---

## 7. Smoke test on the live site

- Sign up a fresh account; list a card for sale (no onboarding prompt blocks it).
- From a second account, buy it with a real card (small amount) → order goes
  `paid_held`.
- Seller: try to mark shipped → prompted to connect payouts → complete Stripe
  onboarding (~2 min) → mark shipped with a carrier + tracking number →
  "Track parcel" link works.
- Buyer: confirm receipt → funds transfer to the seller; CollectX fee stays in
  the platform balance.
- Grade a card → returns a grade (confirms `ANTHROPIC_API_KEY`).
- Check the Stripe webhook log shows 2xx deliveries.

---

## Not blockers, do after launch

- Error monitoring (Sentry).
- Admin review UI for `content_reports` (query the table for now).
- Live carrier tracking / label purchase.
- Broaden the homepage activity feed to include sales, not just trades.
- Mobile QA.

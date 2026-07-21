# CollectX deployment checklist

This checklist moves the frontend from Lovable to a GitHub-connected Vercel deployment while keeping `collectx-prod` as the backend. Do not change the existing public site until the new deployment passes the two-account journey.

## 1. Import the GitHub repository

In Vercel, create a project by importing `sjwin92/CollectX`.

- Framework preset: Vite
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Production branch: `main`

The committed `vercel.json` makes browser routes such as `/reset-password` and `/trades/:id` resolve to the React application instead of returning a host-level 404.

## 2. Add frontend environment variables

Add these values to both Preview and Production environments:

```text
VITE_SUPABASE_URL=https://yfzfyeoaisspqlziaufx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<active publishable key from Supabase API settings>
VITE_ENABLE_GOOGLE_AUTH=false
```

The publishable key is intended for frontend use. Never add a Supabase secret key, legacy service-role key, database password, Pokémon TCG API key, or eBay credential to Vercel's `VITE_*` variables.

## 3. Configure Supabase Auth URLs

After Vercel assigns the production URL, open Supabase Dashboard → Authentication → URL Configuration for project `yfzfyeoaisspqlziaufx`.

1. Set **Site URL** to the final HTTPS production origin, with no path.
2. Add `<production-origin>/**` to **Redirect URLs**.
3. Keep `http://localhost:8080/**` while local development is needed.
4. For branch previews, add the narrow Vercel wildcard shown by Supabase for the account/team slug, or add only the exact preview URL being tested.

Email confirmation, password recovery, and optional OAuth redirects must all match this allow-list. Keep Google sign-in disabled until its provider credentials and redirect URLs are configured and tested.

## 4. Verify the preview before release

Run the following checks against a Vercel preview:

- `/`, `/pokemon-sets`, `/pokemon-cards`, and a card detail load directly.
- Refreshing a nested URL does not return a Vercel 404.
- Sign-up sends a confirmation email to a real inbox.
- Confirmation returns to the preview and creates one profile.
- Sign-in, sign-out, forgotten-password, and reset-password work.
- Card images upload and display.
- Browser developer tools show requests only to the new Supabase project reference.

Then complete the real two-account journey in one normal browser window and one private/incognito window:

1. Each account adds a different card and marks it for trade.
2. Account B creates a listing.
3. Account A proposes its card.
4. Account B accepts.
5. Both accounts submit delivery addresses.
6. Each side records a carrier and tracking number.
7. Each side confirms receipt.
8. Both sides leave a rating.
9. Confirm the collection cards changed owners and the listing is completed.

Use non-sensitive test addresses and clearly synthetic tracking strings. Delete the two accounts after the test if they are not intended to remain as beta accounts.

## 5. Production cutover

Only after the preview and two-account checks pass:

1. Merge the reviewed pull request to `main`.
2. Let Vercel build the exact merged commit.
3. Re-run the smoke checks on the production Vercel URL.
4. Point any custom domain at Vercel.
5. Make that custom domain the Supabase Site URL and retain the Vercel URL as an allowed redirect during rollback coverage.
6. Retire the Lovable-hosted frontend only after the new production URL has been observed working.

Database migrations and frontend deployment remain separate release steps. Apply and verify a database migration before deploying frontend code that depends on it.

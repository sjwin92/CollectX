# Build review — prioritized improvements

Reviewed the codebase, dependency tree, `index.html`, Vite config, DB linter, slow-query stats, and the largest source files. Findings grouped by impact. Pick which groups to ship.

## P0 — Easy wins, ship first

### 1. Remove unused heavyweight dependencies
`package.json` still lists packages that aren't imported anywhere in `src/`:
- `@clerk/clerk-react` — no `@clerk` imports anywhere. The app uses Supabase auth via `useUser`. Removing it cuts a large chunk from cold install + reduces lockfile churn.
- `uuid` + `@types/uuid` — codebase uses `crypto.randomUUID()`. Confirm no remaining imports; remove.
- `@lovable.dev/cloud-auth-js` — verify usage; drop if unused.

### 2. Fix `index.html` metadata bugs
Currently shipped with broken/placeholder values:
- `og:url`, `twitter:url`, `canonical` all point to `https://your-domain.com/` — replace with the real published URL (`https://trade-collectors-haven.lovable.app` or the custom domain).
- Duplicate `og:title` / `twitter:title` / `twitter:description` / `twitter:card` / `twitter:image` tags (declared twice). Keep one.
- `<meta name="title">` says "PokéTrade Hub" while `<title>` says "CollectX" — pick one brand string and use it everywhere.
- `dns-prefetch` for `kitejduabjzmhraiyzre.supabase.co` is for a different project. Replace with the actual Supabase host or drop.
- Remove `<meta http-equiv="X-Frame-Options">` and `<meta http-equiv="X-XSS-Protection">` — neither works as a meta tag; X-XSS-Protection is also deprecated. Drop them.

### 3. Strip console output in production builds
~100+ `console.*` calls across services. Add Vite/esbuild `drop: ['console', 'debugger']` for production builds. Keep `console.error` if you want runtime error visibility.

## P1 — Quality and maintainability

### 4. Split the largest files
- `src/pages/TradeDetail.tsx` (974 lines) — extract sub-sections (header, messages, shipment panel, actions) into smaller components in `src/components/trades/tradeDetail/`.
- `src/components/trades/SocialTradeHub.tsx` (490 lines) and `TradeMessaging.tsx` (440) — same treatment.

Benefit: faster lazy-route load (smaller chunks), better DX, easier code review.

### 5. `useUser` hook hygiene
`src/hooks/useUser.ts` uses `setTimeout(async () => …)` to fetch the profile inside `onAuthStateChange`. The setTimeout has no cleanup and runs on every auth event — on rapid auth changes or unmounts you'll get stale `setState` warnings and orphan fetches. Move the profile fetch into a React Query query keyed by `user.id` (cached, deduped, cancellable), and drop the setTimeout.

### 6. Cap navAnalytics in dev
The dev console emits `[nav]` lines on every route change. Optional: only log them when a `?debugNav` flag is on, so the console stays readable.

## P2 — Backend security tightening

The linter reports 10 warnings. Most are not bugs, but here's what to act on:

- **RLS "WITH CHECK (true)" on nav_metrics** — intentional for public telemetry intake. Leave, or replace with `WITH CHECK (duration_ms >= 0 AND duration_ms <= 60000 AND length(route) < 256)` to harden the payload shape.
- **Public bucket allows listing** — `card-images` bucket can be listed by anyone. Replace the broad SELECT policy on `storage.objects` with one that allows reads of specific paths but blocks `list` operations, or scope listing to the owning user.
- **SECURITY DEFINER functions callable by public/auth** — `has_role`, `get_nav_metrics_summary`, `increment_listing_views`, `handle_new_user`, `update_updated_at_column`. `handle_new_user` and `update_updated_at_column` are trigger-only — `REVOKE EXECUTE ... FROM public, authenticated, anon` on those so they can't be called over the API. `increment_listing_views` should validate input/rate-limit (currently lets anyone bump any listing's view count). `has_role` and `get_nav_metrics_summary` should stay callable by authenticated users.

### 7. Profile query duplication
Slow-query log shows `profiles WHERE user_id = $1 LIMIT 1` ran 452 times. Cheap individually (0.10ms avg) but signals over-fetching. Once `useUser` uses React Query, this drops naturally.

## P3 — Performance polish

### 8. Image optimization
Pokemon card grids load many images. No image plugin or `loading="lazy"` audit exists. Two options:
- Add `vite-imagetools` and convert bundled card placeholders to AVIF/WebP at build time.
- For Supabase-stored card images, use Supabase's image transformation (`width`/`quality` query params on render URLs) sized to the actual grid cell.

### 9. Vite build polish
- Add `build.target: 'es2020'` (smaller output, all modern browsers OK).
- Add `build.chunkSizeWarningLimit: 600` so you see real warnings.
- Add `esbuild: { drop: ['console', 'debugger'] }` (ties into P0 #3).

### 10. Error visibility in production
No error monitoring tool wired up. If you want post-deploy crash visibility, add a lightweight Sentry init (or your provider of choice) gated to production only.

---

## What I'd skip
- Refactoring `supabase/types.ts` (auto-generated).
- Refactoring `ui/sidebar.tsx` / `ui/chart.tsx` (shadcn-vendored).
- Adding SSR — not worth it for this app shape.

---

## Suggested first batch to implement
P0 items 1, 2, 3 + P2 item 6 (REVOKE on trigger-only functions, fix `card-images` listing). Small, safe, high-signal. Want me to proceed with that, or pick a different set?

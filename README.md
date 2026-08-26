# CollectX

Pokémon trading-card platform: collection management, card-for-card trades, a
cash marketplace (Stripe Connect), AI card grading (Claude vision), and
want-list auto-match notifications.

## Stack

- **Frontend:** Vite + React 18 + TypeScript + Tailwind + shadcn/ui, TanStack Query, React Router
- **Backend:** Supabase — Postgres + RLS, Edge Functions (Deno), Storage, Realtime
- **Payments:** Stripe Connect (marketplace orders, seller payouts)
- **Build/host:** [Lovable](https://lovable.dev) — the editor commits straight to `main`

## Local development

```sh
npm install
npm run dev        # Vite dev server on http://localhost:8080
npm run build      # production build
npx tsc --noEmit -p tsconfig.app.json   # typecheck (Vite build does not typecheck)
```

`.env` holds the public `VITE_SUPABASE_*` values (publishable keys — safe to
commit; row-level security protects the data). No backend or Stripe secrets are
in the repo; those live in Supabase project config.

## Database

The canonical database is the Supabase project **`collectx-prod`**
(`yfzfyeoaisspqlziaufx`). Schema is managed by the migrations in
`supabase/migrations/`.

```sh
supabase link --project-ref yfzfyeoaisspqlziaufx
supabase migration list        # local vs. applied
supabase db push               # apply pending migrations
```

> Note: the published `*.lovable.app` build currently points at an older
> Lovable-managed database, not `collectx-prod`. Local dev and the repo config
> use `collectx-prod`.

## Layout

```
src/
  pages/            route components
  components/       feature + shared UI
  services/         Supabase data access
  hooks/  lib/      shared logic
supabase/
  functions/        edge functions (Stripe, grading, catalogue import, MCP)
  migrations/        schema history
```

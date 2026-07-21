# Trade Collectors Haven

Trade Collectors Haven is a trade-only marketplace for Pokémon card collectors. Users can catalogue cards, create listings from cards they own, propose card-for-card trades, message each other, record tracked shipping, confirm receipt and leave a rating.

The product is currently in private beta. It does not collect money, provide escrow or guarantee trades. Shipping and any real-world exchange remain the responsibility of the participants.

## Technology

- React, TypeScript and Vite
- Tailwind CSS and shadcn/ui
- Supabase Authentication, Postgres, Storage and Edge Functions
- GitHub Actions for pull-request validation

## Local development

Use Node.js 20 or later.

```sh
git clone https://github.com/sjwin92/CollectX.git
cd CollectX
npm ci
npm run dev
```

The frontend requires these environment variables:

```text
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

`VITE_SUPABASE_ANON_KEY` is also supported as the key variable for compatibility with existing deployments. Never place the Supabase service-role key in frontend environment variables.

## Validation

Before opening or updating a pull request, run:

```sh
npm run typecheck
npm run build
npm audit --omit=dev
```

Pull requests and pushes to `main` run the typecheck and production build automatically. The repository has pre-existing lint debt, so linting is being rehabilitated separately rather than used as a merge gate yet.

## Database changes

Supabase migrations live in `supabase/migrations`. Review and test each new migration before applying it to production. Do not rewrite migrations that have already been deployed; add an incremental migration instead.

## Development and deployment

GitHub `main` is the source of truth. Development happens on short-lived branches and is reviewed through pull requests. Production database migrations and frontend deployments require separate approval after the branch checks pass.

The frontend is a standard Vite build and can be hosted by any provider that supports a static single-page application. Configure the Supabase environment variables in the hosting provider rather than committing credentials to the repository.

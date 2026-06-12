# Recommended additions to navigation analytics

Building on the existing `nav_metrics` pipeline, here are the highest-leverage additions. Grouped so you can accept/decline per group.

## 1. Richer per-event context (DB + client)

Add columns to `nav_metrics` and populate them in `src/lib/navAnalytics.ts`:

- `from_route` (text) — previous route, so you can analyze transitions (e.g. `/collection → /trades`), not just destinations.
- `nav_type` (text) — `link_click` | `back_forward` | `initial_load` | `programmatic`. Detected via `performance.getEntriesByType('navigation')` + popstate listener.
- `connection_type` (text) + `downlink_mbps` (numeric) — from `navigator.connection` (Chrome/Android). Lets you separate slow-network outliers.
- `save_data` (bool) — `navigator.connection.saveData`.
- `is_authenticated` (bool) — already derivable, but storing avoids joins.
- `referrer_host` (text) — only for `initial_load`, to see where cold traffic lands.
- `web_vitals_lcp_ms`, `web_vitals_inp_ms`, `web_vitals_cls` (numeric, nullable) — captured per route using the `web-vitals` package; sent on the next flush. This is what actually tells you whether prefetch improved perceived perf, not just JS duration.

## 2. Data hygiene

- Add a CHECK constraint: `duration_ms between 0 and 60000` to drop absurd outliers at write time.
- Add a partial index on `(route, prefetched, created_at desc)` for the dashboard query.
- Add a `region` column populated client-side from `Intl.DateTimeFormat().resolvedOptions().timeZone` (cheap proxy; no IP lookup needed).

## 3. Sampling + payload safety

In `navAnalytics.ts`:

- Configurable sample rate (default 100%, but easy to dial down later via a constant).
- Cap batch payload size and drop the oldest events if the queue exceeds e.g. 200 (protects against offline tabs accumulating forever).
- Use `navigator.sendBeacon` on `pagehide` instead of `fetch` so the final flush survives tab close.

## 4. In-app metrics dashboard (admin-only)

New route `/admin/nav-metrics` that renders:

- p50 / p95 / count per route, split by `prefetched`.
- Trend line of p95 per `app_version` (release regression detector).
- Breakdown by `os_name` and `connection_type`.
- Worst 20 transitions by p95 (`from_route → route`).

Access control:
- Add `app_role` enum + `user_roles` table + `has_role()` security-definer function (per the user-roles guidance).
- Page checks `has_role(auth.uid(), 'admin')`; otherwise redirects.
- Add RLS policy on `nav_metrics`: `SELECT` allowed when `has_role(auth.uid(), 'admin')`. Today only `service_role` can read, which blocks an in-app dashboard.

Data fetched via a SECURITY DEFINER SQL function `get_nav_metrics_summary(days int)` that returns the aggregates, so the client never pulls raw rows.

## 5. Optional follow-ups (not in this plan unless you want them)

- Edge function ingestion endpoint instead of direct insert (lets you add server-side IP→country, bot filtering, rate limiting).
- Retention job: delete `nav_metrics` rows older than 90 days via pg_cron.

## What I'd skip

- Full user-agent string storage — already covered by `browser` + `os_name` + `os_version`; raw UA is PII-ish and noisy.
- Per-user dashboards — not useful at this stage; aggregate views answer the perf questions.

---

Tell me which groups to include (1–4) and I'll implement. Default if you just say "go": all of 1, 2, 3, and the dashboard in 4.

/**
 * Lightweight navigation analytics.
 *
 * Measures the time between a user clicking a route link and the
 * destination route actually rendering. Splits results by whether the
 * route chunk was prefetched (hover/focus before click) or not, so we
 * can confirm prefetching is improving first-click performance.
 *
 * Inspect at runtime in the browser console:
 *   window.__navAnalytics.summary()
 *   window.__navAnalytics.events
 */

export type NavSample = {
  to: string;
  prefetched: boolean;
  /** ms between pointer click and route render */
  durationMs: number;
  at: number;
};

type PendingNav = {
  to: string;
  prefetched: boolean;
  startedAt: number;
};

const events: NavSample[] = [];
const prefetched = new Set<string>();
let pending: PendingNav | null = null;

export function markPrefetched(to: string) {
  prefetched.add(to);
}

export function markNavigationStart(to: string) {
  pending = {
    to,
    prefetched: prefetched.has(to),
    startedAt: performance.now(),
  };
}

export function markNavigationEnd(pathname: string) {
  if (!pending) return;
  // Only resolve when the pathname actually matches the click target
  // (avoid attributing redirects/initial mounts to the click).
  if (pending.to !== pathname && !pathname.startsWith(pending.to.split("?")[0])) {
    return;
  }
  const sample: NavSample = {
    to: pending.to,
    prefetched: pending.prefetched,
    durationMs: Math.round(performance.now() - pending.startedAt),
    at: Date.now(),
  };
  events.push(sample);
  if (events.length > 100) events.shift();
  pending = null;

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info(
      `[nav] ${sample.to} ${sample.durationMs}ms ${
        sample.prefetched ? "(prefetched)" : "(cold)"
      }`,
    );
  }
}

function summary() {
  const buckets = { prefetched: [] as number[], cold: [] as number[] };
  for (const e of events) {
    (e.prefetched ? buckets.prefetched : buckets.cold).push(e.durationMs);
  }
  const stat = (arr: number[]) => {
    if (!arr.length) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const avg = Math.round(arr.reduce((s, n) => s + n, 0) / arr.length);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];
    return { count: arr.length, avgMs: avg, p95Ms: p95 };
  };
  return {
    prefetched: stat(buckets.prefetched),
    cold: stat(buckets.cold),
  };
}

if (typeof window !== "undefined") {
  (window as unknown as { __navAnalytics: unknown }).__navAnalytics = {
    events,
    summary,
  };
}

export const navAnalytics = { events, summary };

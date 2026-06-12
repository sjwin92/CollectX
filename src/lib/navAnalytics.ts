/**
 * Lightweight navigation analytics.
 *
 * Measures the time between a user clicking a route link and the
 * destination route actually rendering. Splits results by whether the
 * route chunk was prefetched (hover/focus before click) or not, so we
 * can confirm prefetching is improving first-click performance.
 *
 * Each event also includes the app build version, browser name, device
 * type, and screen size so metrics can be compared across releases and
 * device profiles.
 *
 * Inspect at runtime in the browser console:
 *   window.__navAnalytics.summary()
 *   window.__navAnalytics.events
 */

declare const __APP_VERSION__: string;

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

  enqueueRemote(sample);
}

// ---------- Remote reporting (batched insert into nav_metrics) ----------

let sessionId: string | null = null;
function getSessionId(): string {
  if (sessionId) return sessionId;
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = sessionStorage.getItem("nav_session_id");
    if (existing) {
      sessionId = existing;
      return existing;
    }
    const fresh =
      (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("nav_session_id", fresh);
    sessionId = fresh;
    return fresh;
  } catch {
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return sessionId;
  }
}

type RemoteRow = {
  session_id: string;
  route: string;
  prefetched: boolean;
  duration_ms: number;
  user_agent: string | null;
  app_version: string | null;
  browser: string | null;
  device_type: string | null;
  screen_size: string | null;
  os_name: string | null;
  os_version: string | null;
};

const queue: RemoteRow[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_DELAY_MS = 4000;
const MAX_BATCH = 20;

function getBrowser(): string | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/Edg\/\d+/i.test(ua)) return "Edge";
  if (/OPR\/\d+/i.test(ua) || /Opera/.test(ua)) return "Opera";
  if (/Chrome\/\d+/i.test(ua)) return "Chrome";
  if (/Safari\/\d+/i.test(ua)) return "Safari";
  if (/Firefox\/\d+/i.test(ua)) return "Firefox";
  if (/MSIE|Trident/.test(ua)) return "IE";
  return "Other";
}

function getDeviceType(): string | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return "Mobile";
  if (/Tablet|iPad/i.test(ua)) return "Tablet";
  return "Desktop";
}

function getScreenSize(): string | null {
  if (typeof window === "undefined") return null;
  return `${window.screen.width}x${window.screen.height}`;
}

function getOS(): { name: string | null; version: string | null } {
  if (typeof navigator === "undefined") return { name: null, version: null };
  const ua = navigator.userAgent;
  const platform = navigator.platform ?? "";

  let name: string | null = null;
  let version: string | null = null;

  // Windows
  const winMatch = ua.match(/Windows NT ([\d.]+)/);
  if (winMatch) {
    name = "Windows";
    version = winMatch[1];
  }

  // macOS / iOS
  const macMatch = ua.match(/Mac OS X ([\d_]+)/);
  if (macMatch) {
    name = /iPhone|iPad|iPod/.test(ua) ? "iOS" : "macOS";
    version = macMatch[1].replace(/_/g, ".");
  }

  // Android
  const androidMatch = ua.match(/Android ([\d.]+)/);
  if (androidMatch) {
    name = "Android";
    version = androidMatch[1];
  }

  // Linux (fallback when no other OS matched)
  if (!name && /Linux/.test(platform)) {
    name = "Linux";
  }

  return { name, version };
}

function enqueueRemote(sample: NavSample) {
  if (typeof window === "undefined") return;
  const os = getOS();
  queue.push({
    session_id: getSessionId(),
    route: sample.to,
    prefetched: sample.prefetched,
    duration_ms: sample.durationMs,
    user_agent:
      typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
    app_version: typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : null,
    browser: getBrowser(),
    device_type: getDeviceType(),
    screen_size: getScreenSize(),
    os_name: os.name,
    os_version: os.version,
  });
  if (queue.length >= MAX_BATCH) {
    void flush();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => void flush(), FLUSH_DELAY_MS);
  }
}

async function flush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!queue.length) return;
  const batch = queue.splice(0, queue.length);
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;
    const rows = batch.map((r) => ({ ...r, user_id: userId }));
    const { error } = await supabase.from("nav_metrics").insert(rows);
    if (error) throw error;
  } catch (err) {
    // On failure, drop the batch — telemetry must not break the app or grow unbounded.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[nav] failed to flush metrics", err);
    }
  }
}

if (typeof window !== "undefined") {
  // Best-effort flush when the tab is hidden or unloaded.
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
  window.addEventListener("pagehide", () => void flush());
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

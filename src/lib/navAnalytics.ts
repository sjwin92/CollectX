/**
 * Lightweight navigation analytics.
 *
 * Measures the time between a user clicking a route link and the
 * destination route actually rendering. Splits results by whether the
 * route chunk was prefetched (hover/focus before click) or not, so we
 * can confirm prefetching is improving first-click performance.
 *
 * Each event also includes rich client context (app version, browser,
 * device type, screen size, OS, connection, region, web vitals) so we
 * can compare across releases, devices, and network conditions.
 *
 * Inspect at runtime in the browser console:
 *   window.__navAnalytics.summary()
 *   window.__navAnalytics.events
 */

import { onLCP, onINP, onCLS, type Metric } from "web-vitals";

declare const __APP_VERSION__: string;

export type NavType = "link_click" | "back_forward" | "initial_load" | "programmatic";

export type NavSample = {
  to: string;
  from: string | null;
  navType: NavType;
  prefetched: boolean;
  /** ms between pointer click and route render */
  durationMs: number;
  at: number;
};

type PendingNav = {
  to: string;
  from: string | null;
  navType: NavType;
  prefetched: boolean;
  startedAt: number;
};

const SAMPLE_RATE = 1.0; // 0..1
const MAX_QUEUE = 200;
const FLUSH_DELAY_MS = 4000;
const MAX_BATCH = 20;

const events: NavSample[] = [];
const prefetched = new Set<string>();
let pending: PendingNav | null = null;
let lastRoute: string | null = null;

export function markPrefetched(to: string) {
  prefetched.add(to);
}

export function markNavigationStart(
  to: string,
  navType: NavType = "link_click",
) {
  pending = {
    to,
    from: lastRoute,
    navType,
    prefetched: prefetched.has(to),
    startedAt: performance.now(),
  };
}

export function markNavigationEnd(pathname: string) {
  // Always update last-known route, even when there's no pending click.
  const prev = lastRoute;
  lastRoute = pathname;

  if (!pending) return;
  if (pending.to !== pathname && !pathname.startsWith(pending.to.split("?")[0])) {
    return;
  }
  const sample: NavSample = {
    to: pending.to,
    from: pending.from ?? prev,
    navType: pending.navType,
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
      `[nav] ${sample.from ?? "(initial)"} → ${sample.to} ${sample.durationMs}ms ${
        sample.prefetched ? "(prefetched)" : "(cold)"
      } [${sample.navType}]`,
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
  from_route: string | null;
  nav_type: string | null;
  connection_type: string | null;
  downlink_mbps: number | null;
  save_data: boolean | null;
  is_authenticated: boolean | null;
  referrer_host: string | null;
  region: string | null;
  web_vitals_lcp_ms: number | null;
  web_vitals_inp_ms: number | null;
  web_vitals_cls: number | null;
};

const queue: RemoteRow[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

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
  if (/Tablet|iPad/i.test(ua)) return "Tablet";
  if (/Mobi|Android/i.test(ua)) return "Mobile";
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

  const winMatch = ua.match(/Windows NT ([\d.]+)/);
  if (winMatch) {
    name = "Windows";
    version = winMatch[1];
  }
  const macMatch = ua.match(/Mac OS X ([\d_]+)/);
  if (macMatch) {
    name = /iPhone|iPad|iPod/.test(ua) ? "iOS" : "macOS";
    version = macMatch[1].replace(/_/g, ".");
  }
  const androidMatch = ua.match(/Android ([\d.]+)/);
  if (androidMatch) {
    name = "Android";
    version = androidMatch[1];
  }
  if (!name && /Linux/.test(platform)) name = "Linux";
  return { name, version };
}

type NetInfo = {
  effectiveType?: string;
  downlink?: number;
  saveData?: boolean;
};
function getConnection(): NetInfo {
  if (typeof navigator === "undefined") return {};
  const c = (navigator as Navigator & { connection?: NetInfo }).connection;
  return c ?? {};
}

function getRegion(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

function getReferrerHost(): string | null {
  if (typeof document === "undefined" || !document.referrer) return null;
  try {
    return new URL(document.referrer).host;
  } catch {
    return null;
  }
}

// ---------- Web Vitals (collected once per page lifetime) ----------
let lcp: number | null = null;
let inp: number | null = null;
let cls: number | null = null;
if (typeof window !== "undefined") {
  const set = (m: Metric, kind: "lcp" | "inp" | "cls") => {
    if (kind === "lcp") lcp = Math.round(m.value);
    else if (kind === "inp") inp = Math.round(m.value);
    else cls = Math.round(m.value * 1000) / 1000;
  };
  try {
    onLCP((m) => set(m, "lcp"));
    onINP((m) => set(m, "inp"));
    onCLS((m) => set(m, "cls"));
  } catch {
    // ignore
  }
}

let cachedAuth: boolean | null = null;
async function isAuthenticated(): Promise<boolean> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    cachedAuth = !!data.session?.user;
    return cachedAuth;
  } catch {
    return cachedAuth ?? false;
  }
}

function enqueueRemote(sample: NavSample) {
  if (typeof window === "undefined") return;
  if (Math.random() > SAMPLE_RATE) return;

  const os = getOS();
  const conn = getConnection();
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
    from_route: sample.from,
    nav_type: sample.navType,
    connection_type: conn.effectiveType ?? null,
    downlink_mbps: typeof conn.downlink === "number" ? conn.downlink : null,
    save_data: typeof conn.saveData === "boolean" ? conn.saveData : null,
    is_authenticated: cachedAuth,
    referrer_host: sample.navType === "initial_load" ? getReferrerHost() : null,
    region: getRegion(),
    web_vitals_lcp_ms: lcp,
    web_vitals_inp_ms: inp,
    web_vitals_cls: cls,
  });

  // Cap queue: drop oldest if we somehow exceed (e.g. offline tab).
  while (queue.length > MAX_QUEUE) queue.shift();

  if (queue.length >= MAX_BATCH) {
    void flush();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => void flush(), FLUSH_DELAY_MS);
  }
}

async function flush(useBeacon = false) {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!queue.length) return;
  const batch = queue.splice(0, queue.length);
  try {
    const auth = await isAuthenticated();
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;
    const rows = batch.map((r) => ({
      ...r,
      user_id: userId,
      is_authenticated: r.is_authenticated ?? auth,
    }));

    if (useBeacon && typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      // Direct PostgREST insert via beacon — survives tab close.
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/nav_metrics`;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const blob = new Blob([JSON.stringify(rows)], { type: "application/json" });
      // sendBeacon can't set custom headers; fall back to fetch with keepalive.
      try {
        await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            apikey: key,
            authorization: `Bearer ${session?.access_token ?? key}`,
            prefer: "return=minimal",
          },
          body: blob,
          keepalive: true,
        });
        return;
      } catch {
        navigator.sendBeacon(url, blob);
        return;
      }
    }

    const { error } = await supabase.from("nav_metrics").insert(rows);
    if (error) throw error;
  } catch (err) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[nav] failed to flush metrics", err);
    }
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush(true);
  });
  window.addEventListener("pagehide", () => void flush(true));

  // Back/forward navigation
  window.addEventListener("popstate", () => {
    markNavigationStart(window.location.pathname, "back_forward");
  });
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

/**
 * Lightweight client-side error reporter.
 *
 * - In development: logs to the console with full detail.
 * - In production: buffers the last N errors in memory and on `sessionStorage`
 *   so they can be inspected via `window.__getErrorLog()` from devtools or
 *   forwarded later to an external service (Sentry, LogRocket, etc.).
 *
 * Intentionally has zero runtime dependencies and no network I/O so it cannot
 * itself become a source of bugs or unbounded retries.
 */

export interface ReportedError {
  message: string;
  stack?: string;
  source: "window" | "unhandledrejection" | "react" | "manual";
  url: string;
  ts: number;
  meta?: Record<string, unknown>;
}

const MAX_ENTRIES = 25;
const STORAGE_KEY = "__app_errors";

const buffer: ReportedError[] = [];

function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(buffer));
  } catch {
    /* sessionStorage may be unavailable (private mode, quota) */
  }
}

export function reportError(
  err: unknown,
  source: ReportedError["source"] = "manual",
  meta?: Record<string, unknown>,
) {
  const entry: ReportedError = {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    source,
    url: typeof window !== "undefined" ? window.location.href : "",
    ts: Date.now(),
    meta,
  };

  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.shift();
  persist();

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error(`[${source}]`, err, meta ?? "");
  }
}

export function getErrorLog(): ReportedError[] {
  return [...buffer];
}

export function installGlobalErrorHandlers() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    reportError(event.error ?? event.message, "window", {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason, "unhandledrejection");
  });

  // Expose a debug helper – only in production builds where console.* is
  // stripped, this is the only way to retrieve buffered errors.
  (window as unknown as { __getErrorLog: () => ReportedError[] }).__getErrorLog =
    getErrorLog;
}

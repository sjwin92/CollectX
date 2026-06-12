import { Link, type LinkProps } from "react-router-dom";
import { forwardRef, useCallback, type ReactNode } from "react";

/**
 * Maps route paths to their lazy import functions.
 * Add entries here to enable prefetching for a route.
 */
const routePrefetchers: Record<string, () => Promise<unknown>> = {
  "/trades": () => import("@/pages/Trades"),
  "/trades/:id": () => import("@/pages/TradeDetail"),
  "/collection": () => import("@/pages/Collection"),
  "/collection-boxes": () => import("@/pages/CollectionBoxes"),
  "/marketplace": () => import("@/pages/Marketplace"),
  "/profile": () => import("@/pages/Profile"),
  "/account-settings": () => import("@/pages/AccountSettings"),
};

interface PrefetchLinkProps extends Omit<LinkProps, "to"> {
  to: string;
  children: ReactNode;
}

/**
 * A drop-in replacement for React Router's `<Link>` that prefetches the
 * target route chunk on hover or focus so navigation feels instant.
 */
export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  ({ to, children, ...props }, ref) => {
    const prefetch = useCallback(() => {
      // Match exact path or a parent path if no exact match exists
      const prefetcher =
        routePrefetchers[to] ||
        Object.entries(routePrefetchers).find(([key]) => {
          // Support wildcard-ish parent routes (e.g. /trades/:id -> /trades)
          if (key.includes(":")) {
            const base = key.split("/:")[0];
            return to.startsWith(base);
          }
          return false;
        })?.[1];

      if (prefetcher) {
        // Vite caches the dynamic import; calling it again is a no-op
        prefetcher().catch(() => {
          // Silently ignore failed prefetches
        });
      }
    }, [to]);

    return (
      <Link
        ref={ref}
        to={to}
        onMouseEnter={prefetch}
        onFocus={prefetch}
        onTouchStart={prefetch}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

PrefetchLink.displayName = "PrefetchLink";


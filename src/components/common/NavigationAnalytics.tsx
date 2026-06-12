import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { markNavigationStart, markNavigationEnd } from "@/lib/navAnalytics";

/**
 * Mounted once inside <BrowserRouter>. Whenever the location changes,
 * we mark the navigation as complete so navAnalytics can compute the
 * click-to-render duration.
 *
 * Also handles initial page load and programmatic navigations (POP/PUSH/REPLACE
 * without a click) so the metrics queue captures every transition.
 */
const NavigationAnalytics = () => {
  const location = useLocation();
  const navType = useNavigationType();
  const firstRender = useRef(true);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = true;
    }
    // If there's no pending click-tracked navigation for this path, infer the type.
    if (lastPath.current !== location.pathname) {
      // Heuristic: if React Router reports POP it's back/forward; PUSH/REPLACE without
      // a prior markNavigationStart means a programmatic or initial navigation.
      if (firstRender.current && lastPath.current === null) {
        markNavigationStart(location.pathname, "initial_load");
      } else if (navType === "POP") {
        // popstate listener in navAnalytics also fires; safe to re-mark.
        markNavigationStart(location.pathname, "back_forward");
      }
      // For PUSH/REPLACE: PrefetchLink already called markNavigationStart on click.
      // If not (programmatic navigate()), no pending nav exists and the metric is skipped.
    }

    const raf = requestAnimationFrame(() => {
      markNavigationEnd(location.pathname);
      lastPath.current = location.pathname;
      firstRender.current = false;
    });
    return () => cancelAnimationFrame(raf);
  }, [location.pathname, navType]);

  return null;
};

export default NavigationAnalytics;

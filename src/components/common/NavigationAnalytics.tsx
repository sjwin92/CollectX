import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { markNavigationEnd } from "@/lib/navAnalytics";

/**
 * Mounted once inside <BrowserRouter>. Whenever the location changes,
 * we mark the navigation as complete so navAnalytics can compute the
 * click-to-render duration.
 */
const NavigationAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    // Wait one frame so the new route has actually painted before we stop the timer.
    const raf = requestAnimationFrame(() => {
      markNavigationEnd(location.pathname);
    });
    return () => cancelAnimationFrame(raf);
  }, [location.pathname]);

  return null;
};

export default NavigationAnalytics;

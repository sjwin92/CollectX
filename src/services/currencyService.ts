const RATE_KEY = 'collectx_usd_gbp_rate';
const RATE_TTL = 24 * 60 * 60 * 1000;

interface CachedRate {
  rate: number;
  timestamp: number;
}

// frankfurter.dev is the current host — api.frankfurter.app now 301-redirects
// to it, and the cross-origin redirect breaks fetch()'s CORS check.
const FX_URL = 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=GBP';

export const refreshUsdToGbpRate = async (): Promise<void> => {
  try {
    const res = await fetch(FX_URL);
    if (!res.ok) return;
    const data = await res.json();
    const rate = data.rates?.GBP;
    if (rate) {
      localStorage.setItem(RATE_KEY, JSON.stringify({ rate, timestamp: Date.now() }));
    }
  } catch {
    // silently keep the cached or fallback rate
  }
};

export const getUsdToGbpRate = (): number => {
  try {
    const cached = localStorage.getItem(RATE_KEY);
    if (cached) {
      const { rate, timestamp } = JSON.parse(cached) as CachedRate;
      if (Date.now() - timestamp < RATE_TTL) return rate;
    }
  } catch {
    // ignore parse errors
  }
  return 0.74; // fallback only — refreshed from the FX API on load
};

export const usdToGbp = (usd: number): number =>
  Math.round(usd * getUsdToGbpRate() * 100) / 100;

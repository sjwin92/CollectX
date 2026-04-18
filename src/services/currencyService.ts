const RATE_KEY = 'collectx_usd_gbp_rate';
const RATE_TTL = 24 * 60 * 60 * 1000;

interface CachedRate {
  rate: number;
  timestamp: number;
}

export const refreshUsdToGbpRate = async (): Promise<void> => {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=GBP');
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
  return 0.79;
};

export const usdToGbp = (usd: number): number =>
  Math.round(usd * getUsdToGbpRate() * 100) / 100;

type CachedOverpassPayload<T> = {
  timestamp: number;
  failed?: boolean;
  data: T;
};

const CACHE_KEY = 'overpass-hostels-cache-v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FAILURE_TTL_MS = 15 * 60 * 1000;
let inFlightRequest: Promise<any> | null = null;

export async function getCachedOverpassData<T>(fetcher: () => Promise<T>): Promise<T | null> {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as CachedOverpassPayload<T>;
        const age = Date.now() - cached.timestamp;
        if (cached?.failed && age < FAILURE_TTL_MS) {
          return null;
        }

        if (cached?.timestamp && age < CACHE_TTL_MS) {
          return cached.data;
        }
      }
    } catch {
      // Ignore cache parse issues and fetch fresh data.
    }
  }

  if (inFlightRequest) {
    return inFlightRequest as Promise<T | null>;
  }

  inFlightRequest = (async () => {
    try {
      const data = await fetcher();

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              timestamp: Date.now(),
              data
            })
          );
        } catch {
          // Ignore storage quota issues.
        }
      }

      return data;
    } catch (error) {
      cacheOverpassFailure();
      return null;
    } finally {
      inFlightRequest = null;
    }
  })();

  return inFlightRequest as Promise<T | null>;
}

export function cacheOverpassFailure(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        failed: true,
        data: null
      })
    );
  } catch {
    // Ignore storage quota issues.
  }
}

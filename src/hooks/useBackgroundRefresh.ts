import { useEffect } from 'react';

export function useBackgroundRefresh(fetchFn: (isBackground?: boolean) => Promise<void> | void, intervalMs: number = 600000) {
  useEffect(() => {
    const interval = setInterval(() => {
      fetchFn(true); // Indicate this is a background fetch
    }, intervalMs);
    
    return () => clearInterval(interval);
  }, [fetchFn, intervalMs]);
}

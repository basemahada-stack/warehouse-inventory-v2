import { useEffect } from 'react';

export function useBackgroundRefresh(fetchFn: (isBackground?: boolean) => Promise<void> | void) {
  useEffect(() => {
    const handleRefresh = () => {
      fetchFn(true); // Indicate this is a background fetch
    };
    
    window.addEventListener('global-refresh', handleRefresh);
    return () => window.removeEventListener('global-refresh', handleRefresh);
  }, [fetchFn]);
}

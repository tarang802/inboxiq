import { useEffect } from 'react';

// "Insights · Sieve" in the tab, or just "Sieve" on the landing page
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Sieve` : 'Sieve';
  }, [title]);
}

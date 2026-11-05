import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { applyTheme, getTheme, saveTheme, systemDark, type Theme } from '../lib/theme';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getTheme);

  // on "system", follow the os when it switches, e.g. at sunset
  useEffect(() => {
    if (theme !== 'system') return;
    const media = systemDark();
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    saveTheme(next);
    setThemeState(next);
  }, []);

  return { theme, setTheme };
}

function watchDarkClass(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

// whether the page is dark right now, whichever setting or os change made it so
export function useIsDark() {
  return useSyncExternalStore(watchDarkClass, () =>
    document.documentElement.classList.contains('dark'),
  );
}

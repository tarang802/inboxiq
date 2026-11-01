export type Theme = 'system' | 'light' | 'dark';

// same key as public/theme.js, which applies it before the app loads
const KEY = 'theme';

export const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)');

export function getTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // storage can be blocked; fall back to the system setting
  }
  return 'system';
}

export function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && systemDark().matches);
  document.documentElement.classList.toggle('dark', dark);
}

export function saveTheme(theme: Theme) {
  try {
    if (theme === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // still applies for this visit
  }
  applyTheme(theme);
}

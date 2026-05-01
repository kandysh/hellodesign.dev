import { useState, useEffect } from 'react';
import { getTheme, toggleTheme, type Theme } from '../lib/theme';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getTheme);

  useEffect(() => {
    const handler = (e: Event) => {
      setThemeState((e as CustomEvent<Theme>).detail);
    };
    window.addEventListener('theme-change', handler);
    return () => window.removeEventListener('theme-change', handler);
  }, []);

  return { theme, toggle: () => { toggleTheme(); } };
}

/**
 * Lightweight theme store — no React context needed.
 * Reads/writes localStorage + applies data-theme to <html>.
 */

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'app-theme';

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
}

export function initTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  const theme = stored ?? preferred;
  applyTheme(theme);
  return theme;
}

export function getTheme(): Theme {
  return (document.documentElement.getAttribute('data-theme') as Theme) ?? 'dark';
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(STORAGE_KEY, next);
  window.dispatchEvent(new CustomEvent('theme-change', { detail: next }));
  return next;
}

export function setTheme(theme: Theme) {
  applyTheme(theme);
  localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent('theme-change', { detail: theme }));
}

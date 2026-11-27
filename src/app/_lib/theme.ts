/**
 * Theme handling for `/` and `/staff`.
 * `/display` ignores this and always wraps itself in `.dark`.
 */

export const THEME_KEY = 'qcare-badagry:theme';

export type ThemeName = 'light' | 'dark';

/** Inline script for <head>: saved choice wins, otherwise the system preference. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)});var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light'}catch(_){}})()`;

export function resolveTheme(): ThemeName {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    /* storage blocked */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: ThemeName) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

export function toggleTheme() {
  const next: ThemeName = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
  applyTheme(next);
  try {
    window.localStorage.setItem(THEME_KEY, next);
  } catch {
    /* storage blocked, the choice still applies to this page */
  }
}

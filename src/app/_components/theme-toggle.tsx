'use client';

import { useLayoutEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { THEME_KEY, applyTheme, resolveTheme, toggleTheme } from '../_lib/theme';
import { focusRing } from './ui';

/** Compact sun/moon switch. Icons swap with CSS, so server and client markup match. */
export function ThemeToggle() {
  useLayoutEffect(() => {
    // Re-apply after React's dev remount resets <html>; a no-op in production
    applyTheme(resolveTheme());

    // Keep other open tabs in step, and follow the system until the user chooses
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystem = () => applyTheme(resolveTheme());
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY) applyTheme(resolveTheme());
    };
    media.addEventListener('change', onSystem);
    window.addEventListener('storage', onStorage);
    return () => {
      media.removeEventListener('change', onSystem);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line text-muted transition-colors hover:bg-subtle hover:text-ink ${focusRing}`}
    >
      <Moon className="h-4 w-4 shrink-0 dark:hidden" aria-hidden="true" />
      <Sun className="hidden h-4 w-4 shrink-0 dark:block" aria-hidden="true" />
    </button>
  );
}

'use client';

import { useSyncExternalStore } from 'react';

/* -------------------------------------------------------------------------- */
/* Small client-only hooks built on useSyncExternalStore so server HTML never  */
/* depends on the clock or on localStorage.                                    */
/* -------------------------------------------------------------------------- */

/* ---------------------------------- Clock --------------------------------- */

let now = 0;
let timer: number | undefined;
const clockListeners = new Set<() => void>();

function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  if (timer === undefined) {
    now = Date.now();
    timer = window.setInterval(() => {
      now = Date.now();
      clockListeners.forEach((fn) => fn());
    }, 1000);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}

function readClock(): number {
  if (now === 0) now = Date.now();
  return now;
}

/** Current time, ticking once a second. `null` on the server. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribeClock, readClock, () => null);
}

/* ------------------------------ Persisted value --------------------------- */

/**
 * A string persisted in localStorage. `sync` mirrors changes from other tabs.
 * Returns `null` on the server so the first client render can catch up.
 */
export function createLocalValue(key: string, fallback: string, { sync = false } = {}) {
  let value: string | null = null;
  const listeners = new Set<() => void>();

  const get = (): string => {
    if (value === null) {
      try {
        value = window.localStorage.getItem(key) ?? fallback;
      } catch {
        value = fallback;
      }
    }
    return value;
  };

  const set = (next: string) => {
    value = next;
    try {
      window.localStorage.setItem(key, next);
    } catch {
      /* storage blocked */
    }
    listeners.forEach((fn) => fn());
  };

  const onStorage = (e: StorageEvent) => {
    if (e.key !== key) return;
    value = e.newValue ?? fallback;
    listeners.forEach((fn) => fn());
  };

  const subscribe = (listener: () => void) => {
    if (sync && listeners.size === 0) window.addEventListener('storage', onStorage);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (sync && listeners.size === 0) window.removeEventListener('storage', onStorage);
    };
  };

  function useValue(): string | null {
    return useSyncExternalStore(subscribe, get, () => null);
  }

  return { useValue, set };
}

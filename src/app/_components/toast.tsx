'use client';

import { useCallback, useEffect, useState } from 'react';
import { CircleCheck, X } from 'lucide-react';
import { focusRing } from './ui';

interface ToastState {
  id: number;
  text: string;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const show = useCallback((text: string) => setToast({ id: Date.now(), text }), []);
  const dismiss = useCallback(() => setToast(null), []);
  return { toast, show, dismiss };
}

export function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-16 z-40 flex justify-center">
      {toast && (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-md border border-line-strong bg-surface p-2 pl-4 text-sm text-ink"
        >
          <CircleCheck className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
          <p className="min-w-0 flex-1">{toast.text}</p>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-subtle hover:text-ink ${focusRing}`}
          >
            <X className="h-4 w-4 shrink-0" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

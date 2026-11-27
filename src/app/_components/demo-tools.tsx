'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronUp, RotateCcw, SkipForward, UserPlus, Wrench } from 'lucide-react';
import { queueActions } from '../_lib/store';
import { deskById } from '../_lib/queue';
import { focusRing } from './ui';

/**
 * Testing actions live here, out of the production interface.
 * Closed by default, bottom-right, and labelled plainly as demo tooling.
 */
export function DemoTools() {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const actions = [
    {
      label: 'Add random patient',
      Icon: UserPlus,
      run: () => {
        const p = queueActions.addRandomPatient();
        setNote(`Checked in ${p.ticketNo} · ${p.name}`);
      },
    },
    {
      label: 'Simulate next call',
      Icon: SkipForward,
      run: () => {
        const p = queueActions.simulateNext();
        setNote(p ? `Called ${p.ticketNo} to ${deskById(p.deskId)?.label ?? 'desk'}` : 'No one is waiting.');
      },
    },
    {
      label: 'Reset queue',
      Icon: RotateCcw,
      run: () => {
        queueActions.resetQueue();
        setNote('Queue reset to sample data.');
      },
    },
  ];

  return (
    <div ref={rootRef} className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {open && (
        <div
          id="demo-tools-panel"
          role="region"
          aria-label="Demo tools"
          className="w-64 rounded-md border border-line-strong bg-surface p-2"
        >
          <p className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Demo tools · testing only
          </p>
          <ul className="space-y-1">
            {actions.map(({ label, Icon, run }) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={run}
                  className={`inline-flex h-10 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-medium text-ink hover:bg-subtle ${focusRing}`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
          {note && (
            <p aria-live="polite" className="mt-1 border-t border-line px-2 pb-1 pt-2 text-xs text-muted">
              {note}
            </p>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="demo-tools-panel"
        className={`inline-flex h-9 items-center gap-2 rounded-md border border-line bg-surface px-3 text-xs font-medium text-muted transition-colors hover:text-ink ${focusRing}`}
      >
        <Wrench className="h-4 w-4 shrink-0" aria-hidden="true" />
        Demo Tools
        <ChevronUp
          className={`h-4 w-4 shrink-0 transition-transform ${open ? '' : 'rotate-180'}`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

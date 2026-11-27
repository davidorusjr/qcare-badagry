'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Volume2, VolumeX } from 'lucide-react';
import { useNow } from '../_lib/client-state';
import { announceCall, unlockAudio } from '../_lib/audio';
import { useQueue } from '../_lib/store';
import {
  deptById,
  deskById,
  formatClock,
  formatDate,
  servingList,
  waitingList,
} from '../_lib/queue';
import { LogoMark } from './ui';

/** A call stays highlighted as "Now calling" for this long. */
const FRESH_MS = 20_000;

/**
 * Waiting room TV. Permanently dark, read-only, sized for viewing from across
 * the room. The only interaction is an optional click to allow sound.
 */
export function DisplayView() {
  const state = useQueue();
  const now = useNow();
  const [soundOn, setSoundOn] = useState(false);
  const soundRef = useRef(false);

  const serving = state ? servingList(state.patients) : [];
  const hero = serving[0];
  const others = serving.slice(1, 5);
  const upNext = state ? waitingList(state.patients).slice(0, 6) : [];
  const heroDesk = deskById(hero?.deskId);
  const fresh = hero && now ? now - (hero.calledAt ?? 0) < FRESH_MS : false;

  // Sound needs one click or key press on most browsers (kiosk setups may allow it outright)
  useEffect(() => {
    const enable = async () => {
      const ok = await unlockAudio();
      soundRef.current = ok;
      setSoundOn(ok);
    };
    // Kiosk browsers may allow audio straight away; otherwise this resolves false
    void enable();
    window.addEventListener('pointerdown', enable);
    window.addEventListener('keydown', enable);
    return () => {
      window.removeEventListener('pointerdown', enable);
      window.removeEventListener('keydown', enable);
    };
  }, []);

  // Announce each new call or recall once
  const callKey = hero ? `${hero.id}:${hero.calledAt}` : '';
  const lastKey = useRef<string | null>(null);
  const loaded = state !== null;
  useEffect(() => {
    if (!loaded) return;
    if (lastKey.current !== null && callKey && callKey !== lastKey.current && soundRef.current && hero) {
      announceCall(hero.ticketNo, heroDesk?.label ?? deptById(hero.department).name);
    }
    lastKey.current = callKey;
    // hero and heroDesk are derived from callKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callKey, loaded]);

  return (
    <div className="dark flex min-h-dvh flex-col bg-canvas text-ink lg:h-dvh lg:overflow-hidden">
      {/* Top bar */}
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line px-4 lg:h-24 lg:px-12">
        <div className="flex min-w-0 items-center gap-3 lg:gap-4">
          <LogoMark className="h-8 w-8 lg:h-12 lg:w-12" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight sm:text-base lg:text-3xl">
              Badagry General Hospital
            </p>
            <p className="truncate text-xs text-muted lg:text-lg">Patient Queue · QCare</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-xl font-semibold leading-none tabular-nums sm:text-2xl lg:text-5xl">
            {now ? formatClock(now, true) : '--:--:--'}
          </p>
          <p className="mt-1 text-xs text-muted lg:mt-2 lg:text-base">{now ? formatDate(now) : '\u00a0'}</p>
        </div>
      </header>

      <main className="grid flex-1 lg:min-h-0 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Now serving */}
        <section
          aria-label="Now serving"
          className="@container flex min-w-0 flex-col border-b border-line p-4 lg:border-b-0 lg:border-r lg:p-12"
        >
          <p
            className={`inline-flex h-8 w-fit items-center rounded px-4 text-sm font-semibold uppercase tracking-widest lg:h-12 lg:text-xl ${
              fresh ? 'bg-brand text-on-brand' : 'border border-line-strong text-muted'
            }`}
          >
            {fresh ? 'Now calling' : 'Now serving'}
          </p>

          {hero ? (
            <>
              <p
                aria-live="polite"
                className="mt-6 font-mono text-[clamp(3.5rem,17cqw,13rem)] font-bold leading-none tracking-tight tabular-nums lg:mt-8"
              >
                {hero.ticketNo}
              </p>

              <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-12 lg:gap-8">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-widest text-muted lg:text-lg">Department</dt>
                  <dd className="mt-1 text-xl font-semibold lg:mt-2 lg:text-3xl xl:text-4xl">
                    {deptById(hero.department).name}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-widest text-muted lg:text-lg">Proceed to</dt>
                  <dd className="mt-1 inline-flex items-center gap-2 whitespace-nowrap text-xl font-semibold text-brand lg:mt-2 lg:gap-3 lg:text-3xl xl:text-4xl">
                    <ArrowRight className="h-5 w-5 shrink-0 lg:h-8 lg:w-8" aria-hidden="true" />
                    {heroDesk?.label ?? '—'}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="mt-6 font-mono text-[clamp(3.5rem,17cqw,13rem)] font-bold leading-none text-line-strong lg:mt-8">
              ---
            </p>
          )}

          {/* Other active desks */}
          {others.length > 0 && (
            <div className="mt-8 lg:mt-auto lg:pt-12">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted lg:text-base">Also serving</p>
              <ul className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line xl:grid-cols-4">
                {others.map((p) => (
                  <li key={p.id} className="min-w-0 bg-canvas p-4">
                    <p className="font-mono text-xl font-semibold tabular-nums lg:text-2xl">{p.ticketNo}</p>
                    <p className="mt-1 text-xs leading-snug text-muted lg:text-sm">{deskById(p.deskId)?.label}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Up next */}
        <section aria-label="Up next" className="flex min-w-0 flex-col p-4 lg:min-h-0 lg:p-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted lg:text-xl">Up Next</h2>
          {upNext.length === 0 ? (
            <p className="mt-6 text-lg text-muted lg:text-2xl">No one is waiting.</p>
          ) : (
            <ol className="mt-4 divide-y divide-line border-y border-line lg:mt-6">
              {upNext.map((p, i) => (
                <li
                  key={p.id}
                  className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-4 py-4 lg:grid-cols-[3rem_minmax(0,1fr)_auto] lg:py-6"
                >
                  <span className="font-mono text-sm tabular-nums text-muted lg:text-xl">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-3xl font-semibold leading-none tabular-nums xl:text-5xl">
                    {p.ticketNo}
                  </span>
                  <span className="text-right text-sm text-muted lg:text-xl">{deptById(p.department).short}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>

      {/* Notice bar */}
      <footer className="flex min-h-12 shrink-0 items-center justify-between gap-4 border-t border-line px-4 py-2 text-xs text-muted lg:h-16 lg:px-12 lg:text-lg">
        <p>Keep your ticket number ready. Emergency and priority patients are seen first.</p>
        <p className="inline-flex shrink-0 items-center gap-2">
          {soundOn ? (
            <Volume2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <VolumeX className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className={soundOn ? 'sr-only' : ''}>{soundOn ? 'Sound on' : 'Click to enable sound'}</span>
        </p>
      </footer>
    </div>
  );
}

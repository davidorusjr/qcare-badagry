import type { ReactNode } from 'react';
import { REASON_LABEL, TRIAGE_LABEL, type PriorityReason, type Triage } from '../_lib/queue';

/* -------------------------------------------------------------------------- */
/* Design primitives. Spacing is locked to the 4px scale; radius is 6px.      */
/* -------------------------------------------------------------------------- */

export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-brand text-on-brand hover:bg-brand-hover disabled:bg-line disabled:text-muted disabled:hover:bg-line',
  secondary:
    'border border-line-strong bg-surface text-ink hover:bg-subtle disabled:text-muted disabled:hover:bg-surface',
  ghost: 'text-ink hover:bg-subtle disabled:text-muted disabled:hover:bg-transparent',
};

const SIZE: Record<Size, string> = {
  sm: 'h-10 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

/** Button classes. `md` and `lg` meet the 44px touch target. */
export function btn(variant: Variant = 'secondary', size: Size = 'md'): string {
  return `inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-colors disabled:cursor-not-allowed ${focusRing} ${VARIANT[variant]} ${SIZE[size]}`;
}

export const inputClass = `h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-base text-ink placeholder:text-muted sm:text-sm ${focusRing}`;

export const labelClass = 'block text-sm font-medium text-ink';

export const eyebrowClass = 'text-xs font-semibold uppercase tracking-wider text-muted';

/* --------------------------------- Badges --------------------------------- */

const TRIAGE_STYLE: Record<Triage, string> = {
  EMERGENCY: 'border-tri-em-line bg-tri-em-bg text-tri-em-fg',
  PRIORITY: 'border-tri-pr-line bg-tri-pr-bg text-tri-pr-fg',
  STANDARD: 'border-tri-std-line bg-tri-std-bg text-tri-std-fg',
};

export function TriageBadge({ triage }: { triage: Triage }) {
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded border px-2 text-[11px] font-semibold uppercase leading-none tracking-wider ${TRIAGE_STYLE[triage]}`}
    >
      {TRIAGE_LABEL[triage]}
    </span>
  );
}

/** Badge plus the priority reason in muted text, e.g. [PRIORITY] Elderly */
export function TriageTag({ triage, reason }: { triage: Triage; reason?: PriorityReason }) {
  return (
    <span className="inline-flex items-center gap-2">
      <TriageBadge triage={triage} />
      {triage === 'PRIORITY' && reason && (
        <span className="whitespace-nowrap text-xs text-muted">{REASON_LABEL[reason]}</span>
      )}
    </span>
  );
}

/* ---------------------------------- Brand --------------------------------- */

/** Flat version of the QCare mark: a Q with a medical cross. */
export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`shrink-0 ${className}`} aria-hidden="true">
      <rect width="32" height="32" rx="6" className="fill-brand" />
      <circle cx="15" cy="15" r="7.5" fill="none" strokeWidth="2.75" className="stroke-on-brand" />
      <path d="M15 11.75v6.5M11.75 15h6.5" strokeWidth="2.25" strokeLinecap="round" className="stroke-on-brand" />
      <path d="M20.25 20.25 24.5 24.5" strokeWidth="2.75" strokeLinecap="round" className="stroke-on-brand" />
    </svg>
  );
}

/* --------------------------------- Layout --------------------------------- */

export function Panel({
  children,
  className = '',
  as: Tag = 'section',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
  'aria-label'?: string;
  'aria-labelledby'?: string;
}) {
  return (
    <Tag className={`rounded-md border border-line bg-surface ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/** Placeholder block shown until client data is ready. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`block rounded bg-subtle ${className}`} />;
}

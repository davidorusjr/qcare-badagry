import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogoMark, focusRing } from './ui';

const WIDTH = {
  md: 'max-w-md px-4',
  '6xl': 'max-w-6xl px-4 sm:px-6',
} as const;

type Width = keyof typeof WIDTH;

/** Single-row sticky header: title left, utilities right, never wraps. */
export function AppHeader({
  width = '6xl',
  homeHref = '/',
  compactTitle = false,
  children,
}: {
  width?: Width;
  homeHref?: string;
  /** Drops "· QCare" below the sm breakpoint when the right side is busy. */
  compactTitle?: boolean;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-line bg-surface">
      <div className={`mx-auto flex h-full items-center justify-between gap-4 ${WIDTH[width]}`}>
        <Link
          href={homeHref}
          className={`flex min-w-0 items-center gap-2 rounded-md ${focusRing}`}
        >
          <LogoMark className="h-8 w-8" />
          <span className="min-w-0 truncate whitespace-nowrap text-sm font-semibold tracking-tight sm:text-base">
            Badagry General Hospital
            <span className={`font-normal text-muted ${compactTitle ? 'hidden sm:inline' : ''}`}>
              {' '}
              · QCare
            </span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      </div>
    </header>
  );
}

export function AppFooter({
  width = '6xl',
  links,
}: {
  width?: Width;
  links: { href: string; label: string; external?: boolean }[];
}) {
  return (
    <footer className="border-t border-line">
      <div
        className={`mx-auto flex flex-col gap-2 pb-20 pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:pb-6 ${WIDTH[width]}`}
      >
        <p>Badagry General Hospital · Badagry, Lagos State</p>
        <nav aria-label="Footer" className="flex items-center gap-4">
          {links.map((l) =>
            l.external ? (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`rounded underline-offset-4 hover:text-ink hover:underline ${focusRing}`}
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded underline-offset-4 hover:text-ink hover:underline ${focusRing}`}
              >
                {l.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </footer>
  );
}

'use client';

import { useState } from 'react';
import {
  ArrowUpRight,
  BellRing,
  CircleCheck,
  Clock,
  DoorOpen,
  Megaphone,
  Monitor,
  Timer,
  UserX,
  Users,
} from 'lucide-react';
import { createLocalValue, useNow } from '../_lib/client-state';
import { queueActions, useQueue } from '../_lib/store';
import {
  DEPARTMENTS,
  DESKS,
  deptById,
  deskById,
  elapsedSince,
  formatClock,
  formatDuration,
  positionOf,
  servingAt,
  waitingList,
  type DepartmentId,
  type Desk,
  type Patient,
} from '../_lib/queue';
import { AppFooter, AppHeader } from './chrome';
import { DemoTools } from './demo-tools';
import { ThemeToggle } from './theme-toggle';
import { Toast, useToast } from './toast';
import { Panel, Skeleton, TriageTag, btn, eyebrowClass, focusRing } from './ui';

/** The desk this workstation serves from. Kept per browser, not synced across tabs. */
const deskStore = createLocalValue('qcare-badagry:desk', DESKS[0].id);

type Filter = DepartmentId | 'ALL';

/** Fixed column tracks shared by the header row and every queue row. */
const COLS = 'md:grid-cols-[7rem_minmax(0,1fr)_9rem_6rem_7.5rem]';

export function StaffView() {
  const state = useQueue();
  const now = useNow();
  const storedDesk = deskStore.useValue();
  const [filter, setFilter] = useState<Filter>('ALL');
  const { toast, show, dismiss } = useToast();

  const ready = state !== null && now !== null;
  const patients = state?.patients ?? [];
  const desk = deskById(storedDesk ?? undefined) ?? DESKS[0];
  const deskDept = deptById(desk.department);
  const serving = servingAt(patients, desk.id);
  const nextUp = waitingList(patients, desk.department)[0];
  const queue = waitingList(patients, filter);

  function selectFilter(id: Filter) {
    setFilter(id);
    // Viewing one department moves this workstation to a desk in it
    if (id !== 'ALL' && desk.department !== id) {
      const dept = deptById(id);
      const free = dept.desks.find((d) => !servingAt(patients, d.id)) ?? dept.desks[0];
      deskStore.set(free.id);
    }
  }

  function handleCallNext() {
    const { called, completed } = queueActions.callNext(desk.id);
    if (called) {
      show(
        completed
          ? `${completed.ticketNo} completed · ${called.ticketNo} called to ${desk.label}`
          : `${called.ticketNo} called to ${desk.label}`,
      );
    }
  }

  function handleCall(p: Patient) {
    const { called, completed } = queueActions.callPatient(p.id, desk.id);
    if (called) {
      show(
        completed
          ? `${completed.ticketNo} completed · ${called.ticketNo} called to ${desk.label}`
          : `${called.ticketNo} called to ${desk.label}`,
      );
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader width="6xl" homeHref="/staff" compactTitle>
        {now !== null && (
          <span
            aria-label="Current time"
            className="hidden font-mono text-xs tabular-nums text-muted md:inline"
          >
            {formatClock(now, true)}
          </span>
        )}
        <a
          href="/display"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open TV Display in a new tab"
          className={btn('secondary', 'sm')}
        >
          <Monitor className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">Open TV Display</span>
          <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </a>
        <ThemeToggle />
      </AppHeader>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 sm:px-6">
        <h1 className="sr-only">Staff clinical workspace</h1>

        <FilterBar patients={patients} filter={filter} onSelect={selectFilter} />

        <KpiStrip patients={patients} filter={filter} now={now} ready={ready} />

        <ServingBar
          ready={ready}
          desk={desk}
          patient={serving}
          now={now}
          onDeskChange={(id) => deskStore.set(id)}
          patients={patients}
          onRecall={(p) => {
            queueActions.recall(p.id);
            show(`${p.ticketNo} recalled on the TV display`);
          }}
          onComplete={(p) => {
            queueActions.complete(p.id);
            show(`${p.ticketNo} marked as seen`);
          }}
          onNoShow={(p) => {
            queueActions.noShow(p.id);
            show(`${p.ticketNo} marked as no-show`);
          }}
          onTransfer={(p, to) => {
            const moved = queueActions.transfer(p.id, to);
            if (moved) show(`${p.ticketNo} transferred to ${deptById(to).short} as ${moved.ticketNo}`);
          }}
        />

        {/* Waiting queue */}
        <section aria-labelledby="queue-heading" className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="queue-heading" className="text-base font-semibold tracking-tight">
                Waiting queue
                {filter !== 'ALL' && <span className="font-normal text-muted"> · {deptById(filter).short}</span>}
              </h2>
              <p className="mt-1 text-sm text-muted">
                <span className="font-mono tabular-nums">{ready ? queue.length : '—'}</span> waiting · sorted by
                triage, then arrival
              </p>
            </div>
            <button
              type="button"
              onClick={handleCallNext}
              disabled={!ready || !nextUp}
              className={`${btn('primary', 'lg')} w-full sm:w-auto`}
            >
              <BellRing className="h-4 w-4 shrink-0" aria-hidden="true" />
              {!ready ? (
                'Call Next'
              ) : nextUp ? (
                <>
                  {serving ? 'Complete & Call Next' : 'Call Next'}
                  <span className="font-mono tabular-nums">{nextUp.ticketNo}</span>
                </>
              ) : (
                `No one waiting for ${deskDept.short}`
              )}
            </button>
          </div>

          <QueueTable ready={ready} queue={queue} patients={patients} desk={desk} now={now} onCall={handleCall} />
        </section>
      </main>

      <AppFooter
        width="6xl"
        links={[
          { href: '/', label: 'Patient check-in' },
          { href: '/display', label: 'TV display', external: true },
        ]}
      />
      <Toast toast={toast} onDismiss={dismiss} />
      <DemoTools />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Department filter                                                           */
/* -------------------------------------------------------------------------- */

function FilterBar({
  patients,
  filter,
  onSelect,
}: {
  patients: Patient[];
  filter: Filter;
  onSelect: (id: Filter) => void;
}) {
  const pills: { id: Filter; label: string }[] = [
    { id: 'ALL', label: 'All departments' },
    ...DEPARTMENTS.map((d) => ({ id: d.id as Filter, label: d.short })),
  ];

  return (
    <nav aria-label="Filter queue by department" className="flex flex-wrap gap-2">
      {pills.map((pill) => {
        const selected = filter === pill.id;
        const count = waitingList(patients, pill.id).length;
        return (
          <button
            key={pill.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(pill.id)}
            className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md border px-3 text-sm font-medium transition-colors ${focusRing} ${
              selected
                ? 'border-brand bg-brand text-on-brand'
                : 'border-line bg-surface text-ink hover:bg-subtle'
            }`}
          >
            {pill.label}
            <span
              className={`font-mono text-xs tabular-nums ${selected ? 'text-on-brand/80' : 'text-muted'}`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* KPI strip                                                                   */
/* -------------------------------------------------------------------------- */

function KpiStrip({
  patients,
  filter,
  now,
  ready,
}: {
  patients: Patient[];
  filter: Filter;
  now: number | null;
  ready: boolean;
}) {
  const scoped = filter === 'ALL' ? patients : patients.filter((p) => p.department === filter);
  const waiting = scoped.filter((p) => p.status === 'WAITING');
  const emergencies = waiting.filter((p) => p.triage === 'EMERGENCY').length;
  const priority = waiting.filter((p) => p.triage === 'PRIORITY').length;
  const avgWaitMs =
    waiting.length > 0 && now
      ? waiting.reduce((sum, p) => sum + elapsedSince(p.joinedAt, now), 0) / waiting.length
      : 0;
  const served = scoped.filter((p) => p.status === 'COMPLETED').length;
  const noShows = scoped.filter((p) => p.status === 'NO_SHOW').length;
  const desks = filter === 'ALL' ? DESKS : deptById(filter).desks;
  const active = desks.filter((d) => servingAt(patients, d.id)).length;

  const cards = [
    {
      label: 'Waiting',
      Icon: Users,
      value: waiting.length,
      unit: '',
      hint: `${emergencies} emerg · ${priority} priority`,
    },
    {
      label: 'Avg Wait',
      Icon: Timer,
      value: waiting.length > 0 ? formatDuration(avgWaitMs) : '0m 00s',
      unit: '',
      hint: 'Since check-in',
    },
    { label: 'Served Today', Icon: CircleCheck, value: served, unit: '', hint: `${noShows} no-show` },
    {
      label: 'Active Desks',
      Icon: DoorOpen,
      value: active,
      unit: `/ ${desks.length}`,
      hint: filter === 'ALL' ? 'All departments' : deptById(filter).name,
    },
  ];

  return (
    <dl aria-label="Queue summary" className="grid auto-rows-fr grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map(({ label, Icon, value, unit, hint }) => (
        <div
          key={label}
          className="flex min-h-32 flex-col justify-between gap-4 rounded-md border border-line bg-surface p-4"
        >
          <dt className={`inline-flex items-center gap-2 ${eyebrowClass}`}>
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </dt>
          <dd>
            <span className="flex items-baseline gap-1">
              <span className="font-mono text-3xl font-semibold leading-none tabular-nums">
                {ready ? value : '—'}
              </span>
              {unit && <span className="font-mono text-sm tabular-nums text-muted">{unit}</span>}
            </span>
            <span className="mt-2 block truncate text-xs text-muted">{ready ? hint : '\u00a0'}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* -------------------------------------------------------------------------- */
/* Currently serving                                                           */
/* -------------------------------------------------------------------------- */

function ServingBar({
  ready,
  desk,
  patient,
  patients,
  now,
  onDeskChange,
  onRecall,
  onComplete,
  onNoShow,
  onTransfer,
}: {
  ready: boolean;
  desk: Desk;
  patient: Patient | undefined;
  patients: Patient[];
  now: number | null;
  onDeskChange: (id: string) => void;
  onRecall: (p: Patient) => void;
  onComplete: (p: Patient) => void;
  onNoShow: (p: Patient) => void;
  onTransfer: (p: Patient, to: DepartmentId) => void;
}) {
  const dept = deptById(desk.department);

  return (
    <section
      aria-label="Currently serving"
      className="rounded-md border border-line bg-surface md:sticky md:top-18 md:z-20"
    >
      <div className="flex h-14 items-center justify-between gap-4 border-b border-line px-4">
        <h2 className={`inline-flex items-center gap-2 ${eyebrowClass}`}>
          <span
            aria-hidden="true"
            className={`h-2 w-2 shrink-0 rounded-full ${patient ? 'bg-brand' : 'bg-line-strong'}`}
          />
          Currently serving
        </h2>
        <label className="inline-flex min-w-0 items-center gap-2">
          <span className="hidden text-xs text-muted sm:inline">Desk</span>
          <select
            value={desk.id}
            onChange={(e) => onDeskChange(e.target.value)}
            className={`h-10 min-w-0 max-w-52 rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-ink ${focusRing}`}
          >
            {DEPARTMENTS.map((d) => (
              <optgroup key={d.id} label={d.name}>
                {d.desks.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                    {ready && x.id !== desk.id && servingAt(patients, x.id) ? ' (busy)' : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      {!ready ? (
        <div className="flex items-center gap-4 p-4">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-5 w-48" />
        </div>
      ) : patient ? (
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
            <p className="font-mono text-3xl font-bold leading-none tracking-tight tabular-nums">
              {patient.ticketNo}
            </p>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold">{patient.name}</p>
                <TriageTag triage={patient.triage} reason={patient.reason} />
              </div>
              <p className="mt-1 inline-flex items-center gap-2 text-sm text-muted">
                <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  Called <span className="font-mono tabular-nums">{formatClock(patient.calledAt ?? 0)}</span> ·{' '}
                  <span className="font-mono tabular-nums">
                    {formatDuration(elapsedSince(patient.calledAt ?? 0, now ?? 0))}
                  </span>{' '}
                  at {desk.label}
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <button type="button" onClick={() => onRecall(patient)} className={btn('secondary', 'md')}>
              <Megaphone className="h-4 w-4 shrink-0" aria-hidden="true" />
              Recall
            </button>
            <label className="contents">
              <span className="sr-only">Transfer {patient.name} to another department</span>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) onTransfer(patient, e.target.value as DepartmentId);
                }}
                className={`h-11 min-w-0 rounded-md border border-line-strong bg-surface px-3 text-sm font-semibold text-ink ${focusRing}`}
              >
                <option value="">Transfer…</option>
                {DEPARTMENTS.filter((d) => d.id !== patient.department).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => onNoShow(patient)} className={btn('secondary', 'md')}>
              <UserX className="h-4 w-4 shrink-0" aria-hidden="true" />
              No-Show
            </button>
            <button type="button" onClick={() => onComplete(patient)} className={btn('primary', 'md')}>
              <CircleCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              Complete
            </button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-20 flex-col justify-center gap-1 p-4">
          <p className="font-semibold">{desk.label} is free</p>
          <p className="text-sm text-muted">
            {waitingList(patients, desk.department).length > 0
              ? `Use Call Next to call the next ${dept.short} patient.`
              : `No ${dept.short} patients are waiting.`}
          </p>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Waiting queue: aligned grid on desktop, stacked cards on phones             */
/* -------------------------------------------------------------------------- */

function QueueTable({
  ready,
  queue,
  patients,
  desk,
  now,
  onCall,
}: {
  ready: boolean;
  queue: Patient[];
  patients: Patient[];
  desk: Desk;
  now: number | null;
  onCall: (p: Patient) => void;
}) {
  return (
    <Panel as="div">
      <div
        aria-hidden="true"
        className={`hidden h-10 items-center gap-4 border-b border-line bg-subtle px-4 ${eyebrowClass} md:grid ${COLS}`}
      >
        <span>Ticket ID</span>
        <span>Patient &amp; Triage</span>
        <span>Department</span>
        <span className="text-right">Wait Time</span>
        <span className="text-right">Action</span>
      </div>

      {!ready ? (
        <div className="space-y-4 p-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : queue.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-muted">No patients waiting.</p>
      ) : (
        <ol aria-label="Waiting patients" className="divide-y divide-line">
          {queue.map((p) => {
            const dept = deptById(p.department);
            const position = positionOf(patients, p);
            const waited = formatDuration(elapsedSince(p.joinedAt, now ?? p.joinedAt));
            const canCall = p.department === desk.department;
            const article = /^[AEIOU]|^NHIS/.test(dept.short) ? 'an' : 'a';
            const callTitle = canCall
              ? `Call ${p.ticketNo} to ${desk.label}`
              : `Select ${article} ${dept.short} desk to call`;

            const callButton = (
              <button
                type="button"
                onClick={() => onCall(p)}
                disabled={!canCall}
                title={callTitle}
                aria-label={callTitle}
                className={`${btn('secondary', 'md')} w-full`}
              >
                <BellRing className="h-4 w-4 shrink-0" aria-hidden="true" />
                Call
              </button>
            );

            return (
              <li key={p.id}>
                {/* Phone card */}
                <div className="space-y-4 p-4 md:hidden">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-mono text-lg font-semibold leading-none tabular-nums">{p.ticketNo}</p>
                      <p className="mt-2 truncate font-medium">{p.name}</p>
                    </div>
                    <TriageTag triage={p.triage} reason={p.reason} />
                  </div>
                  <dl className="grid grid-cols-3 gap-4">
                    <div className="min-w-0">
                      <dt className={eyebrowClass}>Dept</dt>
                      <dd className="mt-1 truncate text-sm font-medium">{dept.short}</dd>
                    </div>
                    <div>
                      <dt className={eyebrowClass}>Waiting</dt>
                      <dd className="mt-1 font-mono text-sm font-semibold tabular-nums">{waited}</dd>
                    </div>
                    <div>
                      <dt className={eyebrowClass}>Position</dt>
                      <dd className="mt-1 font-mono text-sm font-semibold tabular-nums">{position}</dd>
                    </div>
                  </dl>
                  {callButton}
                </div>

                {/* Desktop row */}
                <div className={`hidden items-center gap-4 px-4 py-3 md:grid ${COLS}`}>
                  <div>
                    <p className="font-mono text-base font-semibold tabular-nums">{p.ticketNo}</p>
                    <p className="font-mono text-xs tabular-nums text-muted">Pos {position}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <TriageTag triage={p.triage} reason={p.reason} />
                      {p.journey && p.journey.length > 0 && (
                        <span className="truncate text-xs text-muted">
                          from {deptById(p.journey[p.journey.length - 1]).short}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{dept.short}</p>
                    <p className="truncate text-xs text-muted">{dept.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-base font-semibold tabular-nums">{waited}</p>
                    <p className="font-mono text-xs tabular-nums text-muted">{formatClock(p.joinedAt)}</p>
                  </div>
                  <div>{callButton}</div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

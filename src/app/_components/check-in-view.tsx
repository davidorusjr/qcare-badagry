'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, Clock, Search } from 'lucide-react';
import { createLocalValue, useNow } from '../_lib/client-state';
import { playChime, unlockAudio } from '../_lib/audio';
import { queueActions, useQueue } from '../_lib/store';
import {
  DEPARTMENTS,
  ELIGIBILITY,
  deptById,
  deskById,
  elapsedSince,
  estimateRemainingMs,
  estimateWaitMins,
  formatClock,
  formatDuration,
  nextTicketNo,
  normalizeTicket,
  positionOf,
  servingList,
  waitingList,
  type DepartmentId,
  type EligibilityId,
  type Patient,
} from '../_lib/queue';
import { AppFooter, AppHeader } from './chrome';
import { DemoTools } from './demo-tools';
import { ThemeToggle } from './theme-toggle';
import {
  Panel,
  Skeleton,
  TriageTag,
  btn,
  eyebrowClass,
  inputClass,
  labelClass,
} from './ui';

/** The patient record this phone is tracking (follows transfers by id). */
const myTicket = createLocalValue('qcare-badagry:my-ticket', '', { sync: true });

export function CheckInView() {
  const state = useQueue();
  const myId = myTicket.useValue();
  const now = useNow();

  const ready = state !== null && myId !== null && now !== null;
  const me = ready && myId ? state.patients.find((p) => p.id === myId) : undefined;

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader width="md" homeHref="/">
        {now !== null && (
          <span
            aria-label="Current time"
            className="hidden font-mono text-xs tabular-nums text-muted sm:inline"
          >
            {formatClock(now, true)}
          </span>
        )}
        <ThemeToggle />
      </AppHeader>

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        {!ready ? (
          <LoadingPanel />
        ) : me ? (
          <BoardingPass patient={me} patients={state.patients} now={now} onReset={() => myTicket.set('')} />
        ) : (
          <CheckInForm patients={state.patients} onTrack={(p) => myTicket.set(p.id)} />
        )}
      </main>

      <AppFooter width="md" links={[{ href: '/staff', label: 'Staff portal' }]} />
      <DemoTools />
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-5 w-64" />
      </div>
      <Panel className="space-y-4 p-4">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-12 w-full" />
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Check-in form                                                               */
/* -------------------------------------------------------------------------- */

function CheckInForm({ patients, onTrack }: { patients: Patient[]; onTrack: (p: Patient) => void }) {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState<DepartmentId>('GOPD');
  const [eligibility, setEligibility] = useState<EligibilityId>('STANDARD');
  const [error, setError] = useState('');

  const [lookup, setLookup] = useState('');
  const [lookupError, setLookupError] = useState('');

  // Preview the ticket this patient is about to receive
  const option = ELIGIBILITY.find((e) => e.id === eligibility) ?? ELIGIBILITY[0];
  const draft: Patient = {
    id: 'draft',
    name: '',
    department,
    ticketNo: nextTicketNo(patients, department),
    triage: option.triage,
    status: 'WAITING',
    joinedAt: Number.MAX_SAFE_INTEGER,
  };
  const previewList = [...patients, draft];
  const previewWait = estimateWaitMins(previewList, draft);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Enter the patient’s full name.');
      return;
    }
    void unlockAudio(); // lets the phone chime when the ticket is called
    const created = queueActions.checkIn({ name, department, eligibility });
    onTrack(created);
  }

  function handleLookup(e: FormEvent) {
    e.preventDefault();
    const code = normalizeTicket(lookup);
    const found = patients.find(
      (p) => p.ticketNo === code && (p.status === 'WAITING' || p.status === 'SERVING'),
    );
    if (!found) {
      setLookupError(code ? `No active ticket ${code} today.` : 'Enter your ticket number.');
      return;
    }
    void unlockAudio();
    onTrack(found);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Patient check-in</h1>
        <p className="mt-1 text-sm text-muted">Get your queue number for today’s visit.</p>
      </div>

      <Panel as="div">
        <form onSubmit={handleSubmit} noValidate>
          {/* Name */}
          <div className="p-4">
            <label htmlFor="patient-name" className={labelClass}>
              Full name
            </label>
            <input
              id="patient-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              autoComplete="name"
              placeholder="e.g. Folake Adeyemi"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'patient-name-error' : undefined}
              className={`mt-2 ${inputClass} ${error ? 'border-danger' : ''}`}
            />
            {error && (
              <p id="patient-name-error" className="mt-2 text-sm text-danger">
                {error}
              </p>
            )}
          </div>

          {/* Department */}
          <fieldset className="border-t border-line p-4">
            <legend className={`${labelClass} float-left w-full`}>Department</legend>
            <div className="clear-both mt-2 divide-y divide-line rounded-md border border-line pt-0">
              {DEPARTMENTS.map((d) => {
                const waiting = waitingList(patients, d.id).length;
                return (
                  <label
                    key={d.id}
                    className="flex min-h-12 cursor-pointer items-center gap-4 px-4 py-2 has-[:checked]:bg-subtle has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-brand"
                  >
                    <input
                      type="radio"
                      name="department"
                      value={d.id}
                      checked={department === d.id}
                      onChange={() => setDepartment(d.id)}
                      className="h-4 w-4 shrink-0 accent-brand"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{d.name}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
                      {waiting} waiting
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Priority eligibility */}
          <fieldset className="border-t border-line p-4">
            <legend className={`${labelClass} float-left w-full`}>Priority eligibility</legend>
            <p className="clear-both pt-1 text-xs text-muted">
              Emergency and priority patients are seen first.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {ELIGIBILITY.map((opt) => {
                const emergency = opt.id === 'EMERGENCY';
                return (
                  <label
                    key={opt.id}
                    className={`flex min-h-14 cursor-pointer flex-col justify-center rounded-md border border-line px-4 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand ${
                      emergency
                        ? 'col-span-2 has-[:checked]:border-tri-em-line has-[:checked]:bg-tri-em-bg has-[:checked]:text-tri-em-fg'
                        : 'has-[:checked]:border-brand has-[:checked]:bg-subtle'
                    }`}
                  >
                    <input
                      type="radio"
                      name="eligibility"
                      value={opt.id}
                      checked={eligibility === opt.id}
                      onChange={() => setEligibility(opt.id)}
                      className="sr-only"
                    />
                    <span className="text-sm font-semibold">{opt.label}</span>
                    <span className={`text-xs ${emergency && eligibility === opt.id ? '' : 'text-muted'}`}>
                      {opt.hint}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Preview + submit */}
          <div className="space-y-4 border-t border-line p-4">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className={eyebrowClass}>Your ticket</dt>
                <dd className="mt-1 font-mono text-base font-semibold tabular-nums">{draft.ticketNo}</dd>
              </div>
              <div>
                <dt className={eyebrowClass}>Est. wait</dt>
                <dd className="mt-1 font-mono text-base font-semibold tabular-nums">≈ {previewWait} min</dd>
              </div>
            </dl>
            <button type="submit" className={`${btn('primary', 'lg')} w-full`}>
              Check In
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
          </div>
        </form>
      </Panel>

      {/* Track an existing ticket */}
      <Panel as="div" className="p-4">
        <form onSubmit={handleLookup} noValidate>
          <label htmlFor="ticket-lookup" className={labelClass}>
            Already have a ticket?
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="ticket-lookup"
              type="text"
              value={lookup}
              onChange={(e) => {
                setLookup(e.target.value);
                if (lookupError) setLookupError('');
              }}
              placeholder="GOPD-014"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={lookupError ? true : undefined}
              aria-describedby={lookupError ? 'ticket-lookup-error' : undefined}
              className={`${inputClass} font-mono uppercase tabular-nums`}
            />
            <button type="submit" className={btn('secondary', 'md')}>
              <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
              Track
            </button>
          </div>
          {lookupError && (
            <p id="ticket-lookup-error" className="mt-2 text-sm text-danger">
              {lookupError}
            </p>
          )}
        </form>
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Live ticket, laid out like a boarding pass                                  */
/* -------------------------------------------------------------------------- */

const STATUS_TEXT: Record<Patient['status'], string> = {
  WAITING: 'Waiting',
  SERVING: 'Now serving',
  COMPLETED: 'Seen',
  NO_SHOW: 'Missed',
};

function BoardingPass({
  patient,
  patients,
  now,
  onReset,
}: {
  patient: Patient;
  patients: Patient[];
  now: number;
  onReset: () => void;
}) {
  const dept = deptById(patient.department);
  const desk = deskById(patient.deskId);
  const waiting = patient.status === 'WAITING';
  const serving = patient.status === 'SERVING';
  const finished = patient.status === 'COMPLETED' || patient.status === 'NO_SHOW';
  const position = positionOf(patients, patient);
  const total = waitingList(patients, patient.department).length;
  const estimate = estimateWaitMins(patients, patient);
  const remainingMs = estimateRemainingMs(patients, patient, now);
  const waitedMs = elapsedSince(patient.joinedAt, now);
  const nowServing = servingList(patients).filter((p) => p.department === patient.department);

  // Chime and vibrate when this ticket is called (or recalled)
  const callKey = serving ? String(patient.calledAt) : '';
  const lastCall = useRef(callKey);
  useEffect(() => {
    if (callKey && callKey !== lastCall.current) {
      playChime();
      navigator.vibrate?.([200, 100, 200]);
    }
    lastCall.current = callKey;
  }, [callKey]);

  // Any tap unlocks sound after a page reload
  useEffect(() => {
    const unlock = () => void unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  const meta: { label: string; value: ReactNode; sub?: ReactNode }[] = [
    { label: 'Department', value: dept.short, sub: dept.name },
    {
      label: 'Queue position',
      value: waiting ? <span className="font-mono tabular-nums">{position}</span> : '—',
      sub: waiting ? `of ${total} waiting` : serving ? 'You are being served' : undefined,
    },
    {
      label: 'Estimated wait',
      value: waiting ? (
        <span className="font-mono tabular-nums">
          {remainingMs > 0 ? `≈ ${formatDuration(remainingMs)}` : 'Due soon'}
        </span>
      ) : (
        '—'
      ),
      sub: waiting ? (
        <span className="font-mono tabular-nums">Waiting {formatDuration(waitedMs)}</span>
      ) : undefined,
    },
    {
      label: 'Status',
      value: STATUS_TEXT[patient.status],
      sub: serving && desk ? desk.label : patient.status === 'NO_SHOW' ? 'See the Records desk' : undefined,
    },
  ];

  return (
    <div className="space-y-4">
      <p className="sr-only" aria-live="polite">
        {waiting
          ? `Ticket ${patient.ticketNo}. Position ${position} in ${dept.short}. About ${estimate} minutes.`
          : serving
            ? `Ticket ${patient.ticketNo}. It is your turn. Proceed to ${desk?.label ?? dept.name}.`
            : `Ticket ${patient.ticketNo}. ${STATUS_TEXT[patient.status]}.`}
      </p>

      <Panel as="article" aria-label="Your queue ticket">
        <div className="flex h-12 items-center justify-between gap-4 border-b border-line px-6">
          <span className={eyebrowClass}>Queue ticket</span>
          <span className="inline-flex items-center gap-2 font-mono text-xs tabular-nums text-muted">
            <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
            Checked in {formatClock(patient.joinedAt)}
          </span>
        </div>

        <div className="p-6">
          <p className={eyebrowClass}>Ticket number</p>
          <p className="mt-2 font-mono text-5xl font-bold leading-none tracking-tight tabular-nums sm:text-6xl">
            {patient.ticketNo}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-base font-medium">{patient.name}</span>
            <TriageTag triage={patient.triage} reason={patient.reason} />
          </div>
          {patient.journey && patient.journey.length > 0 && (
            <p className="mt-2 text-xs text-muted">
              Transferred from {patient.journey.map((d) => deptById(d).short).join(' → ')}
            </p>
          )}

          {serving && (
            <div role="status" className="mt-6 rounded-md bg-brand px-4 py-4 text-on-brand">
              <p className="text-xs font-semibold uppercase tracking-wider">It’s your turn</p>
              <p className="mt-1 text-lg font-semibold">Proceed to {desk?.label ?? dept.name}</p>
            </div>
          )}
          {patient.status === 'NO_SHOW' && (
            <div role="status" className="mt-6 rounded-md border border-line-strong px-4 py-4">
              <p className="text-sm font-semibold">You missed your call</p>
              <p className="mt-1 text-sm text-muted">Please speak to the Records desk to rejoin the queue.</p>
            </div>
          )}
        </div>

        {/* Tear line */}
        <div className="border-t border-dashed border-line-strong" aria-hidden="true" />

        <dl className="grid grid-cols-2">
          {meta.map((m, i) => (
            <div
              key={m.label}
              className={`p-4 sm:p-6 ${i % 2 === 0 ? 'border-r border-line' : ''} ${i > 1 ? 'border-t border-line' : ''}`}
            >
              <dt className={eyebrowClass}>{m.label}</dt>
              <dd className="mt-2 text-lg font-semibold leading-tight">{m.value}</dd>
              {m.sub && <dd className="mt-1 text-xs text-muted">{m.sub}</dd>}
            </div>
          ))}
        </dl>
      </Panel>

      {!finished && (
        <Panel as="div" className="flex items-center justify-between gap-4 px-4 py-4">
          <span className="text-sm text-muted">Now serving in {dept.short}</span>
          <span className="flex flex-wrap justify-end gap-2">
            {nowServing.length === 0 ? (
              <span className="text-sm text-muted">—</span>
            ) : (
              nowServing.map((p) => (
                <span key={p.id} className="font-mono text-sm font-semibold tabular-nums">
                  {p.ticketNo}
                </span>
              ))
            )}
          </span>
        </Panel>
      )}

      <button type="button" onClick={onReset} className={`${btn('secondary', 'md')} w-full`}>
        {finished ? 'Start a new check-in' : 'Check in another patient'}
      </button>
      <p className="text-center text-xs text-muted">
        Keep this page open. It updates live and chimes when you are called.
      </p>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Building2,
  Cast,
  Check,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  DoorOpen,
  Maximize2,
  MessageSquare,
  Minimize2,
  Monitor,
  Phone,
  RotateCcw,
  Search,
  Smartphone,
  Square,
  Stethoscope,
  User,
  UserPlus,
  Users,
  Volume2,
  X,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type DepartmentId = 'OPD' | 'TRIAGE' | 'ANTENATAL' | 'PAEDIATRICS' | 'LAB' | 'PHARMACY';
type PatientStatus = 'WAITING' | 'ALERTED' | 'IN_DOCTOR_ROOM' | 'COMPLETED';
type TriagePriority = 'NORMAL' | 'URGENT';
type Tab = 'INTAKE' | 'CONSOLE' | 'LOBBY_TV' | 'PATIENT_TRACKER';
type VoiceState = 'idle' | 'playing' | 'unsupported';

interface Department {
  id: DepartmentId;
  name: string;
  tabLabel: string;
  code: string; // ticket prefix
  room: string; // where called patients go
  handlesEmergency: boolean; // false for departments that never take emergencies
}

interface Patient {
  id: string;
  name: string;
  phone: string;
  department: DepartmentId;
  ticketNo: string;
  status: PatientStatus;
  triagePriority: TriagePriority;
  estimatedWaitMins: number;
  joinedAt: string; // ISO string
  calledAt?: string; // ISO string, set when the patient is called
  journeyHistory?: string[]; // departments already visited, e.g. ['Triage', 'OPD']
}

interface AlertInfo {
  patient: Patient;
  lineNumber: number;
  sentAt: string;
}

interface Toast {
  id: number;
  text: string;
}

/* -------------------------------------------------------------------------- */
/* Constants and mock data                                                    */
/* -------------------------------------------------------------------------- */

/** Each position in the queue adds this many minutes to the estimate. */
const MINS_PER_POSITION = 8;

/** Patients are saved in this browser so a refresh does not lose the demo. */
const STORAGE_KEY = 'qcare_badagry_patients_v1';

const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'OPD', name: 'OPD (General Outpatient)', tabLabel: 'OPD', code: 'OPD', room: 'Room 3', handlesEmergency: true },
  { id: 'TRIAGE', name: 'Triage', tabLabel: 'Triage', code: 'TRI', room: 'Bay 1', handlesEmergency: true },
  { id: 'ANTENATAL', name: 'Antenatal', tabLabel: 'Antenatal', code: 'ANC', room: 'Room 5', handlesEmergency: true },
  { id: 'PAEDIATRICS', name: 'Paediatrics (Children)', tabLabel: 'Paediatrics', code: 'PAE', room: 'Room 4', handlesEmergency: true },
  { id: 'LAB', name: 'Laboratory', tabLabel: 'Lab', code: 'LAB', room: 'Sample Room', handlesEmergency: false },
  { id: 'PHARMACY', name: 'Pharmacy', tabLabel: 'Pharmacy', code: 'PHA', room: 'Counter 1', handlesEmergency: false },
];

/* 16 sample patients: OPD has 1 in the room and 4 waiting (1 urgent), every
   other department has 2 active patients. Grace is the one completed visit. */
const INITIAL_PATIENTS: Patient[] = [
  // OPD
  { id: 'p1', name: 'Ibrahim Sanni', phone: '08029876543', department: 'OPD', ticketNo: 'OPD-014', status: 'IN_DOCTOR_ROOM', triagePriority: 'NORMAL', estimatedWaitMins: 0, joinedAt: '2026-10-30T07:58:00+01:00', calledAt: '2026-10-30T08:10:00+01:00', journeyHistory: ['Triage'] },
  { id: 'p2', name: 'Segun Lawson', phone: '08031234567', department: 'OPD', ticketNo: 'OPD-015', status: 'WAITING', triagePriority: 'NORMAL', estimatedWaitMins: 0, joinedAt: '2026-10-30T08:12:00+01:00', journeyHistory: ['Triage'] },
  { id: 'p3', name: 'Mawutin Hunsu', phone: '08033445566', department: 'OPD', ticketNo: 'OPD-016', status: 'WAITING', triagePriority: 'NORMAL', estimatedWaitMins: 0, joinedAt: '2026-10-30T08:18:00+01:00', journeyHistory: ['Triage'] },
  { id: 'p4', name: 'Senami Avoseh', phone: '08077889900', department: 'OPD', ticketNo: 'OPD-017', status: 'WAITING', triagePriority: 'URGENT', estimatedWaitMins: 0, joinedAt: '2026-10-30T08:26:00+01:00', journeyHistory: ['Triage'] },
  { id: 'p5', name: 'Abiodun Zannu', phone: '08023344556', department: 'OPD', ticketNo: 'OPD-018', status: 'WAITING', triagePriority: 'NORMAL', estimatedWaitMins: 0, joinedAt: '2026-10-30T08:31:00+01:00' },
  // Triage
  { id: 'p6', name: 'Paul Akande', phone: '08157778899', department: 'TRIAGE', ticketNo: 'TRI-021', status: 'WAITING', triagePriority: 'URGENT', estimatedWaitMins: 0, joinedAt: '2026-10-30T08:20:00+01:00' },
  { id: 'p7', name: 'Kehinde Alabi', phone: '08051112233', department: 'TRIAGE', ticketNo: 'TRI-022', status: 'IN_DOCTOR_ROOM', triagePriority: 'NORMAL', estimatedWaitMins: 0, joinedAt: '2026-10-30T08:14:00+01:00', calledAt: '2026-10-30T08:38:00+01:00' },
  // Antenatal
  { id: 'p8', name: 'Fatimah Musa', phone: '07065554321', department: 'ANTENATAL', ticketNo: 'ANC-006', status: 'ALERTED', triagePriority: 'NORMAL', estimatedWaitMins: 0, joinedAt: '2026-10-30T08:05:00+01:00', calledAt: '2026-10-30T08:25:00+01:00' },
  { id: 'p9', name: 'Blessing Eze', phone: '08064445566', department: 'ANTENATAL', ticketNo: 'ANC-007', status: 'WAITING', triagePriority: 'NORMAL', estimatedWaitMins: 0, joinedAt: '2026-10-30T08:15:00+01:00' },
  // Paediatrics
  { id: 'p10', name: 'Tobi Adebayo', phone: '09087654321', department: 'PAEDIATRICS', ticketNo: 'PAE-011', status: 'WAITING', triagePriority: 'URGENT', estimatedWaitMins: 0, joinedAt: '2026-10-30T08:28:00+01:00', journeyHistory: ['Triage'] },
  { id: 'p11', name: 'Chidera Okafor', phone: '08162233445', department: 'PAEDIATRICS', ticketNo: 'PAE-012', status: 'WAITING', triagePriority: 'NORMAL', estimatedWaitMins: 0, joinedAt: '2026-10-30T08:33:00+01:00' },
  // Lab
  { id: 'p12', name: 'Amina Bello', phone: '08098765432', department: 'LAB', ticketNo: 'LAB-008', status: 'IN_DOCTOR_ROOM', triagePriority: 'NORMAL', estimatedWaitMins: 0, joinedAt: '2026-10-30T08:00:00+01:00', calledAt: '2026-10-30T08:40:00+01:00', journeyHistory: ['OPD'] },
  { id: 'p13', name: 'Sewanu Gbede', phone: '07031122334', department: 'LAB', ticketNo: 'LAB-009', status: 'WAITING', triagePriority: 'NORMAL', estimatedWaitMins: 0, joinedAt: '2026-10-30T08:36:00+01:00', journeyHistory: ['OPD'] },
  // Pharmacy
  { id: 'p14', name: 'Grace Adeyemi', phone: '09012345678', department: 'PHARMACY', ticketNo: 'PHA-032', status: 'COMPLETED', triagePriority: 'NORMAL', estimatedWaitMins: 0, joinedAt: '2026-10-30T07:40:00+01:00', journeyHistory: ['OPD'] },
  { id: 'p15', name: 'Halima Yusuf', phone: '07012345678', department: 'PHARMACY', ticketNo: 'PHA-033', status: 'WAITING', triagePriority: 'NORMAL', estimatedWaitMins: 0, joinedAt: '2026-10-30T08:35:00+01:00', journeyHistory: ['OPD'] },
  { id: 'p16', name: 'Zainab Garba', phone: '09055667788', department: 'PHARMACY', ticketNo: 'PHA-034', status: 'WAITING', triagePriority: 'NORMAL', estimatedWaitMins: 0, joinedAt: '2026-10-30T08:41:00+01:00', journeyHistory: ['OPD', 'Lab'] },
];

const ROLE_TABS = [
  { id: 'INTAKE', label: 'Records Intake', hint: 'Registration clerk', Icon: UserPlus },
  { id: 'CONSOLE', label: 'Clinician Console', hint: 'Nurse, doctor, lab, pharmacy', Icon: ClipboardList },
  { id: 'LOBBY_TV', label: 'Lobby TV Display', hint: 'Waiting room screen', Icon: Monitor },
  { id: 'PATIENT_TRACKER', label: 'Patient Live Check', hint: 'Patient on a phone', Icon: Smartphone },
] as const;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const STATUS_LABEL: Record<PatientStatus, string> = {
  WAITING: 'Waiting',
  ALERTED: 'Alerted',
  IN_DOCTOR_ROOM: 'In doctor room',
  COMPLETED: 'Completed',
};

const STATUS_STYLE: Record<PatientStatus, string> = {
  WAITING: 'border-slate-300 bg-slate-50 text-slate-700',
  ALERTED: 'border-amber-300 bg-amber-50 text-amber-900',
  IN_DOCTOR_ROOM: 'border-teal-300 bg-teal-50 text-teal-900',
  COMPLETED: 'border-slate-200 bg-white text-slate-500',
};

const STATUS_ORDER: Record<PatientStatus, number> = {
  IN_DOCTOR_ROOM: 0,
  ALERTED: 1,
  WAITING: 2,
  COMPLETED: 3,
};

const PHONE_PATTERN = /^(?:\+?234|0)[789]\d{9}$/;

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

/** Hides the scrollbar on horizontally scrolling rows without disabling scroll. */
const hideScrollbar = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/** Column widths shared by the header and every row, so nothing shifts. */
const IN_PROGRESS_COLS = 'lg:grid-cols-[5rem_minmax(0,1fr)_7rem_8.5rem_22rem]';

/** Fixed time zone so server and client render the same text. */
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
  });
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Africa/Lagos',
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  });
}

/** Emergency patients first, then first come first served. */
function byPriority(a: Patient, b: Patient): number {
  if (a.triagePriority !== b.triagePriority) {
    return a.triagePriority === 'URGENT' ? -1 : 1;
  }
  return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
}

/** Waiting patients of one department in calling order. */
function waitingQueue(list: Patient[], department: DepartmentId): Patient[] {
  return list
    .filter((p) => p.department === department && p.status === 'WAITING')
    .sort(byPriority);
}

/** Position in the department queue, starting at 1. Returns 0 if not waiting. */
function positionOf(list: Patient[], patient: Patient): number {
  return waitingQueue(list, patient.department).findIndex((p) => p.id === patient.id) + 1;
}

/** The patient most recently called in a department and not yet completed. */
function nowServing(list: Patient[], department: DepartmentId): Patient | undefined {
  return list
    .filter(
      (p) =>
        p.department === department &&
        (p.status === 'ALERTED' || p.status === 'IN_DOCTOR_ROOM'),
    )
    .sort(
      (a, b) =>
        new Date(b.calledAt ?? b.joinedAt).getTime() -
        new Date(a.calledAt ?? a.joinedAt).getTime(),
    )[0];
}

/** Estimated wait for every waiting patient is position x 8 minutes. */
function recalc(list: Patient[], departments: Department[]): Patient[] {
  const next = list.map((p) => ({ ...p }));
  for (const d of departments) {
    waitingQueue(next, d.id).forEach((p, i) => {
      p.estimatedWaitMins = (i + 1) * MINS_PER_POSITION;
    });
  }
  next.filter((p) => p.status !== 'WAITING').forEach((p) => {
    p.estimatedWaitMins = 0;
  });
  return next;
}

function nextTicketNo(list: Patient[], dept: Department): string {
  const highest = list
    .filter((p) => p.department === dept.id)
    .reduce((max, p) => {
      const n = parseInt(p.ticketNo.split('-')[1] ?? '0', 10);
      return Number.isNaN(n) ? max : Math.max(max, n);
    }, 0);
  return `${dept.code}-${String(highest + 1).padStart(3, '0')}`;
}

/** Accepts "opd-15", "OPD 015" or "OPD-015" and returns "OPD-015". */
function normalizeTicket(input: string): string {
  const t = input.trim().toUpperCase().replace(/\s+/g, '');
  const m = /^([A-Z]{3})-?(\d{1,4})$/.exec(t);
  return m ? `${m[1]}-${m[2].padStart(3, '0')}` : t;
}

/** "OPD-015" becomes "O P D, 0 1 5" so speech reads it clearly. */
function spellTicket(ticketNo: string): string {
  const [code = '', num = ''] = ticketNo.split('-');
  return `${code.split('').join(' ')}, ${num.split('').join(' ')}`;
}

function isPatientArray(value: unknown): value is Patient[] {
  const departmentIds = INITIAL_DEPARTMENTS.map((d) => d.id as string);
  const statuses = ['WAITING', 'ALERTED', 'IN_DOCTOR_ROOM', 'COMPLETED'];
  return (
    Array.isArray(value) &&
    value.every((item) => {
      if (typeof item !== 'object' || item === null) return false;
      const o = item as Record<string, unknown>;
      return (
        typeof o.id === 'string' &&
        typeof o.name === 'string' &&
        typeof o.phone === 'string' &&
        typeof o.ticketNo === 'string' &&
        typeof o.joinedAt === 'string' &&
        typeof o.department === 'string' &&
        departmentIds.includes(o.department) &&
        typeof o.status === 'string' &&
        statuses.includes(o.status) &&
        (o.triagePriority === 'NORMAL' || o.triagePriority === 'URGENT')
      );
    })
  );
}

/**
 * The SMS text. A server-side call to Termii would send this string, so the
 * wording lives in one place.
 */
function buildSmsText(info: AlertInfo, dept: Department): string {
  return `Q-Care Alert: Hello ${info.patient.name}, you are #${info.lineNumber} next for ${dept.tabLabel} at Badagry General Hospital. Please proceed to ${dept.room}.`;
}

/**
 * The voice alert. `display` is the written Ogu (Egun) and Yoruba wording.
 * `spoken` spells the same greeting out phonetically with clear pauses, so a
 * device without a Yoruba voice still reads it cleanly.
 */
function buildVoiceText(
  dept: Department,
  patientName: string,
  ticketNo: string,
): { display: string; spoken: string } {
  const display = `Mì kú àbọ̀ / Ẹ káàbọ̀! Calling ${patientName}, ticket ${ticketNo}. Ó ti kan yín báyìí. Please proceed to ${dept.name}, ${dept.room}.`;
  const spokenDept = dept.tabLabel === 'OPD' ? 'O P D' : dept.tabLabel;
  const spoken = `Mee koo ah-boh. Eh kah-ah-boh! Calling ${patientName}, ticket ${spellTicket(ticketNo)}. Oh tee kahn yeen bah-yee. Please proceed to ${spokenDept}, ${dept.room}.`;
  return { display, spoken };
}

/** Two-tone chime made with the browser's own audio, no files or libraries. */
function playChime() {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [880, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.35;
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.65);
    });
    window.setTimeout(() => void ctx.close(), 1500);
  } catch {
    /* audio is optional, ignore failures */
  }
}

/* -------------------------------------------------------------------------- */
/* Small presentational pieces                                                */
/* -------------------------------------------------------------------------- */

function StatusBadge({ status }: { status: PatientStatus }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function EmergencyBadge() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">
      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
      Emergency
    </span>
  );
}

/** Small chips listing the departments a patient has already been through. */
function JourneyBadges({ history, dark = false }: { history?: string[]; dark?: boolean }) {
  if (!history || history.length === 0) return null;
  return (
    <p className="mt-1 flex flex-wrap items-center gap-1 text-xs">
      <span className={dark ? 'text-slate-400' : 'text-slate-500'}>Seen at</span>
      {history.map((stage, i) => (
        <span
          key={`${stage}-${i}`}
          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 ${
            dark
              ? 'border-slate-600 bg-slate-800 text-slate-200'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
        >
          <Check className="h-3 w-3" aria-hidden="true" />
          {stage}
        </span>
      ))}
    </p>
  );
}

function KpiStrip({
  waiting,
  urgent,
  inCare,
  avgWait,
}: {
  waiting: number;
  urgent: number;
  inCare: number;
  avgWait: number;
}) {
  const cards = [
    { label: 'Waiting in queue', value: String(waiting), hint: 'All departments', Icon: Users, alert: false },
    {
      label: 'Emergency / urgent',
      value: String(urgent),
      hint: urgent > 0 ? 'Seen first' : 'None active',
      Icon: AlertTriangle,
      alert: urgent > 0,
    },
    { label: 'In consultation / alerted', value: String(inCare), hint: 'Called or with a clinician', Icon: Stethoscope, alert: false },
    {
      label: 'Est. avg wait',
      value: waiting > 0 ? `${avgWait} min` : 'None',
      hint: 'People still waiting',
      Icon: Clock,
      alert: false,
    },
  ];

  return (
    <dl aria-label="Hospital summary" className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
      {cards.map(({ label, value, hint, Icon, alert }) => (
        <div
          key={label}
          className={`rounded border p-3 sm:p-4 ${
            alert ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
          }`}
        >
          <dt className={`flex items-center gap-2 text-xs font-medium sm:text-sm ${alert ? 'text-red-800' : 'text-slate-600'}`}>
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </dt>
          <dd className={`mt-1 text-2xl font-semibold tabular-nums ${alert ? 'text-red-800' : 'text-slate-900'}`}>
            {value}
          </dd>
          <dd className={`text-xs ${alert ? 'text-red-700' : 'text-slate-500'}`}>{hint}</dd>
        </div>
      ))}
    </dl>
  );
}

/* -------------------------------------------------------------------------- */
/* Lobby TV display                                                           */
/* -------------------------------------------------------------------------- */

function TvBoard({
  patients,
  departments,
  now,
  fullscreen,
}: {
  patients: Patient[];
  departments: Department[];
  now: Date | null;
  fullscreen: boolean;
}) {
  return (
    <div
      className={`flex flex-col bg-slate-950 text-white ${
        fullscreen
          ? 'min-h-full'
          : 'rounded-lg border-4 border-slate-800 sm:border-8 lg:min-h-[32rem] xl:aspect-video'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-6 sm:py-4">
        <div>
          <p className="text-lg font-semibold sm:text-2xl xl:text-3xl">Badagry General Hospital</p>
          <p className="text-sm text-slate-400 xl:text-lg">Patient queue status</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums sm:text-3xl xl:text-5xl">
            {now ? formatClock(now) : '--:--:--'}
          </p>
          <p className="text-xs text-slate-400 sm:text-sm xl:text-base">{now ? formatDate(now) : ' '}</p>
        </div>
      </div>

      <ul className="grid flex-1 auto-rows-fr gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3 xl:gap-4 xl:p-6">
        {departments.map((d) => {
          const serving = nowServing(patients, d.id);
          const next = waitingQueue(patients, d.id)[0];
          const justCalled = serving?.status === 'ALERTED';
          return (
            <li
              key={d.id}
              className={`flex flex-col justify-between gap-3 rounded border bg-slate-900 p-4 xl:p-6 ${
                justCalled
                  ? 'border-amber-400 ring-2 ring-amber-400/70 motion-safe:animate-pulse'
                  : 'border-slate-700'
              }`}
            >
              <p className="text-lg font-semibold text-slate-200 xl:text-2xl">{d.tabLabel}</p>

              <div>
                <p
                  className={`text-xs font-semibold uppercase tracking-widest xl:text-base ${
                    serving ? 'text-amber-300 motion-safe:animate-pulse' : 'text-slate-500'
                  }`}
                >
                  Now serving
                </p>
                <p
                  className={`mt-1 text-4xl font-bold tracking-tight xl:text-6xl ${
                    serving ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {serving ? serving.ticketNo : 'None'}
                </p>
                {serving && (
                  <p className="mt-1 flex items-center gap-2 text-base font-semibold text-amber-300 xl:text-2xl">
                    <ArrowRight className="h-5 w-5 xl:h-7 xl:w-7" aria-label="go to" />
                    {d.room}
                  </p>
                )}
              </div>

              <p className="border-t border-slate-800 pt-3 text-sm text-slate-400 xl:text-xl">
                Next{' '}
                <span className={`font-bold ${next ? 'text-white' : 'text-slate-600'}`}>
                  {next ? next.ticketNo : 'None'}
                </span>
              </p>
            </li>
          );
        })}
      </ul>

      <p className="border-t border-slate-800 px-4 py-3 text-sm text-slate-300 sm:px-6 xl:text-xl">
        Please keep your phone with you. You will get an SMS when it is your turn. Emergencies are
        always seen first.
      </p>
    </div>
  );
}

function LobbyView({
  patients,
  departments,
}: {
  patients: Patient[];
  departments: Department[];
}) {
  const [now, setNow] = useState<Date | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [testing, setTesting] = useState(false);
  const exitRef = useRef<HTMLButtonElement>(null);

  // Live clock in Lagos time
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Fullscreen preview: Escape exits, page behind stops scrolling
  useEffect(() => {
    if (!fullscreen) return;
    exitRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [fullscreen]);

  function testAnnouncement() {
    if (testing) return;
    setTesting(true);
    playChime();

    const first = departments
      .map((d) => ({ d, serving: nowServing(patients, d.id) }))
      .find((x) => x.serving);
    const sentence = first?.serving
      ? `Now serving ${spellTicket(first.serving.ticketNo)}. Please go to ${first.d.room}.`
      : 'This is a test of the waiting room announcement.';

    window.setTimeout(() => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(sentence);
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    }, 900);
    window.setTimeout(() => setTesting(false), 4500);
  }

  return (
    <section aria-label="Lobby TV display" className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-lg font-semibold">Lobby TV display</h2>
        <div className="flex flex-wrap items-center gap-2">
          <p className="inline-flex min-h-[44px] items-center gap-2 rounded border border-teal-300 bg-teal-50 px-3 text-xs text-teal-900 sm:min-h-0 sm:py-1.5">
            <Cast className="h-4 w-4" aria-hidden="true" />
            <span>
              <span className="font-semibold">Live</span> on Main Lobby TV
            </span>
          </p>
          <button
            type="button"
            onClick={testAnnouncement}
            disabled={testing}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0 sm:py-1.5 ${focusRing}`}
          >
            <Volume2 className="h-4 w-4" aria-hidden="true" />
            {testing ? 'Playing test' : 'Test chime and voice'}
          </button>
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800 sm:min-h-0 sm:py-1.5 ${focusRing}`}
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
            Fullscreen preview
          </button>
        </div>
      </div>

      {fullscreen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Lobby TV fullscreen preview"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950"
        >
          <button
            ref={exitRef}
            type="button"
            onClick={() => setFullscreen(false)}
            className={`fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] inline-flex min-h-[44px] items-center gap-2 rounded border border-slate-600 bg-slate-900/90 px-3 text-sm font-medium text-white hover:bg-slate-800 ${focusRing}`}
          >
            <Minimize2 className="h-4 w-4" aria-hidden="true" />
            Exit (Esc)
          </button>
          <TvBoard patients={patients} departments={departments} now={now} fullscreen />
        </div>
      ) : (
        <TvBoard patients={patients} departments={departments} now={now} fullscreen={false} />
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Patient live check (mobile first)                                          */
/* -------------------------------------------------------------------------- */

const TRACKER_STEPS: { key: PatientStatus; label: string }[] = [
  { key: 'WAITING', label: 'Waiting in queue' },
  { key: 'ALERTED', label: 'Called, go to your room' },
  { key: 'IN_DOCTOR_ROOM', label: 'In consultation' },
  { key: 'COMPLETED', label: 'Visit complete' },
];

/** Counts down from the estimate and restarts whenever the estimate changes. */
function useCountdown(totalMins: number | null, resetKey: string): number {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (totalMins === null) {
      setRemaining(0);
      return;
    }
    const end = Date.now() + totalMins * 60000;
    setRemaining(totalMins * 60);
    const id = window.setInterval(() => {
      setRemaining(Math.max(0, Math.round((end - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [totalMins, resetKey]);
  return remaining;
}

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function PatientTracker({
  patients,
  departments,
  query,
  onQueryChange,
}: {
  patients: Patient[];
  departments: Department[];
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const ticket = normalizeTicket(query);
  const patient = patients.find((p) => p.ticketNo === ticket);
  const dept = patient ? departments.find((d) => d.id === patient.department) : undefined;
  const position = patient ? positionOf(patients, patient) : 0;
  const remaining = useCountdown(
    patient && patient.status === 'WAITING' ? patient.estimatedWaitMins : null,
    patient?.id ?? '',
  );
  const serving = dept ? nowServing(patients, dept.id) : undefined;

  const activeTickets = patients.filter((p) => p.status !== 'COMPLETED');
  const samples = departments
    .map(
      (d) =>
        patients.find(
          (p) => p.department === d.id && p.status === 'WAITING' && p.triagePriority === 'NORMAL',
        ) ?? waitingQueue(patients, d.id)[0],
    )
    .filter((p): p is Patient => Boolean(p));

  const stepIndex = patient ? TRACKER_STEPS.findIndex((s) => s.key === patient.status) : -1;
  const firstName = patient ? patient.name.split(' ')[0] : '';

  const summary =
    patient && dept
      ? patient.status === 'WAITING'
        ? `${firstName}, ticket ${patient.ticketNo}. Position ${position} in ${dept.tabLabel}. About ${patient.estimatedWaitMins} minutes to wait.`
        : patient.status === 'ALERTED'
          ? `${firstName}, ticket ${patient.ticketNo}. It is your turn. Please go to ${dept.room}.`
          : patient.status === 'IN_DOCTOR_ROOM'
            ? `${firstName}, ticket ${patient.ticketNo}. You are in consultation in ${dept.room}.`
            : `${firstName}, ticket ${patient.ticketNo}. Your visit is complete.`
      : '';

  return (
    <section aria-label="Patient live check" className="mx-auto w-full max-w-sm">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white lg:rounded-[2.25rem] lg:border-[10px] lg:border-slate-800">
        <div className="bg-teal-700 px-4 py-3 text-white">
          <p className="text-base font-semibold">Q-Care Badagry</p>
          <p className="text-sm text-teal-50">Patient live check</p>
        </div>

        <div className="space-y-4 p-4">
          <form onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="ticket-input" className="block text-sm font-medium text-slate-800">
              Your ticket number
            </label>
            <div className="relative mt-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="ticket-input"
                type="text"
                list="ticket-options"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="OPD-015"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className={`min-h-[44px] w-full rounded border border-slate-300 py-2.5 pl-9 pr-3 text-base uppercase sm:text-sm ${focusRing}`}
              />
              <datalist id="ticket-options">
                {activeTickets.map((p) => (
                  <option
                    key={p.id}
                    value={p.ticketNo}
                    label={departments.find((d) => d.id === p.department)?.name}
                  />
                ))}
              </datalist>
            </div>
          </form>

          <div
            className={`-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 ${hideScrollbar}`}
            role="group"
            aria-label="Sample tickets"
          >
            {samples.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onQueryChange(p.ticketNo)}
                aria-pressed={ticket === p.ticketNo}
                className={`min-h-[44px] shrink-0 rounded-full border px-3 text-sm sm:min-h-0 sm:py-1 ${focusRing} ${
                  ticket === p.ticketNo
                    ? 'border-teal-700 bg-teal-50 font-medium text-teal-900'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {p.ticketNo}
              </button>
            ))}
          </div>

          {/* Screen readers hear one short sentence that only changes when the queue does */}
          <p className="sr-only" aria-live="polite">
            {summary}
          </p>

          {!query.trim() && (
            <p className="rounded border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500">
              Type the ticket number from your slip or SMS, or tap a sample ticket above.
            </p>
          )}

          {query.trim() && !patient && (
            <p className="rounded border border-amber-300 bg-amber-50 px-3 py-4 text-sm text-amber-950">
              No ticket matches “{query.trim()}”. Check the number on your slip. It looks like
              OPD-015.
            </p>
          )}

          {patient && dept && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Ticket</p>
                  <p className="text-3xl font-bold tracking-tight">{patient.ticketNo}</p>
                  <p className="break-words text-sm text-slate-700">
                    {firstName}, {dept.name}
                  </p>
                </div>
                {patient.triagePriority === 'URGENT' && <EmergencyBadge />}
              </div>

              {patient.status === 'WAITING' && (
                <div className="rounded border border-slate-200 bg-slate-50 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Your position</p>
                      <p className="text-3xl font-bold">#{position}</p>
                      <p className="text-xs text-slate-600">
                        {position > 1 ? `in ${dept.tabLabel}, ${position - 1} ahead` : `in ${dept.tabLabel}, you are next`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Estimated wait</p>
                      <p className="text-3xl font-bold tabular-nums" aria-hidden="true">
                        {formatCountdown(remaining)}
                      </p>
                      <p className="text-xs text-slate-600">about {patient.estimatedWaitMins} min</p>
                    </div>
                  </div>
                </div>
              )}

              {patient.status === 'ALERTED' && (
                <div className="rounded border border-amber-300 bg-amber-50 p-4 text-amber-950">
                  <p className="text-lg font-semibold">It is your turn</p>
                  <p className="mt-1 text-sm">Please go to {dept.room} now.</p>
                </div>
              )}

              {patient.status === 'IN_DOCTOR_ROOM' && (
                <div className="rounded border border-teal-300 bg-teal-50 p-4 text-teal-950">
                  <p className="text-lg font-semibold">You are being seen</p>
                  <p className="mt-1 text-sm">Consultation in progress in {dept.room}.</p>
                </div>
              )}

              {patient.status === 'COMPLETED' && (
                <div className="rounded border border-slate-200 bg-slate-50 p-4 text-slate-800">
                  <p className="text-lg font-semibold">Visit complete</p>
                  <p className="mt-1 text-sm">Thank you for visiting Badagry General Hospital.</p>
                </div>
              )}

              <ol aria-label="Your journey" className="space-y-1">
                {TRACKER_STEPS.map((step, i) => {
                  const done = i < stepIndex;
                  const current = i === stepIndex;
                  return (
                    <li
                      key={step.key}
                      aria-current={current ? 'step' : undefined}
                      className="flex items-center gap-3 py-1"
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                          done || current
                            ? 'border-teal-700 bg-teal-700 text-white'
                            : 'border-slate-300 bg-white text-slate-500'
                        }`}
                      >
                        {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                      </span>
                      <span
                        className={`text-sm ${
                          current ? 'font-semibold text-slate-900' : done ? 'text-slate-700' : 'text-slate-500'
                        }`}
                      >
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ol>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-slate-600">Room</span>
                  <span className="font-semibold text-slate-900">{dept.room}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-slate-600">Now serving in {dept.tabLabel}</span>
                  <span className="font-semibold text-slate-900">
                    {serving ? serving.ticketNo : 'None'}
                  </span>
                </div>
              </div>

              <JourneyBadges history={patient.journeyHistory} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function Page() {
  const [departments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [patients, setPatients] = useState<Patient[]>(() =>
    recalc(INITIAL_PATIENTS, INITIAL_DEPARTMENTS),
  );
  const [hydrated, setHydrated] = useState(false);
  const skipNextSave = useRef(false);
  const [activeTab, setActiveTab] = useState<Tab>('INTAKE');
  const [toast, setToast] = useState<Toast | null>(null);

  // Intake form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState<DepartmentId>('OPD');
  const [emergency, setEmergency] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [issued, setIssued] = useState<{ patient: Patient; position: number } | null>(null);
  const [queueFilter, setQueueFilter] = useState<DepartmentId | 'ALL'>('ALL');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Console and SMS modal
  const [consoleDept, setConsoleDept] = useState<DepartmentId>('OPD');
  const [alertInfo, setAlertInfo] = useState<AlertInfo | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceFallback, setVoiceFallback] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Patient live check
  const [trackerQuery, setTrackerQuery] = useState('OPD-015');

  const deptById = (id: DepartmentId) => departments.find((d) => d.id === id)!;
  const activePatients = patients.filter((p) => p.status !== 'COMPLETED');
  const canFlagEmergency = deptById(departmentId).handlesEmergency;

  /* ------------------------- Saving in this browser ------------------------ */

  // Load saved patients after the first render so server and client match
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isPatientArray(parsed)) setPatients(recalc(parsed, INITIAL_DEPARTMENTS));
      }
    } catch {
      /* ignore unreadable saved data and keep the sample data */
    }
    setHydrated(true);
  }, []);

  // Save every change
  useEffect(() => {
    if (!hydrated) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
    } catch {
      /* storage can be full or blocked, the app still works */
    }
  }, [patients, hydrated]);

  // Keep a second browser tab (for example the lobby TV) in step
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== STORAGE_KEY) return;
      if (e.key === null || e.newValue === null) {
        skipNextSave.current = true;
        setPatients(recalc(INITIAL_PATIENTS, INITIAL_DEPARTMENTS));
        return;
      }
      try {
        const parsed: unknown = JSON.parse(e.newValue);
        if (isPatientArray(parsed)) {
          skipNextSave.current = true;
          setPatients(recalc(parsed, INITIAL_DEPARTMENTS));
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /* ------------------------------ Toast ----------------------------------- */

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(id);
  }, [toast]);

  function showToast(text: string) {
    setToast({ id: Date.now(), text });
  }

  /* Modal: focus the close button, close on Escape, stop audio and return focus */
  useEffect(() => {
    if (!alertInfo) return;
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAlertInfo(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.speechSynthesis?.cancel();
      returnFocusRef.current?.focus();
    };
  }, [alertInfo]);

  /* ------------------------------ Reset ----------------------------------- */

  function resetDemo() {
    skipNextSave.current = true;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setPatients(recalc(INITIAL_PATIENTS, INITIAL_DEPARTMENTS));
    setIssued(null);
    setAlertInfo(null);
    setQueueFilter('ALL');
    setName('');
    setPhone('');
    setEmergency(false);
    setErrors({});
    showToast('Demo data restored. Saved changes were cleared.');
  }

  /* ------------------------------ Intake ---------------------------------- */

  function handleRegister(e: FormEvent) {
    e.preventDefault();
    const nextErrors: { name?: string; phone?: string } = {};
    const cleanPhone = phone.replace(/[\s-]/g, '');

    if (name.trim().length < 2) nextErrors.name = 'Enter the patient’s full name.';
    if (!PHONE_PATTERN.test(cleanPhone)) {
      nextErrors.phone = 'Enter a Nigerian mobile number, for example 08031234567.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const dept = deptById(departmentId);
    const created: Patient = {
      id: `p${Date.now()}`,
      name: name.trim(),
      phone: cleanPhone,
      department: dept.id,
      ticketNo: nextTicketNo(patients, dept),
      status: 'WAITING',
      triagePriority: emergency && dept.handlesEmergency ? 'URGENT' : 'NORMAL',
      estimatedWaitMins: 0,
      joinedAt: new Date().toISOString(),
    };

    const updated = recalc([...patients, created], departments);
    const saved = updated.find((p) => p.id === created.id) ?? created;
    setPatients(updated);
    setIssued({ patient: saved, position: positionOf(updated, saved) });

    // Reset for the next patient and keep the cursor in the first field
    setName('');
    setPhone('');
    setEmergency(false);
    nameInputRef.current?.focus();
  }

  // Live preview of the ticket the clerk is about to issue
  const preview = (() => {
    const dept = deptById(departmentId);
    const draft: Patient = {
      id: 'preview',
      name: '',
      phone: '',
      department: dept.id,
      ticketNo: nextTicketNo(patients, dept),
      status: 'WAITING',
      triagePriority: emergency && dept.handlesEmergency ? 'URGENT' : 'NORMAL',
      estimatedWaitMins: 0,
      joinedAt: '9999-12-31T00:00:00Z', // sorts after everyone already waiting
    };
    const position = positionOf([...patients, draft], draft);
    return { ticketNo: draft.ticketNo, position, wait: position * MINS_PER_POSITION };
  })();

  /* ------------------------------ Console --------------------------------- */

  function openAlert(patient: Patient, lineNumber: number, sentAt: string) {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setVoiceState('idle');
    setVoiceFallback(false);
    setAlertInfo({ patient, lineNumber, sentAt });
  }

  /** The patient already in the consulting room counts as #1, so the next person is #2. */
  function lineNumberFor(patient: Patient): number {
    return (
      patients.filter((p) => p.department === patient.department && p.status === 'IN_DOCTOR_ROOM')
        .length + 1
    );
  }

  function callNextPatient() {
    const front = waitingQueue(patients, consoleDept)[0];
    if (!front) return;
    const lineNumber = lineNumberFor(front);
    const sentAt = new Date().toISOString();
    const updated = recalc(
      patients.map((p) =>
        p.id === front.id ? { ...p, status: 'ALERTED' as const, calledAt: sentAt } : p,
      ),
      departments,
    );
    setPatients(updated);
    openAlert(updated.find((p) => p.id === front.id) ?? front, lineNumber, sentAt);
  }

  function reAlert(id: string) {
    const target = patients.find((p) => p.id === id);
    if (!target) return;
    const sentAt = new Date().toISOString();
    const refreshed = { ...target, calledAt: sentAt };
    setPatients((prev) => prev.map((p) => (p.id === id ? refreshed : p)));
    openAlert(refreshed, lineNumberFor(target), sentAt);
  }

  function enterRoom(id: string) {
    setPatients((prev) =>
      recalc(
        prev.map((p) => (p.id === id && p.status === 'ALERTED' ? { ...p, status: 'IN_DOCTOR_ROOM' as const } : p)),
        departments,
      ),
    );
  }

  function completeVisit(id: string) {
    const target = patients.find((p) => p.id === id);
    setPatients((prev) =>
      recalc(
        prev.map((p) => (p.id === id ? { ...p, status: 'COMPLETED' as const } : p)),
        departments,
      ),
    );
    if (target) showToast(`${target.name} was discharged. Visit complete.`);
  }

  /** Moves the same patient record to another department and back into the queue. */
  function transferPatient(id: string, targetId: DepartmentId) {
    const target = patients.find((p) => p.id === id);
    if (!target || target.department === targetId) return;
    const from = deptById(target.department);
    const to = deptById(targetId);

    const moved: Patient = {
      ...target,
      department: to.id,
      ticketNo: nextTicketNo(patients, to),
      status: 'WAITING',
      // departments that never take emergencies receive the patient as a normal case
      triagePriority: to.handlesEmergency ? target.triagePriority : 'NORMAL',
      joinedAt: new Date().toISOString(),
      calledAt: undefined,
      journeyHistory: [...(target.journeyHistory ?? []), from.tabLabel],
    };

    const updated = recalc(
      patients.map((p) => (p.id === id ? moved : p)),
      departments,
    );
    const saved = updated.find((p) => p.id === id) ?? moved;
    setPatients(updated);
    showToast(
      `${target.name} moved from ${from.tabLabel} to ${to.tabLabel}. New ticket ${saved.ticketNo}, #${positionOf(updated, saved)} in ${to.tabLabel}. SMS sent to ${target.phone}.`,
    );
  }

  /* ------------------------------ Voice drop ------------------------------ */

  function toggleVoiceDrop(texts: { display: string; spoken: string }) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceState('unsupported');
      return;
    }
    if (voiceState === 'playing') {
      window.speechSynthesis.cancel();
      setVoiceState('idle');
      return;
    }

    window.speechSynthesis.cancel();
    const yoruba = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang.toLowerCase().startsWith('yo'));
    // A real Yoruba voice reads the written wording, other voices read the phonetic version
    const utterance = new SpeechSynthesisUtterance(yoruba ? texts.display : texts.spoken);
    if (yoruba) {
      utterance.voice = yoruba;
      utterance.lang = yoruba.lang;
    }
    setVoiceFallback(!yoruba);
    utterance.rate = 0.85;
    utterance.onend = () => setVoiceState('idle');
    utterance.onerror = () => setVoiceState('idle');
    setVoiceState('playing');
    window.speechSynthesis.speak(utterance);
  }

  /* ------------------------------ Derived data ---------------------------- */

  const waitingAll = patients.filter((p) => p.status === 'WAITING');
  const stats = {
    waiting: waitingAll.length,
    urgent: patients.filter((p) => p.status !== 'COMPLETED' && p.triagePriority === 'URGENT').length,
    inCare: patients.filter((p) => p.status === 'ALERTED' || p.status === 'IN_DOCTOR_ROOM').length,
    avgWait:
      waitingAll.length > 0
        ? Math.round(waitingAll.reduce((sum, p) => sum + p.estimatedWaitMins, 0) / waitingAll.length)
        : 0,
  };

  const queueRows = activePatients
    .filter((p) => queueFilter === 'ALL' || p.department === queueFilter)
    .sort((a, b) => {
      const da = departments.findIndex((d) => d.id === a.department);
      const db = departments.findIndex((d) => d.id === b.department);
      if (da !== db) return da - db;
      if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) {
        return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      }
      return byPriority(a, b);
    });

  /** "#2 in Triage" for people waiting, a short note for everyone else. */
  function queueLabel(p: Patient): { text: string; waiting: boolean } {
    if (p.status === 'WAITING') {
      return { text: `#${positionOf(patients, p)} in ${deptById(p.department).tabLabel}`, waiting: true };
    }
    return { text: p.status === 'ALERTED' ? 'Called' : 'With clinician', waiting: false };
  }

  const waiting = waitingQueue(patients, consoleDept);
  const inProgress = patients
    .filter(
      (p) =>
        p.department === consoleDept &&
        (p.status === 'ALERTED' || p.status === 'IN_DOCTOR_ROOM'),
    )
    .sort((a, b) => (a.status === b.status ? byPriority(a, b) : a.status === 'ALERTED' ? -1 : 1));
  const front = waiting[0];
  const consoleDeptName = deptById(consoleDept).name;

  const alertDept = alertInfo ? deptById(alertInfo.patient.department) : null;
  const smsText = alertInfo && alertDept ? buildSmsText(alertInfo, alertDept) : '';
  const voice =
    alertInfo && alertDept
      ? buildVoiceText(alertDept, alertInfo.patient.name, alertInfo.patient.ticketNo)
      : null;

  /* ------------------------------- Render --------------------------------- */

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      {/* Header and demo role switcher */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <img src="/qcare-logo.png" alt="Q-Care Badagry" className="h-10 w-10 shrink-0 rounded object-contain" />
              <h1 className="min-w-0 font-semibold leading-snug text-slate-900">
                <span className="block text-base sm:inline sm:text-lg">Q-Care Badagry</span>
                <span className="hidden px-1.5 font-normal text-slate-300 sm:inline sm:text-lg">|</span>
                <span className="block text-sm font-normal text-slate-600 sm:inline sm:text-lg">
                  Badagry General Hospital Queue System
                </span>
              </h1>
            </div>

            <button
              type="button"
              onClick={resetDemo}
              aria-label="Reset demo data"
              className={`inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-2 rounded border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 ${focusRing}`}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Reset demo</span>
            </button>
          </div>

          <div className="mt-3">
            <p id="role-switcher-label" className="mb-1.5 text-xs font-medium text-slate-500">
              Demo role switcher. Choose who you are viewing as.
            </p>
            <div
              role="tablist"
              aria-labelledby="role-switcher-label"
              className="grid grid-cols-2 gap-1 rounded border border-slate-300 bg-slate-100 p-1 sm:grid-cols-4"
            >
              {ROLE_TABS.map(({ id, label, hint, Icon }) => {
                const selected = activeTab === id;
                return (
                  <button
                    key={id}
                    id={`tab-${id}`}
                    role="tab"
                    type="button"
                    aria-selected={selected}
                    aria-controls={`panel-${id}`}
                    onClick={() => setActiveTab(id)}
                    className={`flex min-h-[44px] items-center gap-2 rounded px-2.5 py-2 text-left transition-colors sm:px-3 ${focusRing} ${
                      selected ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-tight">{label}</span>
                      <span
                        className={`hidden text-xs leading-tight sm:block ${
                          selected ? 'text-teal-50' : 'text-slate-500'
                        }`}
                      >
                        {hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* ====================== RECORDS INTAKE ====================== */}
        {activeTab === 'INTAKE' && (
          <div role="tabpanel" id="panel-INTAKE" aria-labelledby="tab-INTAKE" className="space-y-6">
            <KpiStrip {...stats} />

            <div className="grid gap-8 lg:grid-cols-[24rem_1fr] lg:items-start">
              {/* Registration form stays in view while the queue scrolls */}
              <section className="lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto">
                <h2 className="text-lg font-semibold">Register a patient</h2>

                <form
                  onSubmit={handleRegister}
                  noValidate
                  className="mt-4 space-y-4 rounded border border-slate-200 bg-white p-4"
                >
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-800">
                      Patient name
                    </label>
                    <div className="relative mt-1">
                      <User
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <input
                        ref={nameInputRef}
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        aria-invalid={!!errors.name}
                        aria-describedby={errors.name ? 'name-error' : undefined}
                        autoComplete="off"
                        placeholder="Full name"
                        className={`min-h-[44px] w-full rounded border py-2.5 pl-9 pr-3 text-base sm:text-sm ${
                          errors.name ? 'border-red-500' : 'border-slate-300'
                        } ${focusRing}`}
                      />
                    </div>
                    {errors.name && (
                      <p id="name-error" className="mt-1 text-sm text-red-700">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-800">
                      WhatsApp / phone number
                    </label>
                    <div className="relative mt-1">
                      <Phone
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <input
                        id="phone"
                        type="tel"
                        inputMode="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="08031234567"
                        aria-invalid={!!errors.phone}
                        aria-describedby={errors.phone ? 'phone-error' : undefined}
                        className={`min-h-[44px] w-full rounded border py-2.5 pl-9 pr-3 text-base sm:text-sm ${
                          errors.phone ? 'border-red-500' : 'border-slate-300'
                        } ${focusRing}`}
                      />
                    </div>
                    {errors.phone && (
                      <p id="phone-error" className="mt-1 text-sm text-red-700">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-slate-800">
                      Department
                    </label>
                    <div className="relative mt-1">
                      <Building2
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <select
                        id="department"
                        value={departmentId}
                        onChange={(e) => {
                          const next = e.target.value as DepartmentId;
                          setDepartmentId(next);
                          if (!deptById(next).handlesEmergency) setEmergency(false);
                        }}
                        className={`min-h-[44px] w-full rounded border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-base sm:text-sm ${focusRing}`}
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Emergency toggle switch */}
                  <div
                    className={`flex items-center justify-between gap-4 rounded border p-3 ${
                      !canFlagEmergency
                        ? 'border-slate-200 bg-slate-100'
                        : emergency
                          ? 'border-red-300 bg-red-50'
                          : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle
                        className={`mt-0.5 h-5 w-5 shrink-0 ${
                          emergency ? 'text-red-700' : 'text-slate-400'
                        }`}
                        aria-hidden="true"
                      />
                      <div>
                        <p
                          id="emergency-label"
                          className={`text-sm font-medium ${
                            canFlagEmergency ? 'text-slate-900' : 'text-slate-500'
                          }`}
                        >
                          Emergency / high urgency
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {canFlagEmergency
                            ? 'Use only if the patient must be seen first.'
                            : `${deptById(departmentId).tabLabel} does not take emergencies. Send emergencies to Triage.`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={emergency}
                      aria-labelledby="emergency-label"
                      disabled={!canFlagEmergency}
                      onClick={() => setEmergency((v) => !v)}
                      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${focusRing} ${
                        emergency ? 'bg-red-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 rounded-full bg-white transition-transform ${
                          emergency ? 'translate-x-[22px]' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Live ticket stub: updates as the clerk changes department or urgency */}
                  <div aria-live="polite" className="rounded border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="text-xs text-slate-500">Ticket to be issued</p>
                        <p className="text-2xl font-bold tracking-tight text-slate-900">
                          {preview.ticketNo}
                        </p>
                      </div>
                      {emergency && canFlagEmergency && <EmergencyBadge />}
                    </div>

                    <div className="relative border-t border-dashed border-slate-300">
                      <span
                        className="absolute -left-[7px] -top-[7px] h-3.5 w-3.5 rounded-full border border-slate-200 bg-white"
                        aria-hidden="true"
                      />
                      <span
                        className="absolute -right-[7px] -top-[7px] h-3.5 w-3.5 rounded-full border border-slate-200 bg-white"
                        aria-hidden="true"
                      />
                      <div className="grid grid-cols-2 divide-x divide-dashed divide-slate-300">
                        <div className="px-4 py-2.5">
                          <p className="text-xs text-slate-500">Queue position</p>
                          <p className="text-sm font-semibold text-slate-900">{preview.position}</p>
                        </div>
                        <div className="px-4 py-2.5">
                          <p className="text-xs text-slate-500">Estimated wait</p>
                          <p className="text-sm font-semibold text-slate-900">{preview.wait} min</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      className={`flex min-h-[48px] w-full items-center justify-center gap-2 rounded bg-teal-700 px-4 py-3 text-base font-semibold text-white hover:bg-teal-800 sm:text-sm ${focusRing}`}
                    >
                      <UserPlus className="h-4 w-4" aria-hidden="true" />
                      Issue ticket
                    </button>
                    <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                      <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                      The patient is texted now, and again when called.
                    </p>
                  </div>
                </form>

                {issued && (
                  <div
                    role="status"
                    className="mt-4 rounded border border-teal-300 bg-teal-50 p-4 text-sm text-teal-950"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="h-5 w-5 text-teal-700" aria-hidden="true" />
                        Patient registered
                      </div>
                      <button
                        type="button"
                        onClick={() => setIssued(null)}
                        aria-label="Dismiss message"
                        className={`-m-2 rounded p-2 text-teal-800 hover:bg-teal-100 ${focusRing}`}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{issued.patient.ticketNo}</p>
                    <p className="mt-1">
                      {issued.patient.name}, {deptById(issued.patient.department).name}.
                    </p>
                    {issued.patient.triagePriority === 'URGENT' && (
                      <p className="mt-1 font-medium text-red-800">Marked as emergency.</p>
                    )}
                    <p className="mt-1">
                      Position {issued.position} in {deptById(issued.patient.department).tabLabel}.
                      Estimated wait: {issued.patient.estimatedWaitMins} minutes ({issued.position} x{' '}
                      {MINS_PER_POSITION}).
                    </p>
                    <p className="mt-1 text-teal-900">Confirmation sent to {issued.patient.phone}.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setTrackerQuery(issued.patient.ticketNo);
                        setActiveTab('PATIENT_TRACKER');
                      }}
                      className={`mt-3 inline-flex min-h-[44px] items-center gap-2 rounded border border-teal-700 bg-white px-3 text-sm font-medium text-teal-900 hover:bg-teal-100 sm:min-h-0 sm:py-1.5 ${focusRing}`}
                    >
                      <Smartphone className="h-4 w-4" aria-hidden="true" />
                      See live status
                    </button>
                  </div>
                )}
              </section>

              {/* Live queue */}
              <section className="min-w-0">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="text-lg font-semibold">Current queue</h2>
                  <p className="text-sm text-slate-600">
                    {queueRows.length} {queueRows.length === 1 ? 'patient' : 'patients'}
                  </p>
                </div>

                {/* Department filter pills */}
                <div
                  role="group"
                  aria-label="Filter queue by department"
                  className={`-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 ${hideScrollbar}`}
                >
                  {(
                    [
                      { id: 'ALL', label: 'All departments', count: activePatients.length },
                      ...departments.map((d) => ({
                        id: d.id,
                        label: d.tabLabel,
                        count: activePatients.filter((p) => p.department === d.id).length,
                      })),
                    ] as { id: DepartmentId | 'ALL'; label: string; count: number }[]
                  ).map((pill) => {
                    const selected = queueFilter === pill.id;
                    return (
                      <button
                        key={pill.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setQueueFilter(pill.id)}
                        className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-sm sm:min-h-0 sm:py-1.5 ${focusRing} ${
                          selected
                            ? 'border-teal-700 bg-teal-700 font-medium text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {pill.label}
                        <span
                          className={`rounded-full px-1.5 text-xs font-semibold ${
                            selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {pill.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Phones: one card per patient, no sideways scrolling */}
                <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded border border-slate-200 bg-white md:hidden">
                  {queueRows.length === 0 && (
                    <li className="px-4 py-8 text-center text-sm text-slate-500">
                      No one is in this queue. Register a patient to issue a ticket.
                    </li>
                  )}
                  {queueRows.map((p) => {
                    const label = queueLabel(p);
                    return (
                      <li key={p.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold">{p.ticketNo}</p>
                            <p
                              className={`text-xs font-semibold ${
                                label.waiting ? 'text-teal-800' : 'text-slate-500'
                              }`}
                            >
                              {label.text}
                            </p>
                            <p className="mt-1 break-words text-sm">{p.name}</p>
                            <p className="text-xs text-slate-500">{deptById(p.department).name}</p>
                            <JourneyBadges history={p.journeyHistory} />
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <StatusBadge status={p.status} />
                            {p.triagePriority === 'URGENT' ? (
                              <EmergencyBadge />
                            ) : (
                              <span className="text-xs text-slate-500">Normal</span>
                            )}
                          </div>
                        </div>
                        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                          <span>Joined {formatTime(p.joinedAt)}</span>
                          {p.status === 'WAITING' && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                              Estimated wait {p.estimatedWaitMins} min
                            </span>
                          )}
                        </p>
                      </li>
                    );
                  })}
                </ul>

                {/* Tablets and larger: table */}
                <div className="mt-3 hidden overflow-x-auto rounded border border-slate-200 bg-white md:block">
                  <table className="w-full min-w-[44rem] text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <tr>
                        <th scope="col" className="px-4 py-2 font-medium">Ticket and position</th>
                        <th scope="col" className="px-4 py-2 font-medium">Patient</th>
                        <th scope="col" className="px-4 py-2 font-medium">Priority</th>
                        <th scope="col" className="px-4 py-2 font-medium">Status</th>
                        <th scope="col" className="px-4 py-2 font-medium">Estimated wait</th>
                        <th scope="col" className="px-4 py-2 font-medium">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {queueRows.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                            No one is in this queue. Register a patient to issue a ticket.
                          </td>
                        </tr>
                      )}
                      {queueRows.map((p) => {
                        const label = queueLabel(p);
                        return (
                          <tr key={p.id}>
                            <td className="whitespace-nowrap px-4 py-3">
                              <div className="font-semibold">{p.ticketNo}</div>
                              <div
                                className={`text-xs font-semibold ${
                                  label.waiting ? 'text-teal-800' : 'text-slate-500'
                                }`}
                              >
                                {label.text}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div>{p.name}</div>
                              <div className="text-xs text-slate-500">{deptById(p.department).name}</div>
                              <JourneyBadges history={p.journeyHistory} />
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              {p.triagePriority === 'URGENT' ? (
                                <EmergencyBadge />
                              ) : (
                                <span className="text-xs text-slate-500">Normal</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={p.status} />
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                              {p.status === 'WAITING' ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                                  {p.estimatedWaitMins} min
                                </span>
                              ) : (
                                <span className="text-slate-400">Not applicable</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                              {formatTime(p.joinedAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ================= CLINICIAN CONSOLE ================= */}
        {activeTab === 'CONSOLE' && (
          <div role="tabpanel" id="panel-CONSOLE" aria-labelledby="tab-CONSOLE" className="space-y-6">
            <KpiStrip {...stats} />

            <div>
              {/* Department filter tabs */}
              <div
                role="tablist"
                aria-label="Department"
                className={`-mx-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0 ${hideScrollbar}`}
              >
                {departments.map((d) => {
                  const selected = consoleDept === d.id;
                  const count = waitingQueue(patients, d.id).length;
                  return (
                    <button
                      key={d.id}
                      role="tab"
                      type="button"
                      aria-selected={selected}
                      onClick={() => setConsoleDept(d.id)}
                      className={`-mb-px flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap border-b-[3px] px-4 py-2.5 text-sm font-medium ${focusRing} ${
                        selected
                          ? 'border-teal-700 text-teal-900'
                          : 'border-transparent text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {d.tabLabel}
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          selected ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{consoleDeptName}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {waiting.length === 0
                      ? 'No patients waiting.'
                      : `${waiting.length} waiting. Emergencies are called first.`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={callNextPatient}
                  disabled={!front}
                  className={`flex min-h-[56px] w-full items-center justify-center gap-3 rounded bg-teal-700 px-5 py-4 text-base font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 sm:w-auto sm:px-8 sm:text-lg ${focusRing}`}
                >
                  <BellRing className="h-6 w-6" aria-hidden="true" />
                  {front ? `Call next patient (${front.ticketNo})` : 'Call next patient'}
                </button>
              </div>

              {/* Waiting cards: only the first one is the dark hero card */}
              <section aria-label="Waiting patients" className="mt-6">
                {waiting.length === 0 ? (
                  <div className="rounded border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
                    No patients are waiting in {consoleDeptName}. New registrations and transfers
                    appear here.
                  </div>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {waiting.map((p, i) => {
                      const isFront = i === 0;
                      const urgent = p.triagePriority === 'URGENT';
                      return (
                        <li
                          key={p.id}
                          className={
                            isFront
                              ? `rounded bg-slate-900 p-4 text-white ring-2 ring-teal-500 sm:col-span-2 ${
                                  urgent ? 'border-l-4 border-l-red-500' : ''
                                }`
                              : `rounded border p-4 text-slate-900 shadow-xs ${
                                  urgent
                                    ? 'border-slate-200 border-l-4 border-l-red-600 bg-red-50/40'
                                    : 'border-slate-200 bg-white'
                                }`
                          }
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className={`text-sm font-medium ${isFront ? 'text-teal-300' : 'text-teal-800'}`}>
                                {isFront ? 'Next in line' : `Position ${i + 1}`}
                              </p>
                              <p className="mt-1 text-3xl font-bold tracking-tight">{p.ticketNo}</p>
                            </div>
                            {urgent && (
                              <span className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">
                                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                                Emergency
                              </span>
                            )}
                          </div>

                          <p className="mt-3 break-words text-lg font-semibold">{p.name}</p>
                          <div
                            className={`mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${
                              isFront ? 'text-slate-300' : 'text-slate-600'
                            }`}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                              {p.phone}
                            </span>
                            <span>Joined {formatTime(p.joinedAt)}</span>
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                              Estimated wait {p.estimatedWaitMins} min
                            </span>
                          </div>
                          <JourneyBadges history={p.journeyHistory} dark={isFront} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* Called and in consultation */}
              {inProgress.length > 0 && (
                <section aria-label="Called and in consultation" className="mt-8">
                  <h3 className="text-base font-semibold">Called and in consultation</h3>

                  <div className="mt-3 overflow-hidden rounded border border-slate-200 bg-white">
                    <div
                      aria-hidden="true"
                      className={`hidden gap-x-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 lg:grid ${IN_PROGRESS_COLS}`}
                    >
                      <span>Ticket</span>
                      <span>Patient</span>
                      <span>Priority</span>
                      <span>Status</span>
                      <span>Next step</span>
                    </div>

                    <ul className="divide-y divide-slate-100">
                      {inProgress.map((p) => (
                        <li
                          key={p.id}
                          className={`grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 gap-y-2 px-4 py-3 lg:items-center ${IN_PROGRESS_COLS}`}
                        >
                          <span className="font-semibold">{p.ticketNo}</span>
                          <div className="min-w-0">
                            <p className="break-words">{p.name}</p>
                            <JourneyBadges history={p.journeyHistory} />
                          </div>

                          {/* Fixed-width slots keep the labels level on every row and screen size */}
                          <div className="col-span-2 flex flex-wrap items-center gap-2 lg:contents">
                            <span className="w-28 lg:w-auto">
                              {p.triagePriority === 'URGENT' ? (
                                <EmergencyBadge />
                              ) : (
                                <span className="text-xs text-slate-500">Normal</span>
                              )}
                            </span>
                            <span className="w-[8.5rem] lg:w-auto">
                              <StatusBadge status={p.status} />
                            </span>
                          </div>

                          {p.status === 'ALERTED' ? (
                            <div className="col-span-2 flex gap-2 lg:col-span-1">
                              <button
                                type="button"
                                onClick={() => enterRoom(p.id)}
                                className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 lg:min-h-0 lg:py-1.5 ${focusRing}`}
                              >
                                <DoorOpen className="h-4 w-4" aria-hidden="true" />
                                Enter Room
                              </button>
                              <button
                                type="button"
                                onClick={() => reAlert(p.id)}
                                className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 lg:min-h-0 lg:py-1.5 ${focusRing}`}
                              >
                                <BellRing className="h-4 w-4" aria-hidden="true" />
                                Re-alert / SMS
                              </button>
                            </div>
                          ) : (
                            <div className="col-span-2 flex gap-2 lg:col-span-1">
                              <label htmlFor={`transfer-${p.id}`} className="sr-only">
                                Transfer {p.name} to another department
                              </label>
                              <select
                                id={`transfer-${p.id}`}
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) transferPatient(p.id, e.target.value as DepartmentId);
                                }}
                                className={`min-h-[44px] min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-2 text-base text-slate-800 sm:text-sm lg:min-h-0 lg:py-1.5 ${focusRing}`}
                              >
                                <option value="">Transfer to...</option>
                                {departments
                                  .filter((d) => d.id !== p.department)
                                  .map((d) => (
                                    <option key={d.id} value={d.id}>
                                      → {d.tabLabel}
                                    </option>
                                  ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => completeVisit(p.id)}
                                className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded border border-slate-300 bg-white px-2 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 lg:min-h-0 lg:py-1.5 ${focusRing}`}
                              >
                                <CheckCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                                <span className="leading-tight">Discharge / Complete</span>
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        {/* ================= LOBBY TV DISPLAY ================= */}
        {activeTab === 'LOBBY_TV' && (
          <div role="tabpanel" id="panel-LOBBY_TV" aria-labelledby="tab-LOBBY_TV">
            <LobbyView patients={patients} departments={departments} />
          </div>
        )}

        {/* ================= PATIENT LIVE CHECK ================= */}
        {activeTab === 'PATIENT_TRACKER' && (
          <div role="tabpanel" id="panel-PATIENT_TRACKER" aria-labelledby="tab-PATIENT_TRACKER">
            <PatientTracker
              patients={patients}
              departments={departments}
              query={trackerQuery}
              onQueryChange={setTrackerQuery}
            />
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] text-xs text-slate-500 sm:px-6">
        Prototype built for the Badagry Tech Summit Builder Challenge. SMS, voice alerts and the
        lobby TV link are simulated. Patient data is sample data, saved only in this browser.
      </footer>

      {/* Toast: transfers, discharges and resets */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-start gap-3 rounded border border-teal-300 bg-white p-3 text-sm text-slate-900 shadow-lg"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" aria-hidden="true" />
          <p className="min-w-0 flex-1">{toast.text}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss message"
            className={`-m-2 shrink-0 rounded p-2 text-slate-500 hover:bg-slate-100 ${focusRing}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ============ SMS ALERT MODAL (patient's phone) ============ */}
      {alertInfo && alertDept && voice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4"
          onClick={() => setAlertInfo(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sms-title"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded bg-white p-4 shadow-xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="sms-title" className="text-lg font-semibold">
                  SMS received on the patient’s phone
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {alertInfo.patient.name} ({alertInfo.patient.ticketNo}), sent to{' '}
                  {alertInfo.patient.phone} via Termii.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAlertInfo(null)}
                aria-label="Close"
                className={`-m-1 shrink-0 rounded p-2 text-slate-500 hover:bg-slate-100 ${focusRing}`}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              {/* Phone mock */}
              <div
                className="w-full max-w-[16rem] shrink-0 rounded-[2rem] border-[10px] border-slate-800 bg-white sm:w-64"
                aria-label="Mock of the patient’s phone"
              >
                <div className="flex justify-center pt-2">
                  <div className="h-1.5 w-16 rounded-full bg-slate-800" />
                </div>
                <div className="border-b border-slate-200 px-4 py-2 text-center">
                  <p className="text-sm font-semibold">QCare</p>
                  <p className="text-xs text-slate-500">Text message via Termii</p>
                </div>
                <div className="min-h-[12rem] bg-slate-50 px-3 py-4 sm:min-h-[15rem]">
                  <p className="mb-3 text-center text-xs text-slate-500">
                    Today {formatTime(alertInfo.sentAt)}
                  </p>
                  <div className="max-w-[94%] rounded-2xl rounded-tl-sm bg-slate-200 px-3 py-2 text-sm leading-snug text-slate-900">
                    {smsText}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Delivered</p>
                </div>
                <div className="flex justify-center pb-2 pt-1">
                  <div className="h-1 w-20 rounded-full bg-slate-300" />
                </div>
              </div>

              {/* Voice drop preview */}
              <div className="w-full min-w-0">
                <div className="rounded border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Voice drop preview</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    A spoken alert in Ogu (Egun) and Yoruba, with English, for patients who prefer
                    to listen.
                  </p>

                  <blockquote className="mt-3 rounded border border-slate-200 bg-white px-3 py-2 text-base font-medium leading-snug text-slate-900">
                    {voice.display}
                  </blockquote>

                  <button
                    type="button"
                    onClick={() => toggleVoiceDrop(voice)}
                    className={`mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded border border-teal-700 px-4 py-3 text-center text-sm font-semibold leading-snug ${focusRing} ${
                      voiceState === 'playing'
                        ? 'bg-teal-700 text-white'
                        : 'bg-white text-teal-900 hover:bg-teal-50'
                    }`}
                  >
                    {voiceState === 'playing' ? (
                      <>
                        <Square className="h-4 w-4 shrink-0" aria-hidden="true" />
                        Stop voice drop
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                        Play Yoruba/Egun Voice Drop Alert
                      </>
                    )}
                  </button>

                  <p className="mt-2 text-xs text-slate-500" aria-live="polite">
                    {voiceState === 'unsupported'
                      ? 'This browser cannot play speech. The text above is what the patient would hear.'
                      : voiceFallback
                        ? 'No Yoruba voice is installed on this device, so the preview reads a phonetic version with its default voice. The text above is the wording for the final audio.'
                        : 'Preview audio is generated by your device.'}
                  </p>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  {alertInfo.patient.name.split(' ')[0]} is now marked Alerted. Use “Enter Room” in
                  the console when they arrive, or “Re-alert / SMS” if they are slow to come.
                </p>

                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setAlertInfo(null)}
                  className={`mt-4 min-h-[44px] w-full rounded bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 ${focusRing}`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

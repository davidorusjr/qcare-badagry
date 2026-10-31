'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Building2,
  Cast,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  DoorOpen,
  Eye,
  EyeOff,
  MessageSquare,
  Phone,
  Square,
  Stethoscope,
  User,
  UserPlus,
  Volume2,
  X,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type DepartmentId = 'OPD' | 'PHARMACY' | 'TRIAGE' | 'ANTENATAL' | 'LAB' | 'PAEDIATRICS';
type PatientStatus = 'WAITING' | 'ALERTED' | 'IN_DOCTOR_ROOM' | 'COMPLETED';
type TriagePriority = 'NORMAL' | 'URGENT';
type Tab = 'INTAKE' | 'CONSOLE';
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
}

interface AlertInfo {
  patient: Patient;
  lineNumber: number;
  sentAt: string;
}

/* -------------------------------------------------------------------------- */
/* Mock data                                                                  */
/* -------------------------------------------------------------------------- */

/** Each position in the queue adds this many minutes to the estimate. */
const MINS_PER_POSITION = 8;

const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'OPD', name: 'OPD (General Outpatient)', tabLabel: 'OPD', code: 'OPD', room: 'Room 3', handlesEmergency: true },
  { id: 'PHARMACY', name: 'Pharmacy', tabLabel: 'Pharmacy', code: 'PHA', room: 'Counter 1', handlesEmergency: false },
  { id: 'TRIAGE', name: 'Triage', tabLabel: 'Triage', code: 'TRI', room: 'Bay 1', handlesEmergency: true },
  { id: 'ANTENATAL', name: 'Antenatal', tabLabel: 'Antenatal', code: 'ANC', room: 'Room 5', handlesEmergency: true },
  { id: 'LAB', name: 'Laboratory', tabLabel: 'Laboratory', code: 'LAB', room: 'Sample Room', handlesEmergency: false },
  { id: 'PAEDIATRICS', name: 'Paediatrics (Children)', tabLabel: 'Paediatrics', code: 'PAE', room: 'Room 4', handlesEmergency: true },
];

const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'p1',
    name: 'Segun Lawson',
    phone: '08031234567',
    department: 'OPD',
    ticketNo: 'OPD-015',
    status: 'WAITING',
    triagePriority: 'NORMAL',
    estimatedWaitMins: 0,
    joinedAt: '2026-10-30T08:12:00+01:00',
  },
  {
    id: 'p2',
    name: 'Ibrahim Sanni',
    phone: '08029876543',
    department: 'OPD',
    ticketNo: 'OPD-014',
    status: 'IN_DOCTOR_ROOM',
    triagePriority: 'NORMAL',
    estimatedWaitMins: 0,
    joinedAt: '2026-10-30T07:58:00+01:00',
    calledAt: '2026-10-30T08:10:00+01:00',
  },
  {
    id: 'p3',
    name: 'Fatimah Musa',
    phone: '07065554321',
    department: 'ANTENATAL',
    ticketNo: 'ANC-006',
    status: 'ALERTED',
    triagePriority: 'NORMAL',
    estimatedWaitMins: 0,
    joinedAt: '2026-10-30T08:05:00+01:00',
    calledAt: '2026-10-30T08:25:00+01:00',
  },
  {
    id: 'p4',
    name: 'Paul Akande',
    phone: '08157778899',
    department: 'TRIAGE',
    ticketNo: 'TRI-021',
    status: 'WAITING',
    triagePriority: 'URGENT',
    estimatedWaitMins: 0,
    joinedAt: '2026-10-30T08:20:00+01:00',
  },
  {
    id: 'p5',
    name: 'Grace Adeyemi',
    phone: '09012345678',
    department: 'PHARMACY',
    ticketNo: 'PHA-032',
    status: 'COMPLETED',
    triagePriority: 'NORMAL',
    estimatedWaitMins: 0,
    joinedAt: '2026-10-30T07:40:00+01:00',
  },
  {
    id: 'p6',
    name: 'Kehinde Alabi',
    phone: '08051112233',
    department: 'TRIAGE',
    ticketNo: 'TRI-022',
    status: 'WAITING',
    triagePriority: 'NORMAL',
    estimatedWaitMins: 0,
    joinedAt: '2026-10-30T08:24:00+01:00',
  },
  {
    id: 'p7',
    name: 'Blessing Eze',
    phone: '08064445566',
    department: 'ANTENATAL',
    ticketNo: 'ANC-007',
    status: 'WAITING',
    triagePriority: 'NORMAL',
    estimatedWaitMins: 0,
    joinedAt: '2026-10-30T08:15:00+01:00',
  },
  {
    id: 'p8',
    name: 'Halima Yusuf',
    phone: '07012345678',
    department: 'PHARMACY',
    ticketNo: 'PHA-033',
    status: 'WAITING',
    triagePriority: 'NORMAL',
    estimatedWaitMins: 0,
    joinedAt: '2026-10-30T08:35:00+01:00',
  },
  {
    id: 'p9',
    name: 'Amina Bello',
    phone: '08098765432',
    department: 'LAB',
    ticketNo: 'LAB-008',
    status: 'WAITING',
    triagePriority: 'NORMAL',
    estimatedWaitMins: 0,
    joinedAt: '2026-10-30T08:30:00+01:00',
  },
  {
    id: 'p10',
    name: 'Tobi Adebayo',
    phone: '09087654321',
    department: 'PAEDIATRICS',
    ticketNo: 'PAE-011',
    status: 'WAITING',
    triagePriority: 'URGENT',
    estimatedWaitMins: 0,
    joinedAt: '2026-10-30T08:28:00+01:00',
  },
];

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

const PHONE_PATTERN = /^(?:\+?234|0)[789]\d{9}$/;

/** Column widths shared by the header and every row, so nothing shifts. */
const IN_PROGRESS_COLS = 'md:grid-cols-[5rem_minmax(0,1fr)_7rem_8.5rem_12rem]';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

/** Fixed time zone so server and client render the same text. */
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
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

/** Position in the queue, starting at 1. Returns 0 if the patient is not waiting. */
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

/**
 * The SMS text. A server-side call to Termii would send this string, so the
 * wording lives in one place.
 */
function buildSmsText(info: AlertInfo, dept: Department): string {
  return `Q-Care Alert: Hello ${info.patient.name}, you are #${info.lineNumber} next for ${dept.tabLabel} at Badagry General Hospital. Please proceed to ${dept.room}.`;
}

/** The spoken alert in Yoruba / Egun. */
function buildVoiceText(dept: Department): string {
  return `E kaabo, oju re ti de ni ${dept.tabLabel} ${dept.room}`;
}

/* -------------------------------------------------------------------------- */
/* Small presentational pieces                                                */
/* -------------------------------------------------------------------------- */

function StatusBadge({ status }: { status: PatientStatus }) {
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}
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

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function Page() {
  const [departments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [patients, setPatients] = useState<Patient[]>(() =>
    recalc(INITIAL_PATIENTS, INITIAL_DEPARTMENTS),
  );
  const [activeTab, setActiveTab] = useState<Tab>('INTAKE');
  const [showLobby, setShowLobby] = useState(true);

  // Intake form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState<DepartmentId>('OPD');
  const [emergency, setEmergency] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [issued, setIssued] = useState<{ patient: Patient; position: number } | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Console and SMS modal
  const [consoleDept, setConsoleDept] = useState<DepartmentId>('OPD');
  const [alertInfo, setAlertInfo] = useState<AlertInfo | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceFallback, setVoiceFallback] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const deptById = (id: DepartmentId) => departments.find((d) => d.id === id)!;
  const activePatients = patients.filter((p) => p.status !== 'COMPLETED');

  const canFlagEmergency = deptById(departmentId).handlesEmergency;

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

  /* Modal: focus the close button, close on Escape, stop audio on close */
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
    };
  }, [alertInfo]);

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

  /* ------------------------------ Console --------------------------------- */

  function callNextPatient() {
    const front = waitingQueue(patients, consoleDept)[0];
    if (!front) return;

    // The patient already in the consulting room counts as #1, so the next
    // person called is #2 (or #1 if the room is empty).
    const inRoom = patients.filter(
      (p) => p.department === front.department && p.status === 'IN_DOCTOR_ROOM',
    ).length;
    const sentAt = new Date().toISOString();

    const updated = recalc(
      patients.map((p) =>
        p.id === front.id ? { ...p, status: 'ALERTED' as const, calledAt: sentAt } : p,
      ),
      departments,
    );
    setPatients(updated);
    setVoiceState('idle');
    setVoiceFallback(false);
    setAlertInfo({
      patient: updated.find((p) => p.id === front.id) ?? front,
      lineNumber: inRoom + 1,
      sentAt,
    });
  }

  function moveForward(id: string) {
    setPatients((prev) =>
      recalc(
        prev.map((p) => {
          if (p.id !== id) return p;
          if (p.status === 'ALERTED') return { ...p, status: 'IN_DOCTOR_ROOM' as const };
          if (p.status === 'IN_DOCTOR_ROOM') return { ...p, status: 'COMPLETED' as const };
          return p;
        }),
        departments,
      ),
    );
  }

  /* ------------------------------ Voice drop ------------------------------ */

  function toggleVoiceDrop(text: string) {
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
    const utterance = new SpeechSynthesisUtterance(text);
    const yoruba = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang.toLowerCase().startsWith('yo'));
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
  const voiceText = alertDept ? buildVoiceText(alertDept) : '';

  /* ------------------------------- Render --------------------------------- */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
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

          <div
            role="tablist"
            aria-label="Switch view"
            className="grid w-full grid-cols-2 gap-0.5 rounded border border-slate-300 bg-slate-100 p-0.5 md:inline-grid md:w-auto"
          >
            {(
              [
                { id: 'INTAKE', label: 'Records Intake Portal', Icon: UserPlus },
                { id: 'CONSOLE', label: 'Doctor / Nurse Console', Icon: ClipboardList },
              ] as const
            ).map(({ id, label, Icon }) => {
              const selected = activeTab === id;
              return (
                <button
                  key={id}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  onClick={() => setActiveTab(id)}
                  className={`flex min-h-[3rem] flex-col items-center justify-center gap-1 rounded px-2 py-2 text-center text-xs font-medium leading-tight transition-colors sm:min-h-0 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm ${focusRing} ${
                    selected ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* ====================== TAB 1: RECORDS INTAKE ====================== */}
        {activeTab === 'INTAKE' && (
          <div
            role="tabpanel"
            className="grid gap-x-8 gap-y-4 lg:grid-cols-[22rem_1fr] lg:grid-rows-[auto_1fr]"
          >
            <div className="lg:col-start-1 lg:row-start-1">
              <h2 className="text-lg font-semibold">Register a patient</h2>
            </div>

            <section className="lg:col-start-1 lg:row-start-2">
              <form
                onSubmit={handleRegister}
                noValidate
                className="space-y-4 rounded border border-slate-200 bg-white p-4"
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
                      className={`w-full rounded border py-2.5 pl-9 pr-3 text-base sm:text-sm ${
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
                      className={`w-full rounded border py-2.5 pl-9 pr-3 text-base sm:text-sm ${
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
                      className={`w-full rounded border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-base sm:text-sm ${focusRing}`}
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
                <div
                  aria-live="polite"
                  className="rounded border border-slate-200 bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-xs text-slate-500">Ticket to be issued</p>
                      <p className="text-2xl font-bold tracking-tight text-slate-900">
                        {preview.ticketNo}
                      </p>
                    </div>
                    {emergency && <EmergencyBadge />}
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
                    className={`flex w-full items-center justify-center gap-2 rounded bg-teal-700 px-4 py-3.5 text-base font-semibold sm:py-3 sm:text-sm text-white hover:bg-teal-800 ${focusRing}`}
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
                      className={`rounded p-0.5 text-teal-800 hover:bg-teal-100 ${focusRing}`}
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
                    Position {issued.position} in the queue. Estimated wait:{' '}
                    {issued.patient.estimatedWaitMins} minutes ({issued.position} x{' '}
                    {MINS_PER_POSITION}).
                  </p>
                  <p className="mt-1 text-teal-900">
                    Confirmation sent to {issued.patient.phone}.
                  </p>
                </div>
              )}
            </section>

            {/* Live queue */}
            <div className="mt-6 flex items-baseline justify-between gap-4 lg:col-start-2 lg:row-start-1 lg:mt-0">
              <h2 className="text-lg font-semibold">Current queue</h2>
              <p className="text-sm text-slate-600">
                {activePatients.length} {activePatients.length === 1 ? 'patient' : 'patients'}{' '}
                waiting or being seen
              </p>
            </div>

            <section className="lg:col-start-2 lg:row-start-2">
              {/* Phones: one card per patient, no sideways scrolling */}
              <ul className="divide-y divide-slate-100 overflow-hidden rounded border border-slate-200 bg-white md:hidden">
                {activePatients.length === 0 && (
                  <li className="px-4 py-8 text-center text-sm text-slate-500">
                    No one is in the queue. Register a patient to issue the first ticket.
                  </li>
                )}
                {[...activePatients].sort(byPriority).map((p) => (
                  <li key={p.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{p.ticketNo}</p>
                        <p className="break-words text-sm">{p.name}</p>
                        <p className="text-xs text-slate-500">{deptById(p.department).name}</p>
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
                ))}
              </ul>

              {/* Tablets and larger: table */}
              <div className="hidden overflow-auto rounded border border-slate-200 bg-white md:block lg:max-h-[40rem]">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-medium">Ticket</th>
                      <th scope="col" className="px-4 py-2 font-medium">Patient</th>
                      <th scope="col" className="px-4 py-2 font-medium">Priority</th>
                      <th scope="col" className="px-4 py-2 font-medium">Joined</th>
                      <th scope="col" className="px-4 py-2 font-medium">Status</th>
                      <th scope="col" className="px-4 py-2 font-medium">Estimated wait</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activePatients.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                          No one is in the queue. Register a patient to issue the first ticket.
                        </td>
                      </tr>
                    )}
                    {[...activePatients].sort(byPriority).map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 font-semibold">{p.ticketNo}</td>
                        <td className="px-4 py-3">
                          <div>{p.name}</div>
                          <div className="text-xs text-slate-500">{deptById(p.department).name}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {p.triagePriority === 'URGENT' ? (
                            <EmergencyBadge />
                          ) : (
                            <span className="text-xs text-slate-500">Normal</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatTime(p.joinedAt)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {p.status === 'WAITING' ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                              {p.estimatedWaitMins} min
                            </span>
                          ) : (
                            <span className="text-slate-400">Not applicable</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* ================= TAB 2: DOCTOR & NURSE CONSOLE ================= */}
        {activeTab === 'CONSOLE' && (
          <div role="tabpanel">
            {/* Department filter tabs */}
            <div
              role="tablist"
              aria-label="Department"
              className="-mx-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0"
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
                    className={`-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-[3px] px-4 py-2.5 text-sm font-medium ${focusRing} ${
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
                className={`flex w-full items-center justify-center gap-3 rounded bg-teal-700 px-5 py-4 text-base font-bold text-white sm:w-auto sm:px-8 sm:text-lg hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 ${focusRing}`}
              >
                <BellRing className="h-6 w-6" aria-hidden="true" />
                {front ? `Call next patient (${front.ticketNo})` : 'Call next patient'}
              </button>
            </div>

            {/* Waiting cards */}
            <section aria-label="Waiting patients" className="mt-6">
              {waiting.length === 0 ? (
                <div className="rounded border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
                  No patients are waiting in {consoleDeptName}. New registrations from the Records
                  Intake Portal appear here.
                </div>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {waiting.map((p, i) => {
                    const isFront = i === 0;
                    return (
                      <li
                        key={p.id}
                        className={`rounded bg-slate-900 p-4 text-white ${
                          isFront ? 'ring-2 ring-teal-500 sm:col-span-2' : ''
                        } ${p.triagePriority === 'URGENT' ? 'border-l-4 border-red-500' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-teal-300">
                              {isFront ? 'Next in line' : `Position ${i + 1}`}
                            </p>
                            <p className="mt-1 text-3xl font-bold tracking-tight">{p.ticketNo}</p>
                          </div>
                          {p.triagePriority === 'URGENT' && (
                            <span className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">
                              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                              Emergency
                            </span>
                          )}
                        </div>

                        <p className="mt-3 break-words text-lg font-semibold">{p.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
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
                    className={`hidden gap-x-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 md:grid ${IN_PROGRESS_COLS}`}
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
                        className={`grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 gap-y-2 px-4 py-3 md:items-center ${IN_PROGRESS_COLS}`}
                      >
                        <span className="font-semibold">{p.ticketNo}</span>
                        <span className="break-words">{p.name}</span>

                        {/* Fixed-width slots keep the labels level on every row and screen size */}
                        <div className="col-span-2 flex flex-wrap items-center gap-2 md:contents">
                          <span className="w-28 md:w-auto">
                            {p.triagePriority === 'URGENT' ? (
                              <EmergencyBadge />
                            ) : (
                              <span className="text-xs text-slate-500">Normal</span>
                            )}
                          </span>
                          <span className="w-[8.5rem] md:w-auto">
                            <StatusBadge status={p.status} />
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => moveForward(p.id)}
                          className={`col-span-2 inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 md:col-span-1 md:py-1.5 ${focusRing}`}
                        >
                          {p.status === 'ALERTED' ? (
                            <>
                              <DoorOpen className="h-4 w-4" aria-hidden="true" />
                              Send to doctor room
                            </>
                          ) : (
                            <>
                              <CheckCheck className="h-4 w-4" aria-hidden="true" />
                              Mark completed
                            </>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* ===================== PUBLIC LOBBY VIEW ===================== */}
      <section
        aria-label="Public lobby view"
        className="mx-auto max-w-6xl px-4 pb-8 sm:px-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Waiting room screen</h2>
          <div className="flex flex-wrap items-center gap-2">
            <p className="inline-flex items-center gap-2 rounded border border-teal-300 bg-teal-50 px-2.5 py-1.5 text-xs text-teal-900">
              <Cast className="h-4 w-4" aria-hidden="true" />
              <span>
                <span className="font-semibold">Live</span> on Main Lobby TV
              </span>
            </p>
            <button
              type="button"
              onClick={() => setShowLobby((v) => !v)}
              aria-expanded={showLobby}
              aria-controls="lobby-screen"
              className={`inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 sm:py-1.5 ${focusRing}`}
            >
              {showLobby ? (
                <>
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                  Hide preview
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  Show preview
                </>
              )}
            </button>
          </div>
        </div>

        {showLobby && (
        <div
          id="lobby-screen"
          className="mt-4 rounded-lg border-4 border-slate-800 bg-slate-950 p-4 text-white sm:border-8 sm:p-8"
        >
          <div className="flex flex-col gap-1 pb-4 sm:flex-row sm:items-baseline sm:justify-between">
            <p className="text-lg font-semibold">Badagry General Hospital</p>
            <p className="text-sm text-slate-400">
              Keep your phone with you. We will send an SMS when it is your turn.
            </p>
          </div>

          <ul className="border-t border-slate-700">
            {departments.map((d) => {
              const serving = nowServing(patients, d.id);
              const next = waitingQueue(patients, d.id)[0];
              return (
                <li
                  key={d.id}
                  className="grid gap-2 border-b border-slate-800 py-3 last:border-b-0 sm:py-4 md:grid-cols-[9rem_1fr_14rem] md:items-center md:gap-6"
                >
                  <p className="text-sm font-medium text-slate-300 sm:text-base">{d.tabLabel}</p>

                  {/* Phones: two compact cells. Tablets and up: one wide line. */}
                  <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-x-4 md:contents">
                    <p className="min-w-0 font-bold uppercase tracking-wide md:flex md:flex-wrap md:items-center md:gap-x-3 md:text-2xl">
                      <span className="block text-xs font-medium text-slate-400 md:inline md:text-2xl md:font-bold">
                        Now serving:
                      </span>
                      {serving ? (
                        <span className="flex flex-wrap items-center gap-x-2 text-base md:contents md:text-2xl">
                          <span className="text-amber-300">{serving.ticketNo}</span>
                          <ArrowRight className="h-4 w-4 text-slate-500 md:h-5 md:w-5" aria-label="to" />
                          <span>{d.room}</span>
                        </span>
                      ) : (
                        <span className="text-base text-slate-500 md:text-2xl">None</span>
                      )}
                    </p>

                    <p className="min-w-0 font-bold uppercase tracking-wide md:border-l md:border-slate-700 md:pl-6 md:text-2xl">
                      <span className="block text-xs font-medium text-slate-400 md:inline md:text-2xl md:font-bold">
                        Next:{' '}
                      </span>
                      <span className={`text-base md:text-2xl ${next ? 'text-white' : 'text-slate-500'}`}>
                        {next ? next.ticketNo : 'None'}
                      </span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        )}
      </section>

      <footer className="mx-auto max-w-6xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] text-xs text-slate-500 sm:px-6">
        Prototype built for the Badagry Tech Summit Builder Challenge. SMS, voice alerts and the lobby
        TV link are simulated, and patient data is sample data.
      </footer>

      {/* ============ SMS ALERT MODAL (patient's phone) ============ */}
      {alertInfo && alertDept && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60"
          onClick={() => setAlertInfo(null)}
        >
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sms-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded bg-white p-4 shadow-xl sm:p-6"
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
              <div className="w-full">
                <div className="rounded border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Voice drop preview</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    A spoken alert in Yoruba / Egun for patients who prefer to listen.
                  </p>

                  <blockquote className="mt-3 rounded border border-slate-200 bg-white px-3 py-2 text-base font-medium text-slate-900">
                    {voiceText}
                  </blockquote>

                  <button
                    type="button"
                    onClick={() => toggleVoiceDrop(voiceText)}
                    className={`mt-3 flex w-full items-center justify-center gap-2 rounded border border-teal-700 px-4 py-3 text-center text-sm font-semibold leading-snug ${focusRing} ${
                      voiceState === 'playing'
                        ? 'bg-teal-700 text-white'
                        : 'bg-white text-teal-900 hover:bg-teal-50'
                    }`}
                  >
                    {voiceState === 'playing' ? (
                      <>
                        <Square className="h-4 w-4" aria-hidden="true" />
                        Stop voice drop
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4" aria-hidden="true" />
                        Play Yoruba/Egun Voice Drop Alert
                      </>
                    )}
                  </button>

                  <p className="mt-2 text-xs text-slate-500" aria-live="polite">
                    {voiceState === 'unsupported'
                      ? 'This browser cannot play speech. The text above is what the patient would hear.'
                      : voiceFallback
                        ? 'No Yoruba voice is installed on this device, so the preview uses its default voice. The text above is the wording for the final audio.'
                        : 'Preview audio is generated by your device.'}
                  </p>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  {alertInfo.patient.name.split(' ')[0]} is now marked Alerted. Use “Send to doctor
                  room” in the console when they arrive.
                </p>

                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setAlertInfo(null)}
                  className={`mt-4 w-full rounded bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 ${focusRing}`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

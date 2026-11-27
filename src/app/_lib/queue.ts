/* -------------------------------------------------------------------------- */
/* Queue domain: departments, desks, patients and pure helpers.               */
/* Nothing in this file touches the browser, so it is safe on the server.     */
/* -------------------------------------------------------------------------- */

export type DepartmentId = 'GOPD' | 'ANC' | 'PHM' | 'lab' | 'REC';
export type Triage = 'EMERGENCY' | 'PRIORITY' | 'STANDARD';
export type PriorityReason = 'ELDERLY' | 'PREGNANT' | 'PEDIATRIC';
export type PatientStatus = 'WAITING' | 'SERVING' | 'COMPLETED' | 'NO_SHOW';

export interface Desk {
  id: string;
  label: string;
  department: DepartmentId;
}

export interface Department {
  id: DepartmentId;
  /** Ticket prefix, e.g. GOPD-014 */
  code: string;
  name: string;
  short: string;
  /** Average minutes one desk needs per patient, used for wait estimates. */
  minsPerPatient: number;
  desks: Desk[];
}

export interface Patient {
  id: string;
  name: string;
  department: DepartmentId;
  ticketNo: string;
  triage: Triage;
  reason?: PriorityReason;
  status: PatientStatus;
  /** Epoch milliseconds */
  joinedAt: number;
  calledAt?: number;
  finishedAt?: number;
  deskId?: string;
  /** Departments already visited before a transfer. */
  journey?: DepartmentId[];
}

export interface QueueState {
  version: 2;
  seededAt: number;
  patients: Patient[];
}

/* ------------------------------- Departments ------------------------------ */

function desks(department: DepartmentId, labels: string[]): Desk[] {
  return labels.map((label, i) => ({ id: `${department}-${i + 1}`, label, department }));
}

export const DEPARTMENTS: Department[] = [
  {
    id: 'GOPD',
    code: 'GOPD',
    name: 'General Out-Patient',
    short: 'GOPD',
    minsPerPatient: 12,
    desks: desks('GOPD', ['Consulting Room 1', 'Consulting Room 2', 'Consulting Room 3']),
  },
  {
    id: 'ANC',
    code: 'ANC',
    name: 'Antenatal Clinic',
    short: 'Antenatal',
    minsPerPatient: 14,
    desks: desks('ANC', ['ANC Room 1', 'ANC Room 2']),
  },
  {
    id: 'PHM',
    code: 'PHM',
    name: 'Pharmacy',
    short: 'Pharmacy',
    minsPerPatient: 5,
    desks: desks('PHM', ['Dispensing Window 1', 'Dispensing Window 2']),
  },
  {
    id: 'lab',
    code: 'LAB',
    name: 'Laboratory / Diagnostics',
    short: 'Laboratory',
    minsPerPatient: 7,
    desks: desks('lab', ['Lab Window 1', 'Lab Window 2']),
  },
  {
    id: 'REC',
    code: 'REC',
    name: 'Records / Card Room',
    short: 'Records',
    minsPerPatient: 4,
    desks: desks('REC', ['Card Counter 1', 'Card Counter 2']),
  },
];

export const DESKS: Desk[] = DEPARTMENTS.flatMap((d) => d.desks);

const DEPARTMENT_IDS = DEPARTMENTS.map((d) => d.id);

export function deptById(id: DepartmentId): Department {
  return DEPARTMENTS.find((d) => d.id === id) ?? DEPARTMENTS[0];
}

export function deskById(id: string | undefined): Desk | undefined {
  return DESKS.find((d) => d.id === id);
}

export function isDepartmentId(value: unknown): value is DepartmentId {
  return typeof value === 'string' && (DEPARTMENT_IDS as string[]).includes(value);
}

/* ------------------------------- Eligibility ------------------------------ */

export type EligibilityId = 'STANDARD' | PriorityReason | 'EMERGENCY';

export const ELIGIBILITY: {
  id: EligibilityId;
  label: string;
  hint: string;
  triage: Triage;
  reason?: PriorityReason;
}[] = [
  { id: 'STANDARD', label: 'Standard', hint: 'No priority need', triage: 'STANDARD' },
  { id: 'ELDERLY', label: 'Elderly', hint: 'Aged 65 or older', triage: 'PRIORITY', reason: 'ELDERLY' },
  { id: 'PREGNANT', label: 'Pregnant', hint: 'Expectant mother', triage: 'PRIORITY', reason: 'PREGNANT' },
  { id: 'PEDIATRIC', label: 'Child', hint: 'Under 5 years', triage: 'PRIORITY', reason: 'PEDIATRIC' },
  {
    id: 'EMERGENCY',
    label: 'Emergency',
    hint: 'Severe pain, heavy bleeding or difficulty breathing',
    triage: 'EMERGENCY',
  },
];

export const TRIAGE_LABEL: Record<Triage, string> = {
  EMERGENCY: 'Emergency',
  PRIORITY: 'Priority',
  STANDARD: 'Standard',
};

export const REASON_LABEL: Record<PriorityReason, string> = {
  ELDERLY: 'Elderly',
  PREGNANT: 'Pregnant',
  PEDIATRIC: 'Child',
};

const TRIAGE_RANK: Record<Triage, number> = { EMERGENCY: 0, PRIORITY: 1, STANDARD: 2 };

/* --------------------------------- Ordering ------------------------------- */

/** Emergency > Priority > Standard, then first come first served. */
export function byQueueOrder(a: Patient, b: Patient): number {
  const rank = TRIAGE_RANK[a.triage] - TRIAGE_RANK[b.triage];
  return rank !== 0 ? rank : a.joinedAt - b.joinedAt;
}

/** Waiting patients in calling order, for one department or all of them. */
export function waitingList(patients: Patient[], department: DepartmentId | 'ALL' = 'ALL'): Patient[] {
  return patients
    .filter((p) => p.status === 'WAITING' && (department === 'ALL' || p.department === department))
    .sort(byQueueOrder);
}

/** Position within the patient's own department, starting at 1. 0 when not waiting. */
export function positionOf(patients: Patient[], patient: Patient): number {
  return waitingList(patients, patient.department).findIndex((p) => p.id === patient.id) + 1;
}

/** Position x minutes per patient, shared across the department's desks. */
export function estimateWaitMins(patients: Patient[], patient: Patient): number {
  const position = positionOf(patients, patient);
  if (position === 0) return 0;
  const dept = deptById(patient.department);
  return Math.max(2, Math.round((position * dept.minsPerPatient) / dept.desks.length));
}

export function servingAt(patients: Patient[], deskId: string): Patient | undefined {
  return patients.find((p) => p.status === 'SERVING' && p.deskId === deskId);
}

/** Everyone currently being served, most recently called first. */
export function servingList(patients: Patient[]): Patient[] {
  return patients
    .filter((p) => p.status === 'SERVING')
    .sort((a, b) => (b.calledAt ?? 0) - (a.calledAt ?? 0));
}

/* --------------------------------- Tickets -------------------------------- */

export function nextTicketNo(patients: Patient[], department: DepartmentId): string {
  const dept = deptById(department);
  const highest = patients
    .filter((p) => p.ticketNo.startsWith(`${dept.code}-`))
    .reduce((max, p) => {
      const n = parseInt(p.ticketNo.split('-')[1] ?? '0', 10);
      return Number.isNaN(n) ? max : Math.max(max, n);
    }, 0);
  return `${dept.code}-${String(highest + 1).padStart(3, '0')}`;
}

/** Accepts "gopd14", "GOPD 014" or "GOPD-014" and returns "GOPD-014". */
export function normalizeTicket(input: string): string {
  const t = input.trim().toUpperCase().replace(/\s+/g, '');
  const m = /^([A-Z]{3,4})-?(\d{1,4})$/.exec(t);
  return m ? `${m[1]}-${m[2].padStart(3, '0')}` : t;
}

/** "GOPD-014" becomes "G O P D, 0 1 4" so speech reads it clearly. */
export function spellTicket(ticketNo: string): string {
  const [code = '', num = ''] = ticketNo.split('-');
  return `${code.split('').join(' ')}, ${num.split('').join(' ')}`;
}

/* --------------------------------- Formatting ----------------------------- */

/** "08:14", or "08:14:07" with seconds. Fixed time zone so server and client agree. */
export function formatClock(ms: number, withSeconds = false): string {
  return new Date(ms).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
    timeZone: 'Africa/Lagos',
  });
}

/** Splits a duration into whole hours, minutes and seconds. Negative input counts as 0. */
export function durationParts(ms: number): { h: number; m: number; s: number } {
  const total = Math.max(0, Math.floor(ms / 1000));
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

/** 45s -> "0m 45s", 12m 4s -> "12m 04s", 74m -> "1h 14m 00s" */
export function formatDuration(ms: number): string {
  const { h, m, s } = durationParts(ms);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m ${ss}s` : `${m}m ${ss}s`;
}

/** Time since a timestamp, e.g. a patient's wait since check-in. */
export function elapsedSince(from: number, now: number): number {
  return Math.max(0, now - from);
}

/**
 * Live countdown for a waiting patient. The estimate restarts whenever the
 * department's queue moves (someone is called) or the patient checks in, then
 * counts down second by second. Returns 0 when the call is due any moment.
 */
export function estimateRemainingMs(patients: Patient[], patient: Patient, now: number): number {
  const mins = estimateWaitMins(patients, patient);
  if (mins === 0) return 0;
  const lastMove = patients.reduce(
    (latest, p) => (p.department === patient.department && p.calledAt ? Math.max(latest, p.calledAt) : latest),
    0,
  );
  const anchor = Math.max(patient.joinedAt, lastMove);
  return Math.max(0, mins * 60_000 - (now - anchor));
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Lagos',
  });
}

/* ---------------------------------- Seed ---------------------------------- */

const MIN = 60_000;

interface SeedRow {
  ticket: string;
  name: string;
  triage?: Triage;
  reason?: PriorityReason;
  joined: number; // minutes ago
  called?: number; // minutes ago, makes the patient SERVING
  desk?: string;
  journey?: DepartmentId[];
}

/* Active queue: 21 waiting, 5 being served. Waits run from 8 to 35 minutes. */
const ACTIVE_ROWS: SeedRow[] = [
  // GOPD
  { ticket: 'GOPD-014', name: 'Adewale Ogunleye', joined: 44, called: 6, desk: 'GOPD-1' },
  { ticket: 'GOPD-015', name: 'Chinonso Eze', triage: 'PRIORITY', reason: 'ELDERLY', joined: 41, called: 3, desk: 'GOPD-2' },
  { ticket: 'GOPD-016', name: 'Folake Adeyemi', joined: 35 },
  { ticket: 'GOPD-017', name: 'Babatunde Lawal', triage: 'PRIORITY', reason: 'ELDERLY', joined: 31 },
  { ticket: 'GOPD-018', name: 'Ifeoma Nwachukwu', joined: 27, journey: ['REC'] },
  { ticket: 'GOPD-019', name: 'Kehinde Alabi', joined: 22, journey: ['REC'] },
  { ticket: 'GOPD-020', name: 'Mawutin Avoseh', triage: 'PRIORITY', reason: 'PEDIATRIC', joined: 16 },
  { ticket: 'GOPD-021', name: 'Sewanu Hunsu', triage: 'EMERGENCY', joined: 9 },
  // Antenatal
  { ticket: 'ANC-003', name: 'Aisha Bello', triage: 'PRIORITY', reason: 'PREGNANT', joined: 33, called: 5, desk: 'ANC-1' },
  { ticket: 'ANC-004', name: 'Blessing Okafor', triage: 'PRIORITY', reason: 'PREGNANT', joined: 29 },
  { ticket: 'ANC-005', name: 'Halima Yusuf', triage: 'PRIORITY', reason: 'PREGNANT', joined: 21 },
  { ticket: 'ANC-006', name: 'Funmilayo Akande', triage: 'EMERGENCY', joined: 8 },
  // Pharmacy
  { ticket: 'PHM-021', name: 'Emeka Obi', joined: 19, called: 2, desk: 'PHM-1', journey: ['GOPD'] },
  { ticket: 'PHM-022', name: 'Zainab Garba', joined: 17, journey: ['GOPD'] },
  { ticket: 'PHM-023', name: 'Oluwaseun Bakare', triage: 'PRIORITY', reason: 'ELDERLY', joined: 12, journey: ['GOPD'] },
  // Laboratory / Diagnostics
  { ticket: 'LAB-008', name: 'Grace Adebayo', joined: 26, called: 4, desk: 'lab-1', journey: ['GOPD'] },
  { ticket: 'LAB-009', name: 'Ibrahim Sanni', joined: 24, journey: ['GOPD'] },
  { ticket: 'LAB-010', name: 'Tolani Zannu', joined: 14, journey: ['ANC'] },
  // Records / Card Room
  { ticket: 'REC-018', name: 'Chidera Okeke', joined: 18, called: 1, desk: 'REC-1' },
  { ticket: 'REC-019', name: 'Segun Lawson', joined: 15 },
  { ticket: 'REC-020', name: 'Mojisola Gbede', triage: 'PRIORITY', reason: 'ELDERLY', joined: 11 },
  { ticket: 'REC-021', name: 'Sejiro Dossou', joined: 8 },
];

/* Earlier visits today, used for "Served today". */
const SERVED_ROWS: [prefix: DepartmentId, from: number, to: number][] = [
  ['GOPD', 6, 13],
  ['ANC', 1, 2],
  ['PHM', 15, 20],
  ['lab', 5, 7],
  ['REC', 10, 17],
];

const FIRST_NAMES = [
  'Adebayo', 'Temitope', 'Yetunde', 'Olumide', 'Bisola', 'Chukwuemeka', 'Ngozi', 'Amaka', 'Musa',
  'Hauwa', 'Sewanu', 'Mawutin', 'Sejiro', 'Kpanou', 'Hunvi', 'Gbenga', 'Titilayo', 'Rotimi',
  'Abiodun', 'Kunle', 'Ronke', 'Femi', 'Nkechi', 'Uche', 'Hadiza', 'Usman', 'Dupe', 'Tunde',
  'Esther', 'Samuel', 'Comfort', 'Joseph', 'Victoria', 'Peter', 'Aminat', 'Rasheed',
];

const LAST_NAMES = [
  'Akinola', 'Balogun', 'Ogunbiyi', 'Adekunle', 'Oladipo', 'Okonkwo', 'Nwosu', 'Eze', 'Abubakar',
  'Ibrahim', 'Hunsu', 'Avoseh', 'Zannu', 'Gbede', 'Toyon', 'Mededji', 'Dossou', 'Kpanou',
  'Agoro', 'Akande', 'Badmus', 'Fashola', 'Olatunji', 'Salami', 'Adeyemi', 'Okafor', 'Bello',
];

export function seedState(now: number): QueueState {
  const patients: Patient[] = [];

  SERVED_ROWS.forEach(([dept, from, to], d) => {
    const deptInfo = deptById(dept);
    for (let n = from; n <= to; n++) {
      const i = patients.length;
      const joinedAgo = 150 - i * 4;
      const noShow = dept === 'GOPD' && n === 11;
      patients.push({
        id: `seed-${deptInfo.code}-${n}`,
        name: `${FIRST_NAMES[(i * 7 + d) % FIRST_NAMES.length]} ${LAST_NAMES[(i * 5 + d) % LAST_NAMES.length]}`,
        department: dept,
        ticketNo: `${deptInfo.code}-${String(n).padStart(3, '0')}`,
        triage: 'STANDARD',
        status: noShow ? 'NO_SHOW' : 'COMPLETED',
        joinedAt: now - joinedAgo * MIN,
        calledAt: now - (joinedAgo - 18) * MIN,
        finishedAt: now - (joinedAgo - 26) * MIN,
        deskId: deptInfo.desks[n % deptInfo.desks.length].id,
      });
    }
  });

  ACTIVE_ROWS.forEach((row, i) => {
    const code = row.ticket.split('-')[0];
    const dept = DEPARTMENTS.find((d) => d.code === code)?.id ?? 'GOPD';
    // Stagger by a few seconds so live timers don't all read "…m 00s"
    const jitter = ((i * 23) % 60) * 1000;
    patients.push({
      id: `seed-${row.ticket}`,
      name: row.name,
      department: dept,
      ticketNo: row.ticket,
      triage: row.triage ?? 'STANDARD',
      reason: row.reason,
      status: row.called !== undefined ? 'SERVING' : 'WAITING',
      joinedAt: now - row.joined * MIN - jitter,
      calledAt: row.called !== undefined ? now - row.called * MIN - ((i * 37) % 60) * 1000 : undefined,
      deskId: row.desk,
      journey: row.journey,
    });
  });

  return { version: 2, seededAt: now, patients };
}

/* --------------------------- Random demo patient -------------------------- */

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** Call from event handlers only: uses Math.random. */
export function randomCheckIn(): { name: string; department: DepartmentId; eligibility: EligibilityId } {
  const department = pick<DepartmentId>(['GOPD', 'GOPD', 'GOPD', 'ANC', 'PHM', 'PHM', 'lab', 'REC', 'REC']);
  const roll = Math.random();
  let eligibility: EligibilityId = 'STANDARD';
  if (department === 'ANC') eligibility = roll < 0.12 ? 'EMERGENCY' : 'PREGNANT';
  else if (roll < 0.08) eligibility = 'EMERGENCY';
  else if (roll < 0.22) eligibility = 'ELDERLY';
  else if (roll < 0.3 && department === 'GOPD') eligibility = 'PEDIATRIC';
  return { name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`, department, eligibility };
}

/* -------------------------------- Validation ------------------------------ */

const STATUSES: PatientStatus[] = ['WAITING', 'SERVING', 'COMPLETED', 'NO_SHOW'];
const TRIAGES: Triage[] = ['EMERGENCY', 'PRIORITY', 'STANDARD'];

export function isQueueState(value: unknown): value is QueueState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === 2 &&
    typeof v.seededAt === 'number' &&
    Array.isArray(v.patients) &&
    v.patients.every((item: unknown) => {
      if (typeof item !== 'object' || item === null) return false;
      const p = item as Record<string, unknown>;
      return (
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        typeof p.ticketNo === 'string' &&
        typeof p.joinedAt === 'number' &&
        isDepartmentId(p.department) &&
        STATUSES.includes(p.status as PatientStatus) &&
        TRIAGES.includes(p.triage as Triage)
      );
    })
  );
}

'use client';

import { useSyncExternalStore } from 'react';
import {
  DEPARTMENTS,
  ELIGIBILITY,
  deskById,
  isQueueState,
  nextTicketNo,
  randomCheckIn,
  seedState,
  servingAt,
  waitingList,
  type DepartmentId,
  type EligibilityId,
  type Patient,
  type QueueState,
} from './queue';

/* -------------------------------------------------------------------------- */
/* Shared queue store                                                          */
/*                                                                            */
/* One source of truth in localStorage. Every tab (/, /staff, /display)        */
/* subscribes, and `storage` events keep other tabs in step instantly.         */
/* Swap `persist`/`load` for an API call to move this to a real backend.       */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = 'qcare-badagry:queue:v2';
const LEGACY_KEYS = ['qcare_badagry_patients_v1'];

let cache: QueueState | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function sameDay(a: number, b: number): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function load(): QueueState {
  const now = Date.now();
  try {
    LEGACY_KEYS.forEach((k) => window.localStorage.removeItem(k));
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      // A queue from a previous day is stale: start the day with fresh seed data
      if (isQueueState(parsed) && sameDay(parsed.seededAt, now)) return parsed;
    }
  } catch {
    /* unreadable data falls through to a fresh seed */
  }
  const fresh = seedState(now);
  persist(fresh);
  return fresh;
}

function persist(state: QueueState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: the current tab still works */
  }
}

function read(): QueueState {
  if (!cache) cache = load();
  return cache;
}

function commit(next: QueueState) {
  cache = next;
  persist(next);
  emit();
}

function onStorage(e: StorageEvent) {
  if (e.key !== null && e.key !== STORAGE_KEY) return;
  try {
    const parsed: unknown = e.newValue ? JSON.parse(e.newValue) : null;
    cache = isQueueState(parsed) ? parsed : null;
  } catch {
    cache = null;
  }
  emit();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
}

/** Live queue state. `null` during server render and before hydration. */
export function useQueue(): QueueState | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

/* --------------------------------- Actions -------------------------------- */

function update(fn: (patients: Patient[], now: number) => Patient[]) {
  const state = read();
  commit({ ...state, patients: fn(state.patients, Date.now()) });
}

function find(id: string): Patient | undefined {
  return read().patients.find((p) => p.id === id);
}

function checkIn(input: { name: string; department: DepartmentId; eligibility: EligibilityId }): Patient {
  const option = ELIGIBILITY.find((e) => e.id === input.eligibility) ?? ELIGIBILITY[0];
  const now = Date.now();
  const patients = read().patients;
  const created: Patient = {
    id: `p-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim(),
    department: input.department,
    ticketNo: nextTicketNo(patients, input.department),
    triage: option.triage,
    reason: option.reason,
    status: 'WAITING',
    joinedAt: now,
  };
  update((list) => [...list, created]);
  return created;
}

/**
 * Calls the next patient for a desk's department. If the desk is still
 * serving someone, that visit is completed first.
 */
function callNext(deskId: string): { called?: Patient; completed?: Patient } {
  const desk = deskById(deskId);
  if (!desk) return {};
  const patients = read().patients;
  const current = servingAt(patients, deskId);
  const next = waitingList(patients, desk.department)[0];
  if (!next) return {};
  return callPatient(next.id, deskId, current);
}

function callPatient(
  id: string,
  deskId: string,
  current = servingAt(read().patients, deskId),
): { called?: Patient; completed?: Patient } {
  const desk = deskById(deskId);
  const target = find(id);
  if (!desk || !target || target.status !== 'WAITING' || target.department !== desk.department) return {};
  let called: Patient | undefined;
  let completed: Patient | undefined;
  update((list, now) =>
    list.map((p) => {
      if (current && p.id === current.id) {
        completed = { ...p, status: 'COMPLETED', finishedAt: now };
        return completed;
      }
      if (p.id === id) {
        called = { ...p, status: 'SERVING', calledAt: now, deskId };
        return called;
      }
      return p;
    }),
  );
  return { called, completed };
}

function finish(id: string, status: 'COMPLETED' | 'NO_SHOW'): Patient | undefined {
  const target = find(id);
  if (!target || target.status !== 'SERVING') return undefined;
  update((list, now) => list.map((p) => (p.id === id ? { ...p, status, finishedAt: now } : p)));
  return target;
}

/** Re-announces the patient on the TV display. */
function recall(id: string): Patient | undefined {
  const target = find(id);
  if (!target || target.status !== 'SERVING') return undefined;
  update((list, now) => list.map((p) => (p.id === id ? { ...p, calledAt: now } : p)));
  return target;
}

/** Same record moves to another department with a new ticket. Triage is kept. */
function transfer(id: string, to: DepartmentId): Patient | undefined {
  const target = find(id);
  if (!target || target.department === to) return undefined;
  const moved: Patient = {
    ...target,
    department: to,
    ticketNo: nextTicketNo(read().patients, to),
    status: 'WAITING',
    joinedAt: Date.now(),
    calledAt: undefined,
    deskId: undefined,
    finishedAt: undefined,
    journey: [...(target.journey ?? []), target.department],
  };
  update((list) => list.map((p) => (p.id === id ? moved : p)));
  return moved;
}

/* ------------------------------ Demo actions ------------------------------ */

function addRandomPatient(): Patient {
  return checkIn(randomCheckIn());
}

/** Picks a department with people waiting and calls its next patient to a desk. */
function simulateNext(): Patient | undefined {
  const patients = read().patients;
  const candidates = DEPARTMENTS.filter((d) => waitingList(patients, d.id).length > 0);
  if (candidates.length === 0) return undefined;
  const dept = candidates[Math.floor(Math.random() * candidates.length)];
  const free = dept.desks.find((d) => !servingAt(patients, d.id));
  // No free desk: the desk that has been busy longest finishes and calls next
  const desk =
    free ??
    [...dept.desks].sort(
      (a, b) => (servingAt(patients, a.id)?.calledAt ?? 0) - (servingAt(patients, b.id)?.calledAt ?? 0),
    )[0];
  return callNext(desk.id).called;
}

function resetQueue() {
  commit(seedState(Date.now()));
}

export const queueActions = {
  checkIn,
  callNext,
  callPatient: (id: string, deskId: string) => callPatient(id, deskId),
  complete: (id: string) => finish(id, 'COMPLETED'),
  noShow: (id: string) => finish(id, 'NO_SHOW'),
  recall,
  transfer,
  addRandomPatient,
  simulateNext,
  resetQueue,
};

'use client';

import { spellTicket } from './queue';

/* -------------------------------------------------------------------------- */
/* Call announcements: a two-tone chime plus speech, using only browser APIs. */
/* Browsers block audio until the page has had one click or key press.        */
/* -------------------------------------------------------------------------- */

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

/** Call from a user gesture. Resolves true when sound can play. */
export async function unlockAudio(): Promise<boolean> {
  try {
    const c = audioContext();
    if (!c) return false;
    if (c.state === 'suspended') await c.resume();
    return c.state === 'running';
  } catch {
    return false;
  }
}

export function audioReady(): boolean {
  return ctx?.state === 'running';
}

export function playChime() {
  try {
    const c = audioContext();
    if (!c || c.state !== 'running') return;
    [880, 659.25].forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      const start = c.currentTime + i * 0.35;
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(start);
      osc.stop(start + 0.65);
    });
  } catch {
    /* audio is optional */
  }
}

/**
 * The spoken call. A device with a Yoruba voice reads the written Ogu (Egun) /
 * Yoruba greeting; other voices read a phonetic version so it still sounds right.
 * Names are never read out in the waiting room, only ticket and desk.
 */
export function buildCallText(ticketNo: string, deskLabel: string) {
  return {
    display: `Mì kú àbọ̀ / Ẹ káàbọ̀! Ticket ${ticketNo}. Ó ti kan yín báyìí. Please proceed to ${deskLabel}.`,
    spoken: `Mee koo ah-boh. Eh kah-ah-boh! Ticket ${spellTicket(ticketNo)}. Oh tee kahn yeen bah-yee. Please proceed to ${deskLabel}.`,
  };
}

export function announceCall(ticketNo: string, deskLabel: string) {
  playChime();
  if (!('speechSynthesis' in window)) return;
  const text = buildCallText(ticketNo, deskLabel);
  window.setTimeout(() => {
    window.speechSynthesis.cancel();
    const yoruba = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang.toLowerCase().startsWith('yo'));
    const utterance = new SpeechSynthesisUtterance(yoruba ? text.display : text.spoken);
    if (yoruba) {
      utterance.voice = yoruba;
      utterance.lang = yoruba.lang;
    }
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  }, 900);
}

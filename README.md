# Q-Care Badagry

> **Submission for the Badagry Builder Challenge 2026**
> *Track: Health & Community Infrastructure*

## Overview

**Q-Care Badagry** is a real-time patient queue management system built for **Badagry General Hospital**. It replaces crowded, unpredictable waiting areas with three synchronized views--a mobile-first patient check-in portal, a clinical staff workspace, and a high-contrast waiting room TV display.

---

## Core Functionality

- **Real-Time Live Timers:** A single centralized 1-second clock (`useNow`) drives a live `HH:MM:SS` header clock, per-patient elapsed wait times (`Xm Ys`), live estimated wait countdowns, and average wait KPIs across all three views.
- **Department-Specific Queues & Ticket Prefixes:** Dedicated queues and desks for **GOPD** (`GOPD-`), **Antenatal Clinic** (`ANC-`), **Pharmacy** (`PHM-`), **Laboratory / Diagnostics** (`LAB-`), and **Records / Card Room** (`REC-`).
- **Automated Triage Ordering:** Patients are automatically prioritized in the queue by clinical urgency—**Emergency** > **Priority** (*Elderly 65+*, *Pregnant*, *Child under 5*) > **Standard**—and by arrival time within each tier.
- **Multi-Tab Live Synchronization:** Queue state is persisted in `localStorage` and synchronized across open tabs (`/`, `/staff`, `/display`) in real time via `storage` events.
- **Audio & Multilingual Voice Announcements:** When a patient is called or recalled, the waiting room TV plays a two-tone chime and speaks the ticket number and room in **Ogu (Egun)**, **Yoruba**, and **English** (using Web Audio and Speech Synthesis, with a phonetic fallback when no Yoruba voice is installed). The patient's own phone also chimes and vibrates when their ticket is called.
- **Multi-Stage Patient Transfers:** Staff can transfer an active patient to another department (e.g., from *GOPD* to *Pharmacy*). The patient receives a new department ticket code while retaining their triage priority and visit journey history.
- **Clinical Light & Dark Mode:** Toggleable light/dark theme in the header of `/` and `/staff` (persisted in `localStorage`, defaulting to system preference). `/display` is permanently locked to high-contrast dark mode for glare-free waiting room viewing.

---

## User Guide

### 1. Patient Check-In & Live Ticket (`/`)

**Checking in for a new visit:**
1. Enter your **Full name**.
2. Select the **Department** you are visiting (each row shows how many patients are currently waiting).
3. Choose your **Priority eligibility** (*Standard*, *Elderly*, *Pregnant*, *Child*, or *Emergency*).
4. Review the live preview of your ticket number and estimated wait, then tap **Check In**.

**Tracking your ticket:**
- Your screen turns into a live **boarding pass** showing your ticket code (e.g., `GOPD-022`), department, queue position, live **Estimated wait** countdown, and live **Waiting** duration.
- Keep the tab open—when a clinician calls your number, the card highlights your assigned room/desk and plays a chime.
- If you already have a ticket number from the desk, enter it in the **Already have a ticket?** box at the bottom of the check-in page and tap **Track**.

### 2. Staff Clinical Workspace (`/staff`)

Access `/staff` via the **Staff portal** link in the footer of `/` (or navigate directly to `/staff`).

1. **Select your Desk:** In the **Currently serving** bar, choose the consulting room, dispensing window, or counter you are staffing from the **Desk** dropdown.
2. **Filter the Queue:** Use the department pills at the top (*All departments*, *GOPD*, *Antenatal*, *Pharmacy*, *Laboratory*, *Records*) to focus on one queue or monitor the whole hospital. Selecting a single department automatically switches your desk to that department.
3. **Monitor KPIs:** The four equal-height KPI cards show live **Waiting** count (with emergency/priority breakdown), **Avg Wait** (`Xm Ys`), **Served Today** (with no-show count), and **Active Desks**.
4. **Call Patients:**
   - Click **Call Next** (or **Complete & Call Next** if someone is currently at your desk) to call the highest-priority waiting patient in your department.
   - You can also click **Call** on any individual patient row belonging to your active department.
5. **Manage the Active Visit:** In the **Currently serving** bar, use:
   - **Recall** to re-announce the patient on the waiting room TV.
   - **Transfer…** to move the patient to another department (issues a new ticket there).
   - **No-Show** if the patient does not arrive at the desk.
   - **Complete** to mark the visit finished.
6. **Launch the TV Display:** Click **Open TV Display ↗** in the top-right header to open `/display` in a new browser tab.

### 3. Waiting Room TV Display (`/display`)

1. Open `/display` on a waiting room monitor (or in a separate tab alongside `/staff`) and press `F11` for browser fullscreen.
2. **Enable Audio:** Click anywhere on the `/display` page once so the browser allows chime and voice announcements (the bottom-right indicator switches from *Click to enable sound* to the active speaker icon).
3. **Reading the Board:**
   - **Now Serving / Now Calling:** Shows the most recently called ticket, its department, and the exact room/desk to proceed to.
   - **Also Serving:** Shows up to four other desks currently seeing patients.
   - **Up Next:** Lists the next six queued tickets in calling order.

### 4. Demo Tools (Testing & Walkthroughs)

For demonstrations and testing, click the **Demo Tools** button in the bottom-right corner of `/` or `/staff` (closed by default) to:
- **Add random patient:** Checks in a sample patient with realistic Nigerian names and triage priority.
- **Simulate next call:** Calls the next waiting patient in a random active department to a desk.
- **Reset queue:** Restores the queue to the initial realistic seed data.

---

## Departments & Triage

| Department | Ticket prefix | Desks |
|---|---|---|
| General Out-Patient (GOPD) | `GOPD-014` | Consulting Rooms 1–3 |
| Antenatal Clinic | `ANC-003` | ANC Rooms 1–2 |
| Pharmacy | `PHM-021` | Dispensing Windows 1–2 |
| Laboratory / Diagnostics | `LAB-008` | Lab Windows 1–2 |
| Records / Card Room | `REC-019` | Card Counters 1–2 |

1. **Emergency** (Red)
2. **Priority** — Elderly (65+), Pregnant, or Child under 5 (Amber)
3. **Standard** (Neutral Slate)

---

## Architecture & Tech Stack

```
src/app/
  page.tsx               /         Patient check-in and live boarding-pass ticket
  staff/page.tsx         /staff    Staff clinical workspace
  display/page.tsx       /display  Waiting room TV departure board
  _components/           Views, header/footer, theme toggle, demo tools, UI primitives
  _lib/queue.ts          Departments, desks, triage ordering, time formatting, seed data
  _lib/store.ts          Shared localStorage queue store and actions
  _lib/client-state.ts   Centralized 1s clock (useNow) and persisted-value hooks
  _lib/audio.ts          Web Audio chime and Ogu/Yoruba/English speech synthesis
  _lib/theme.ts          Pre-paint theme script and toggle helpers
```

- **Stack:** Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS v4, Lucide icons, Inter & JetBrains Mono (`tabular-nums`).
- **Prototype Scope:** All patient records are sample data stored locally in the browser (`localStorage`). To connect a multi-device backend, replace `load` and `persist` in `src/app/_lib/store.ts` with API calls.

## Local Development

```bash
git clone https://github.com/davidorusjr/qcare-badagry.git
cd qcare-badagry
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then open `/staff` and `/display` in separate tabs to see live cross-tab updates.

## Author

Built by David Orus Jr

# Q-Care Badagry

> **Badagry Builder Challenge 2026** · *Health & Community Infrastructure*

**Q-Care Badagry** is a patient queue management web app for **Badagry General Hospital**. It replaces crowded, uncertain waiting rooms with a live, transparent queue across three screens: a patient check-in portal, a staff workspace, and a waiting room TV display.

---

## How It Works

### 1. Patient Portal (`/`)
Patients check in on their phone by entering their name, choosing a department, and selecting any priority need (*Elderly*, *Pregnant*, *Child*, or *Emergency*).
- Issues a department ticket (e.g., `GOPD-022`, `ANC-007`, `LAB-009`).
- Shows a live digital ticket with queue position, estimated wait countdown, and time spent waiting.
- Chimes and vibrates when the patient's ticket is called, showing the exact room or window to go to.
- Patients who already have a ticket can look it up by number.

### 2. Staff Workspace (`/staff`)
Hospital staff manage the queue from a single screen:
- **Pick a Desk & Filter:** Choose an active consulting room, window, or counter, filter by department, or search by ticket number or name.
- **Call Next:** One click calls the highest-priority waiting patient for that desk's department.
- **Manage Active Visits:** From the *Currently Serving* bar, staff can **Recall** a patient, **Transfer** them to another department (for example, *GOPD → Laboratory → Pharmacy*), mark a **No-Show**, or **Complete** the visit.
- **Live Summary:** Four counters track *Waiting*, *Avg Wait*, *Served Today*, and *Active Desks*.

### 3. Waiting Room TV (`/display`)
A full-screen dark display for the hospital waiting area:
- Shows the **Now Serving** ticket number, department, and room/desk, alongside other active desks and the **Up Next** list.
- Plays a chime and speaks the call in **Ogu (Egun)**, **Yoruba**, and **English** (click the screen once to enable browser audio).

---

## Key Features

- **Triage Priority Ordering:** Queues sort automatically by **Emergency** → **Priority** (*Elderly 65+*, *Pregnant*, *Child under 5*) → **Standard**, then by arrival time.
- **Five Hospital Departments:**
  - **General Out-Patient (GOPD)** — `GOPD-` (Consulting Rooms 1–3)
  - **Antenatal Clinic** — `ANC-` (ANC Rooms 1–2)
  - **Pharmacy** — `PHM-` (Dispensing Windows 1–2)
  - **Laboratory / Diagnostics** — `LAB-` (Lab Windows 1–2)
  - **Records / Card Room** — `REC-` (Card Counters 1–2)
- **Live Cross-Tab Sync:** All clocks and wait times tick live every second, and actions on `/`, `/staff`, and `/display` sync immediately across browser tabs.
- **Built-In Demo Tools:** A collapsible **Demo Tools** drawer in the bottom-right corner lets you add a random patient, simulate the next call, or reset the sample data at any time.

---

## Running Locally

```bash
git clone https://github.com/davidorusjr/qcare-badagry.git
cd qcare-badagry
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the patient view, and open `/staff` and `/display` in separate tabs to test the full workflow.

---

Built by **David Orus Jr** for the Badagry Builder Challenge 2026.

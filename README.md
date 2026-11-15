#  Q-Care Badagry

> **Submission for the Badagry Builder Challenge 2026**  
> *Track: Health & Community Infrastructure*



## Overview

**Q-Care Badagry** is a zero-friction, multi-channel queue orchestration system built for public healthcare facilities in Badagry Division, such as Badagry General Hospital and local Primary Health Centres (PHCs).

It eliminates 5-hour physical waiting room queues by enabling records clerks to register patients in under 10 seconds and dispatch dynamic queue alerts directly to patients via SMS, WhatsApp, and localized Yoruba/Egun voice drops.

---

## Key Features

* **Record Intake Portal (Clerk View):** Requires only Name, Phone Number, and Department select—logging patients in under 10 seconds.
* **One-Click Doctor/Nurse Console:** Doctors push a single `[CALL NEXT PATIENT]` button to update line status dynamically.
* **Multi-Channel SMS & Voice Simulation:** Sends automated SMS updates via Termii API and previews Yoruba voice drop alerts for elderly/non-literate patients.
* **Lobby TV Waiting Room Monitor:** Real-time broadcast screen for hospital waiting sheds, allowing patients without mobile phones to track their turns.
* **Priority Triage Override:** Automatic triage priority handling for urgent clinical cases.

---

## Tech Stack

* **Framework:** Next.js 14 (App Router)
* **Language:** TypeScript (`.tsx`)
* **Styling:** Tailwind CSS
* **Icons:** Lucide React
* **Deployment:** Vercel

---

## Local Development Setup

To run this project locally on your machine:

```bash
# 1. Clone the repository
git clone [https://github.com/davidorusjr/qcare-badagry.git](https://github.com/YOUR_GITHUB_USERNAME/qcare-badagry.git)

# 2. Navigate into the directory
cd qcare-badagry

# 3. Install dependencies
npm install

# 4. Run the development server
npm run dev

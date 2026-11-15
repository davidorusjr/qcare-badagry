# Q-Care Badagry

> **Submission for the Badagry Builder Challenge 2026**
> *Track: Health & Community Infrastructure*

## Overview

**Q-Care Badagry** is a queue orchestration system designed for public healthcare facilities in Badagry Division, such as Badagry General Hospital and local Primary Health Centres (PHCs).

Patients in many public facilities wait for hours in crowded rooms because nobody can tell them when their turn will come. Q-Care Badagry gives every person in the hospital a clear, shared view of the queue. Records clerks register a patient with three fields. Clinicians call the next patient with one button. The patient is alerted by SMS and a spoken Yoruba/Egun voice message, and can check their live position from a phone or on the waiting room TV.

This is a working MVP. The **Prototype scope** section below states plainly what is real and what is simulated.

---

## Demo roles

The app has a **Demo Role Switcher** at the top, so you can move between the four people who use the system without logging in.

| Role | Who it is for | What they do |
|---|---|---|
| **Records Intake** | Registration clerk | Registers a patient (name, phone, department) and issues a ticket. Sees the live queue, filtered by department. |
| **Clinician Console** | Triage nurse, doctor, lab and pharmacy staff | Calls the next patient, re-alerts slow walkers, sends patients to the room, transfers them to another department or discharges them. |
| **Lobby TV Display** | Waiting room screen | Shows "Now serving" and "Next" for every department, with a live clock, a test chime and a fullscreen mode. |
| **Patient Live Check** | Patient or visitor on a phone | Enter a ticket number such as `OPD-015` to see queue position, a wait countdown, journey stage and room. |

---

## Key features

* **Fast registration:** only name, phone number and department are required. A live ticket stub shows the ticket number, queue position and estimated wait before the clerk issues it. Phone numbers are validated as Nigerian mobile numbers.
* **Emergency priority:** an emergency switch moves a patient to the front of their department's queue. Pharmacy and Laboratory do not take emergencies, so the switch is disabled there and emergencies are directed to Triage.
* **One-button calling:** **Call next patient** moves the first person in line to *Alerted* and opens the SMS preview. Emergencies are always called first.
* **Multi-stage patient journeys:** a patient can be transferred from Triage to OPD, Lab, Pharmacy or any other department. The same record moves, receives a new department ticket and keeps a history of the stops already made.
* **Hold and recall:** alerted patients can be re-alerted by SMS, then moved into the room with **Enter Room**.
* **SMS and voice alert preview:** a phone mock-up shows the text the patient would receive. A voice drop preview plays the greeting in Ogu (Egun) and Yoruba, with English, for patients who cannot read or prefer to listen.
* **Live hospital summary:** four cards show people waiting, urgent cases, patients in consultation and the average estimated wait.
* **Department queues:** OPD, Triage, Antenatal, Paediatrics, Laboratory and Pharmacy each keep their own queue and position numbering.
* **Saved in the browser:** data persists across refreshes. A **Reset demo** button restores the sample data.
* **Mobile first:** tables become cards on phones, tap targets are at least 44px, and form inputs use 16px text so iPhones do not zoom in.

### How the wait estimate works

Estimated wait is **queue position × 8 minutes**, calculated per department. Position 1 is about 8 minutes and position 3 is about 24 minutes. Estimates update whenever the queue changes.

### Departments

| Department | Ticket prefix | Room | Takes emergencies |
|---|---|---|---|
| OPD (General Outpatient) | `OPD` | Room 3 | Yes |
| Triage | `TRI` | Bay 1 | Yes |
| Antenatal | `ANC` | Room 5 | Yes |
| Paediatrics (Children) | `PAE` | Room 4 | Yes |
| Laboratory | `LAB` | Sample Room | No |
| Pharmacy | `PHA` | Counter 1 | No |

---

## Prototype scope: what is real and what is simulated

**Working in this MVP**

* Registration, ticket numbering, queue ordering, wait estimates and emergency priority.
* Calling, re-alerting, entering the room, transfers between departments and discharge.
* All four role views, which update from the same live data.
* Saving the queue in the browser (`localStorage`), and syncing it between browser tabs.
* Voice playback using the browser's built-in speech. If the device has no Yoruba voice, a phonetic version is read with the default voice.

**Simulated in this MVP**

* **SMS:** the message is shown in a phone mock-up. No text is actually sent. The production design sends it through the Termii API from a server route, so the API key never reaches the browser.
* **WhatsApp:** the phone field is labelled WhatsApp / phone number, but WhatsApp messages are not sent yet.
* **Lobby TV:** it is a display view inside the app. A second browser tab in the same browser stays in sync, but it does not yet reach other devices.
* **Data:** all patients are sample data. Nothing is sent to a server, and no real patient information is stored.

**Roadmap to production**

1. A database (for example Postgres) so queues are shared across devices and facilities.
2. A server route that sends SMS through Termii, with delivery status.
3. WhatsApp Business messaging.
4. A dedicated `/lobby` page that a waiting room TV can open on its own.
5. Staff login and role permissions, replacing the demo role switcher.
6. Voice recordings by native Ogu (Egun) and Yoruba speakers. The current wording should be reviewed by native speakers before real use.

---

## Tech stack

* **Framework:** Next.js (App Router)
* **UI library:** React 19
* **Language:** TypeScript (`.tsx`)
* **Styling:** Tailwind CSS v4
* **Icons:** Lucide React (the only dependency beyond the framework)
* **Deployment:** Vercel

The whole interface is in one file, `src/app/page.tsx`. Sounds and voice use the browser's own Web Audio and Speech Synthesis, with no extra libraries.

---

## Local development setup

```bash
# 1. Clone the repository
git clone https://github.com/davidorusjr/qcare-badagry.git

# 2. Move into the project folder
cd qcare-badagry

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

The logo is loaded from `public/qcare-logo.png`. Replace that file to change it.

---

## Suggested walkthrough

1. **Records Intake:** register a patient. Try the emergency switch, then pick Pharmacy to see it lock. Watch the ticket stub update before you press **Issue ticket**.
2. **Clinician Console:** open OPD and press **Call next patient**. The emergency case is called first. Read the SMS on the phone mock-up and press **Play Yoruba/Egun Voice Drop Alert**.
3. **Hold and recall:** press **Re-alert / SMS**, then **Enter Room**.
4. **Transfer:** with the patient in the room, choose **Transfer to...** and send them to Lab. They rejoin the queue there with a new ticket and a journey badge.
5. **Lobby TV Display:** see "Now serving" change. Try **Fullscreen preview** and **Test chime and voice**. For a two-screen demo, open the app in a second tab and show this view there.
6. **Patient Live Check:** enter `OPD-015` and watch the position and countdown.
7. Press **Reset demo** in the header to start again.

---

## Accessibility

Keyboard focus is managed in dialogs (focus moves in, Escape closes, focus returns). Live regions announce queue changes. Controls are labelled, status is never shown by colour alone, and animations respect the reduced motion setting.

---

## Author

Built by David Orus Jr for the Badagry Builder Challenge 2026.

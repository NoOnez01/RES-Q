# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Four distinct roles, each with a role-scoped view of the same shared case record (enforced by Supabase RLS):

- **ประชาชน (public/citizens)** — people reporting or witnessing a medical emergency, usually on a phone, sometimes under acute stress or reporting on behalf of someone else (elderly relatives, bystanders). Mostly first-time/occasional users with no account required (anonymous session by default; email/Google/LINE login optional for tracking history).
- **ศูนย์ 1669 (dispatch center staff)** — professional emergency dispatchers on desktop, in an operations-center setting. Receive incoming reports, assess severity (including GCS), and find/assign the right rescue team.
- **หน่วยกู้ชีพ (rescue team members)** — field ambulance crews, primarily on mobile, often in a moving vehicle. Accept assignments, pick a vehicle by capability tier + crew size, record patient vitals/first aid en route, hand off to hospital.
- **โรงพยาบาล (hospital staff)** — receive incoming patient handoff information and confirm reception.

An admin role can view any of the four dashboards for oversight/support.

## Product Purpose

ResQ coordinates the full emergency-medical response chain — citizen report → 1669 dispatch → rescue assignment and response → hospital handoff — with case status and timeline synced in real time across every party. Success means each stakeholder always has the correct current information without phoning another party to check, and every case has a complete, auditable timeline from first contact to resolution.

**Confirmed status:** this is a prototype/demo for demonstration and research, not a production emergency-dispatch system — matches the app's own existing disclaimer ("ระบบนี้เป็นต้นแบบสำหรับการสาธิตและการวิจัย ไม่ทดแทนการประเมินทางการแพทย์"). Design should read as credible and polished, but does not need real regulatory/compliance hardening, and must never fabricate real certifications, hospital partnerships, or clinical claims.

## Positioning

Unlike a generic CAD/dispatch tool or a plain group chat, ResQ is role-scoped end-to-end: every stakeholder sees exactly the case information relevant to their job (not everyone's cases), on one shared real-time record, with structured medical triage built in (severity levels, GCS scoring, vehicle-capability-tier matching for rescue assignment) — and a citizen-facing channel that needs no app install (LINE Official Account bot handles full incident reporting via chat, alongside the web app).

## Operating Context

- Citizens: mostly mobile, sometimes on a poor connection, sometimes visibly distressed — the report flow must stay usable under those conditions.
- Dispatch/hospital staff: desktop, operations-center setting, monitoring multiple concurrent cases.
- Rescue teams: mobile, in the field, often in a moving vehicle.
- LINE is a primary channel for the Thai market: LINE Login (account linking) and a LINE OA bot (incident reporting + Flex Message status push) run alongside the web app, sharing one underlying case record.
- Live video calling (LiveKit, one room per case, tokens minted by the `livekit-token` Edge Function) connects a citizen and a dispatcher for real-time triage; the dispatcher can pull the assigned rescue crew into the same call so it becomes three-way. Calls run full screen like a phone call app (src/components/call/): the other person fills the screen, everyone else (you included) floats as small draggable frames in a corner; tapping one puts it on the big screen; a flip button switches front/back camera (or steps through a computer's cameras), round controls fade while watching, and minimizing leaves a floating tile over the page. A rescue team calling a citizen rings full screen from anywhere in the app; staff get an incoming-call popup showing what is known about the case (caller and number, incident, place, photos, how long it has rung, how many others wait) -- a small banner instead while already on a call -- and 1669 lands on the case detail when a call ends. 1669's side of the call is held app-wide (DispatchCallHost): answering opens the case, and on a wide screen (1024 px and up) the call docks on the left with the case page beside it on the right, so the dispatcher assesses and assigns while talking; the call can go full screen or down to a floating tile and back. On a phone the call is full screen and "รายละเอียดเหตุ" shrinks it to its tile over the case. A call to 1669 rings until 1669 answers or the caller cancels -- no timeout; the caller re-stamps the ring every 15 s so dispatch keeps ringing, and a caller who left stops ringing within a minute. Rescue calling a reporter still gives up after 45 s. A citizen joins the room only after answering. Everyone on a call has a hang-up button ("ยกเลิกการโทร" while it rings, "วางสาย" once connected); hanging up ends the call for both sides. The caller treats the other side joining the room as the call being answered, so a late or lost sync update can't leave it ringing mid-conversation; each call screen counts the call's time on its own clock, and the caller keeps the synced length. Sounds (src/lib/sounds.ts) are synthesized: an incoming-call ring, a softer ringback for the caller, per-severity case alarms, a distinct alert when a rescue team declines a case, and a paging chime for hospitals. Alerts repeat until acknowledged, and leave by themselves once their reason has passed (the team accepted, someone else reassigned). A rescue team gets a popup and alarm when a case is assigned to it -- again if it comes back to them later -- and when it is called in as the supporting team. Alerts follow the role on screen, so an admin viewing the rescue, 1669 or hospital screens gets that role's alerts, for every team or hospital. Every press gets a tap sound; success, error and warning each have their own sound; Settings can switch interface sounds off and preview every sound. When a rescue team re-assesses the severity at the scene, 1669 gets a popup wherever they are, showing the current and proposed level and the crew's note, to approve or decline on the spot. Approving a more serious level takes them to the case, offering a higher-level unit. Choosing a hospital, the rescue crew sees each hospital's risk for this patient (src/lib/hospitalRisk.ts), judged from two things only: the triage level and the travel time from the scene (a real road route where the router has one). Each level has a window, how soon it should see a doctor per the Canadian Triage and Acuity Scale that MOPH ED Triage is built on (level 2: 15 min, 3: 30, 4: 60, 5: 120; level 1 "immediately" uses 10 min): arriving within it is low risk, within twice it moderate, longer high. The ER's status and free beds are shown as information but don't change the level; the recommended hospital is the quickest to reach with its ER open. Picking one shows a briefing to read to the family, comparing it with the recommended hospital (minutes longer, a full ER); the family choosing against the recommendation signs for it, and the risk it was decided on is kept with the decision and shown on the rescue, 1669 and receiving hospital's case pages. It supports the crew's judgement, it doesn't replace it. The home page's contact section links the team's LINE Official (@resq) and Facebook page (Res-q Prc). A form with required information missing plays the error sound and jumps to the first missing field. 1669 is shown the 5 best-placed rescue teams (available first, then nearest; a team picked from a search stays listed) and finds any other by typing words matching its name, area, phone, unit code, vehicle level or equipment. Case sync keeps whichever copy has the later updatedAt; a change is always stamped later than the version it changed (devices' clocks differ), and a device that keeps its newer copy over an incoming one writes it back so everyone converges.
- Thai is the sole UI language throughout; no English-language screens exist today.

## Capabilities and Constraints

- Role-based data access via Supabase RLS: dispatch/admin see all cases; rescue/hospital see only cases assigned to their own org; public sees only their own report.
- Case status pipeline (contacted → photos-taken → called-1669 → received → finding-rescue → rescue-assigned → rescue-en-route → rescue-arrived → assisted → transporting → hospital-arrived → hospital-received → completed), each transition timestamped in a per-case timeline.
- Vehicle capability tiers (BLS/ALS/CLS, CLS highest) drive rescue-team matching and mid-case escalation to a higher-tier support unit.
- Glasgow Coma Scale scoring alongside AVPU responsiveness in the on-scene assessment.
- Signature capture required when a family declines transport or declines the nearest hospital, for severity 1–2 cases.
- Account linking: a single profile can carry email/password, Google, and/or LINE as interchangeable sign-in methods.
- Coin system (supabase-coin-system.sql): a citizen earns an admin-set number of coins when staff complete a case they reported, then redeems them for rewards or donates them to partner foundations. Admins manage coins per case, foundations, rewards, and redemption requests (/manage-coins). Balances are a server-written ledger — clients can't award or spend coins except through the database functions.
- Routing: inside Chiang Mai the app runs its own D* Lite search (src/lib/pathfinding/, in a Web Worker; incremental: the search for a trip is kept and repaired when the vehicle moves on, a road is closed or reopened, or a traffic reading changes a few roads, instead of starting over) over an OpenStreetMap road graph (scripts/build-road-graph.mjs), with road travel times weighted by Longdo traffic speeds (real-time where Longdo has probe data, otherwise its time-of-day prediction), looked up lazily for the main roads a candidate route uses. The search is turn-aware: it obeys OSM turn restrictions, never U-turns mid-road, won't pass blocking barriers, and charges time for turns and traffic lights. Elsewhere, or if that fails, Longdo's route service, then OSRM. The ETA badge names the source and whether the traffic data was live, predicted, or estimated.
- Road closures (supabase-road-closures.sql): a rescue unit reports a road it can't get through from the navigation screen (at its current position, with a reason; expires after 6 hours). Every open route re-plans around it at once; dispatch sees active closures on its dashboard and marks them reopened. Rescue/dispatch/admin can report; dispatch/admin or the reporter can clear.
- Not modelled: emergency-vehicle privileges (running red lights, driving against traffic), and live traffic for small roads — Longdo covers main roads only.
- Known constraint: the free Longdo key is rate-limited (a burst of ~80 traffic lookups triggers "Too many requests"); A* caps lookups per route, shares them for 10 minutes, and pauses lookups after a rate-limit reply, routing on the congestion measured so far.
- Known technical constraint: the production JS bundle exceeds the default 500kB chunk-size warning (not yet code-split); not currently a functional issue.

## Brand Commitments

- Name **"ResQ"** and the existing logo/favicon mark are fixed — not open to change in this redesign.
- Existing color system is the fixed anchor: primary blue `#0B6EBD`/`#1479C9` (brand/trust), navy `#12304A` (text), emergency red `#D92D20`/`#B42318` (urgent/danger — reserved for genuinely urgent meaning, never decorative), success green `#12B76A`, warning orange `#F79009`, moderate yellow `#F5C542`, muted gray `#667085`.
- Thai-language voice and terminology throughout; keep existing role/status terminology consistent (e.g. "ศูนย์ 1669", "หน่วยกู้ชีพ") rather than introducing new synonyms.

## Evidence on Hand

- Full existing implementation across all four role dashboards plus public-facing flows — the only visual/product evidence available. No user research, testimonials, case studies, or press exist; do not fabricate any.
- No real photographic assets exist beyond SVG favicons — do not introduce stock photography of real injuries/patients; medical/privacy sensitivity plus the "no fabricated evidence" rule both argue for icon/illustration-based imagery instead.

## Product Principles

1. Every screen shows only what that role needs in order to act next — no cross-role information leaking into a view that doesn't need it.
2. Speed and clarity under stress outrank decorative complexity, especially on citizen-facing and rescue-in-the-field screens.
3. Status and information must always read as synchronized in real time across roles — no screen should ever look stale or contradict another party's view of the same case.
4. The prototype should read as credible and polished without overstating real-world readiness — never imply certification, hospital partnership, or clinical validation it doesn't have.
5. Thai-first content: never mix English and Thai labeling for the same concept.

## Accessibility & Inclusion

Used by people who may be under acute stress or have limited digital literacy (e.g. an elderly citizen reporting on behalf of a family member) on a phone, sometimes on a poor connection. No specific compliance standard (e.g. WCAG level) has been mandated; treat good general accessibility practice (contrast, touch targets, keyboard/focus support) as the working bar rather than inventing a formal requirement.

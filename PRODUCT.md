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
- Live video calling (WebRTC, Supabase Realtime signaling, Cloudflare Calls TURN fallback) connects a citizen and a dispatcher for real-time triage.
- Thai is the sole UI language throughout; no English-language screens exist today.

## Capabilities and Constraints

- Role-based data access via Supabase RLS: dispatch/admin see all cases; rescue/hospital see only cases assigned to their own org; public sees only their own report.
- Case status pipeline (contacted → photos-taken → called-1669 → received → finding-rescue → rescue-assigned → rescue-en-route → rescue-arrived → assisted → transporting → hospital-arrived → hospital-received → completed), each transition timestamped in a per-case timeline.
- Vehicle capability tiers (BLS/ALS/CLS, CLS highest) drive rescue-team matching and mid-case escalation to a higher-tier support unit.
- Glasgow Coma Scale scoring alongside AVPU responsiveness in the on-scene assessment.
- Signature capture required when a family declines transport or declines the nearest hospital, for severity 1–2 cases.
- Account linking: a single profile can carry email/password, Google, and/or LINE as interchangeable sign-in methods.
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

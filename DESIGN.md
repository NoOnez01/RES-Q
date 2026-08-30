---
name: ResQ
description: Real-time emergency-medical dispatch coordination for citizens, 1669 dispatch, rescue teams, and hospitals
colors:
  primary: "#0B6EBD"
  primary-bright: "#1479C9"
  navy: "#12304A"
  skyblue-light: "#EAF6FF"
  skyblue-pale: "#F4FAFE"
  bg: "#F6FAFD"
  border: "#D9E7F2"
  muted: "#667085"
  emergency: "#D92D20"
  emergency-dark: "#B42318"
  warning: "#F79009"
  moderate: "#F5C542"
  success: "#12B76A"
typography:
  body:
    fontFamily: "'Noto Sans Thai', 'Noto Sans', system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Noto Sans Thai', 'Noto Sans', system-ui, sans-serif"
    fontWeight: 600
rounded:
  md: "0.75rem"
  lg: "1rem"
  xl2: "1.25rem"
  xl3: "1.75rem"
  full: "9999px"
spacing:
  sm: "0.75rem"
  md: "1.25rem"
  lg: "2rem"
  xl: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.xl2}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-bright}"
  button-danger:
    backgroundColor: "{colors.emergency}"
    textColor: "#FFFFFF"
    rounded: "{rounded.xl2}"
    padding: "10px 20px"
  button-outline:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.navy}"
    rounded: "{rounded.xl2}"
  card:
    backgroundColor: "#FFFFFF"
    rounded: "{rounded.xl3}"
    padding: "20px"
---

# Design System: ResQ

## Overview

**Creative North Star: "The Calm Command Center"**

ResQ coordinates four different people's worst day — a citizen reporting an emergency, a 1669 dispatcher triaging it, a rescue crew racing to it, a hospital preparing for it — and the interface's job is to make all four feel like the situation is under control. The system stays visually calm by default: soft sky-blue washes, generous rounded corners, quiet card surfaces, and gentle fade/float motion. Composure is the resting state, not blandness — depth comes from soft layered shadows and a living animated background (heartbeat lines, orbiting connection rings, drifting particles) rather than from loud color or harsh edges.

Urgency is then reserved entirely for the emergency red (`#D92D20`) and its glow/pulse treatments: the one accent that is allowed to visually shout, deployed only where something genuinely is urgent (the citizen's call-for-help action, a critical-severity case, a hospital-refusal signature gate). Everything else — including "success," "in progress," and informational states — stays in the calm blue/green/amber register. The system never uses decorative labels above headings (no eyebrow/kicker pills); hierarchy comes from type weight and the heading itself.

**Key Characteristics:**
- Soft, layered card surfaces on a pale sky-blue-to-white gradient ground; no hard edges or flat neobrutalist blocks.
- One reserved "loud" color (emergency red) for genuine urgency only; every other state stays in the calm blue/green/amber palette.
- Generous rounding (`1–1.75rem` on cards and buttons) and generous whitespace, even on data-dense dispatch/rescue dashboards.
- Motion is ambient and purposeful: fade-in-up reveals on scroll, gentle floating/orbiting decoration, a pulse-glow reserved for the most urgent live states — never motion added just to look busy.
- Thai-first typography (Noto Sans Thai) throughout; no mixed-language labeling for the same concept.

## Colors

Calm blue dominates; emergency red is rationed to genuine urgency; every other status gets its own quiet, named color rather than reusing red for "just important."

### Primary
- **Command Blue** (`#0B6EBD`): the brand/trust color — primary buttons, active nav states, links, focus rings, icon tiles. Its brighter twin **Command Blue Bright** (`#1479C9`) is the hover state, never used at rest.

### Secondary
- **Alert Red** (`#D92D20`) / **Alert Red Deep** (`#B42318` hover/active): reserved for genuine urgency — the citizen's emergency-contact action, severity-1 badges, destructive/danger buttons, the escalation and hospital-refusal-signature paths. Never used decoratively or for routine "important" emphasis; if it appears, something on screen is actually urgent.

### Tertiary
- **Reassurance Green** (`#12B76A`): success/confirmation states (completed cases, saved changes).
- **Caution Amber** (`#F79009`) and **Moderate Yellow** (`#F5C542`): warning states and mid-severity indicators — sit between the calm blue baseline and Alert Red on the urgency ladder, never substituted for either.

### Neutral
- **Deep Navy** (`#12304A`): primary text color and the darkest surface tone (never pure black).
- **Muted Slate** (`#667085`): secondary/supporting text, placeholders, timestamps.
- **Sky Wash** (`#EAF6FF`) / **Sky Pale** (`#F4FAFE`): the two soft background tints layered behind hero sections, icon tiles, and selected/active row states.
- **App Ground** (`#F6FAFD`): the default page background.
- **Hairline Border** (`#D9E7F2`): all card/input borders and dividers — always this tint, never plain gray.

### Named Rules
**The One Loud Color Rule.** Alert Red is the only color allowed to visually shout (glow, pulse, large filled circles). If a screen needs a second urgent-feeling color, that is a sign the actual severity/urgency data should drive it instead of decoration.

## Typography

**Body/Display Font:** "Noto Sans Thai", "Noto Sans", system-ui, sans-serif (single family across all roles/weights; no separate display face)

**Character:** A plain, highly legible system-adjacent sans carries the whole interface — appropriate for a tool used by people under time pressure or stress, where a decorative or stylized face would cost comprehension speed for no benefit.

### Hierarchy
- **Display** (extrabold 800, `text-3xl` → `text-5xl` responsive, tight leading): the one true headline per page (e.g. Home's "ทุกวินาทีมีความหมาย"). Used once, never for section headers.
- **Headline** (bold 700, `text-xl`–`text-2xl`): section headers within a page (e.g. "ความปลอดภัยและความน่าเชื่อถือ").
- **Title** (bold 700, `text-base`–`text-lg`): card titles, page titles in the top bar.
- **Body** (regular 400, `text-sm`–`text-[15px]`, `leading-relaxed` on longer copy): all descriptive/paragraph text. Keep short-form; this system favors compact card copy over long paragraphs.
- **Label** (semibold 600, `text-xs`–`text-sm`): buttons, form labels, badges, nav items.

### Named Rules
**The No-Eyebrow Rule.** A heading never gets a small label pill above it. The heading carries its own weight; supporting context goes in the body copy beneath it, never in a badge above it.

## Layout

Content is centered and capped (`max-w-5xl` for most sections, `max-w-7xl` for the two-column hero) rather than running edge-to-edge, at every viewport including ultrawide desktop. Section rhythm is generous vertical padding (`py-16` between major sections) with tighter internal card padding (`p-5`–`p-6`). Dashboards use a responsive card grid (1 column mobile → 2–3 columns desktop) rather than dense tables. Mobile-first throughout: every flow (citizen report, rescue field updates) must work one-handed on a phone before it's considered done for desktop.

## Elevation & Depth

Layered, not flat: every card and elevated surface carries a soft two-layer shadow rather than a border-only or flat-tonal treatment. Depth increases on hover/interaction (`shadow-card` → `shadow-card-lg`) rather than being static, giving interactive elements a gentle "lift toward you" response.

### Shadow Vocabulary
- **card** (`0 2px 8px rgba(18,48,74,.06), 0 1px 2px rgba(18,48,74,.04)`): resting elevation for all cards, dashboard tiles, and buttons with a shadow.
- **card-lg** (`0 8px 24px rgba(18,48,74,.10), 0 2px 6px rgba(18,48,74,.06)`): hover/active elevation — the "lift" response.
- **red-glow** / **red-glow-lg** (`0 0 0 8–14px rgba(217,45,32,.10–.12), 0 12–20px 32–48px rgba(217,45,32,.35–.40)`): reserved exclusively for the emergency-contact circle and its most urgent pulsing states — the one place a colored glow is earned rather than decorative.

### Named Rules
**The Earned Glow Rule.** A colored (non-neutral) shadow/glow is reserved for genuinely urgent elements. A calm/informational card always shadows in neutral navy-tinted black, never in brand blue or any accent color.

## Shapes

Rounded throughout, scaling with the element's importance: buttons and small controls at `1.25rem` (`rounded-xl2`), cards and modals at `1.75rem` (`rounded-xl3`), pills/badges/avatars fully rounded. No sharp corners anywhere in the system, and no neobrutalist hard-offset shadows — softness is a deliberate, consistent choice across the whole surface, not a per-component accident.

## Components

### Buttons
- **Shape:** `1.25rem` radius (`rounded-xl`/`rounded-2xl` depending on size), generous horizontal padding.
- **Primary:** Command Blue fill, white text, `shadow-card` at rest → `shadow-card-lg` on hover, brightens to Command Blue Bright on hover.
- **Danger:** identical shape/shadow language to Primary, Alert Red fill — used only for destructive or genuinely urgent actions, never as a second "primary" button on the same screen.
- **Secondary / Outline / Ghost:** progressively quieter — sky-blue-tinted fill, then white-with-border, then transparent — for de-emphasized or repeated actions on the same screen.
- **All variants:** `active:scale-[0.98]` press feedback, `focus-visible` ring in Command Blue at 30% opacity, disabled state drops to ~40–50% opacity rather than a separate gray palette.

### Cards
- **Corner Style:** `1.75rem` (`rounded-2xl`/`rounded-3xl`).
- **Background:** white, on the App Ground/Sky Wash page background.
- **Shadow Strategy:** `card` at rest; interactive cards (e.g. dashboard case cards) lift to `card-lg` plus a slight upward translate on hover.
- **Border:** 1px Hairline Border, always present even with a shadow — the two work together rather than the border substituting for depth.
- **Internal Padding:** `1.25rem`–`1.5rem` (`p-5`/`p-6`).

### Inputs / Fields
- **Style:** white background, Hairline Border stroke, `rounded-xl` corners, label above the field in navy semibold.
- **Focus:** border shifts to Command Blue plus a `ring-4` Command-Blue-at-15% halo.
- **Error:** border and message switch to Alert Red; error text always carries an icon (never color alone).

### Navigation
- Sticky top bar, white at 90% opacity with backdrop blur, one persistent brand mark (favicon + "ResQ" wordmark) on the left. Active nav link gets a Command Blue underline bar and text color, not a background fill. Logged-in account access is a single dropdown menu (avatar + name + chevron) carrying every role-specific destination plus logout, rather than scattering icons across the bar.

### Badges / Status Pills
- Fully rounded, small, colored by semantic status (severity/case-status), never by decoration. A badge's color is always meaningful (maps to a real severity/status value) — never chosen for visual variety.

### Signature Component: Animated Backgrounds
Full-bleed decorative SVG/CSS backgrounds (heartbeat line, drifting particles, orbiting rings, mesh gradients) sit behind hero and dashboard content at low opacity, `pointer-events-none`, and respect `prefers-reduced-motion` by freezing in place. They exist to keep the "calm but alive" feeling ambient — never to compete with foreground content for attention.

## Do's and Don'ts

### Do:
- **Do** reserve Alert Red for genuinely urgent meaning (severity, danger, destructive actions) — if in doubt, use Command Blue or a neutral tone instead.
- **Do** use the two-layer neutral `card`/`card-lg` shadow system for all elevation; reach for a colored glow only on the one or two elements per screen that are actually the emergency focal point.
- **Do** cap content width (`max-w-5xl`–`max-w-7xl`) at every viewport, including ultrawide desktop — never let a section stretch edge-to-edge.
- **Do** keep every role's dashboard scoped to only the information/actions that role needs; cross-role data never leaks into a view that doesn't need it.

### Don't:
- **Don't** place a small labeled pill/eyebrow above a heading. Let the heading carry its own weight.
- **Don't** introduce a second "loud" accent color alongside Alert Red — every other status stays in the calm blue/green/amber register.
- **Don't** use sharp corners or hard-offset (`box-shadow: Npx Npx 0`) neobrutalist shadows anywhere — the system is deliberately soft throughout.
- **Don't** add motion for its own sake; every animation should be either an ambient "alive" signal (background decoration) or direct feedback for a real state change.

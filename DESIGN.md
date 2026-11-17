---
name: ResQ
description: Real-time emergency-medical dispatch coordination for citizens, 1669 dispatch, rescue teams, and hospitals
colors:
  primary: "#0B6EBD"
  primary-bright: "#1479C9"
  navy: "#12304A"
  bg: "#F5F7FA"
  surface: "#FFFFFF"
  surface-alt: "#F8FAFC"
  border: "#E3E8EF"
  input: "#CDD5DF"
  accent: "#EDF3FA"
  muted: "#667085"
  emergency: "#D92D20"
  emergency-dark: "#B42318"
  warning: "#F79009"
  warning-ink: "#B54708"
  moderate: "#F5C542"
  moderate-ink: "#8A6D00"
  success: "#12B76A"
  success-ink: "#067647"
typography:
  body:
    fontFamily: "'Noto Sans Thai', 'Noto Sans', system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Noto Sans Thai', 'Noto Sans', system-ui, sans-serif"
    fontWeight: 500
rounded:
  sm: "0.1875rem"
  md: "0.375rem"
  lg: "0.375rem"
  xl: "0.5rem"
  2xl: "0.625rem"
  3xl: "0.75rem"
  full: "9999px"
spacing:
  sm: "0.75rem"
  md: "1.25rem"
  lg: "2rem"
  xl: "3.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.lg}"
    padding: "6px 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-bright}"
  button-danger:
    backgroundColor: "{colors.emergency}"
    textColor: "#FFFFFF"
    rounded: "{rounded.lg}"
    padding: "6px 14px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.navy}"
    rounded: "{rounded.lg}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.2xl}"
    padding: "20px"
---

# Design System: ResQ

## Overview

**Creative North Star: "The Operations Console"**

ResQ is used by a dispatcher watching many cases at once, a rescue crew in a moving vehicle, a hospital preparing for an arrival, and a citizen on the worst day of their year. The interface behaves like a well-made operations console: a quiet, cool neutral ground; white working surfaces; one hairline for structure; type weight and alignment for hierarchy. Nothing moves unless something changed. Nothing is colored unless it means something.

Urgency is the one exception, and it is rationed: emergency red (`#D92D20`) appears only where something genuinely is urgent: the citizen's emergency call control, a severity-1 case, a call that needs answering, a destructive confirmation.

**Key Characteristics:**
- Borders carry structure; shadows are only for things that float (menus, dialogs, toasts).
- Tight, consistent corners: 6-8px on controls, 10-12px on panels; only avatars, status dots and the emergency call control are round.
- Restrained color: neutrals plus brand blue for primary actions and selection; status colors only on status.
- No ambient decoration: no animated backgrounds, gradients, glows, blur or floating elements. Motion is feedback for a state change.
- Thai-first typography (Noto Sans Thai) throughout; never mixed-language labels for the same concept.

## Colors

All colors resolve through CSS variables in `src/index.css` (light under `:root`, dark under `.dark`); Tailwind exposes them in `tailwind.config.js`. Never hard-code a hex in a component.

### Brand
- **Command Blue** (`primary`, `#0B6EBD`): primary actions, links, current selection, focus rings. `primary-bright` is its hover.
- **Primary fill** (`primary-fill` / `primary-fill-hover`): the background of any filled control carrying white text. Equal to Command Blue in light mode, deeper in dark mode so white labels keep 4.5:1. Use `bg-primary-fill`, never `bg-primary`, behind white text.

### Urgency and status
- **Alert Red** (`emergency` / `emergency-dark`, alias `destructive`): genuine urgency and destructive actions only.
- **Amber** (`warning`), **Yellow** (`moderate`), **Green** (`success`): fills, tints and dots. For text on light surfaces, always use the `-ink` variant (`text-warning-ink`, `text-moderate-ink`, `text-success-ink`), which is the same hue at 4.5:1. On dark call surfaces use the bright base color instead.

### Neutrals
- **Ink** (`ink`, alias `foreground`, `#12304A`): all primary text. Never pure black.
- **Muted** (`muted`, `#667085`): secondary text, metadata, idle icons.
- **Ground** (`bg`, `#F5F7FA`): page background.
- **Surface** (`surface`) / **Surface alt** (`surface-alt`): working panels, and table headers, footers and hover rows.
- **Border** (`border`, `#E3E8EF`): dividers and panel outlines. **Input** (`input`, `#CDD5DF`): form-control strokes, one step stronger.
- **Accent** (`skyblue-light` / `accent`, `#EDF3FA`): hover and selected tints for nav items and list rows. `skyblue-pale` is the faintest inner grouping tint.

### Named Rules
**The One Loud Color Rule.** Alert Red is the only color allowed to shout. A severity-1 badge is solid red; every other badge is a tint.

## Typography

**Font:** "Noto Sans Thai", "Noto Sans", system-ui, sans-serif. One family, sized and weighted for hierarchy.

Thai stacks vowels and tone marks above and below the line, so line height never drops below ~1.35 on headings or 1.5 on body text, and tracking stays at or above `tracking-tight`.

### Scale (Tailwind `fontSize` tokens)
- **display** (30px / 700): one per marketing page (Home, How it works). Never in the app.
- **title** (20px / 600): a page's own heading (`PageHeader`).
- **heading** (16px / 600): section and card titles (`CardHeader`, `QueueSection`, dialogs).
- **subheading** (14px / 600): a row's title, group labels.
- **body** (15px): reading text.
- **small** (13px): supporting copy and descriptions.
- **label** (13px / 500): form labels.
- **meta** (12px): timestamps, hints, column headers, counts.

Weights: 400 for text, 500 for labels and buttons, 600 for headings and emphasis. 700 is reserved for display headings and the ResQ wordmark. Numbers in tables, stat bars and timers are `tabular-nums`.

### Named Rules
**The No-Eyebrow Rule.** A heading never gets a small label or pill above it. The heading carries its own weight.

## Layout

- **App shell (staff):** a 240px sticky sidebar (brand, current role, primary destinations, a separate "เครื่องมือ" (tools) group, and the emergency link at the foot), a 56px top bar naming the page, and content capped at 88rem. Below `lg` the sidebar becomes a slide-in drawer and the phone gets a bottom bar.
- **Flow pages** (one task: report, call, navigate, fill a form) use the `flow` shell: back arrow, title, a single centered column (`max-w-2xl`).
- **Forms and settings** are capped at a readable width (`max-w-2xl`–`max-w-3xl`) even inside the wide shell.
- **Public pages** alternate full-width bands of `bg` and `surface` separated by hairlines, with content in `max-w-6xl`.
- Spacing rhythm: 4px base. Panels pad 20px (`p-5`); sections sit 28-32px apart; more space above a heading than below it.

## Elevation

Flat by default. A resting panel is `border border-border bg-surface`, with no shadow.
- `shadow-card`: a 1px hairline lift for controls only (buttons, inputs).
- `shadow-card-lg`: popovers, dropdown menus, combobox lists.
- `shadow-overlay`: dialogs, drawers, toasts.
- `shadow-red-glow` / `-lg`: the emergency call control only.

Hover never lifts or translates a card; it tints it (`hover:bg-surface-alt`) or strengthens its border.

## Components

All primitives live in `src/components/ui/`.

### Buttons (`Button`)
Sizes `sm` 32 / `md` 36 / `lg` 44 / `xl` 48px (min-height, so long Thai labels wrap). `lg`/`xl` are the touch sizes for phone-first flows.
- **primary**: one per view. **secondary**: blue tint. **outline**: neutral bordered, for repeated or secondary actions. **ghost**: toolbar and inline actions.
- **danger**: a single destructive or urgent action. **danger-outline**: a destructive action that repeats per row (delete in a list); quiet until hovered.
- Focus is a 2px primary outline at 2px offset. Disabled drops opacity; no separate gray palette. No scale-on-press.

### Panels (`Card`, `CardHeader`, `PageHeader`)
`Card` is one surface with one hairline. Passing any `p-*` class replaces its default `p-5` (no `!` needed); a panel that holds a map, a list or a stat grid edge to edge uses `p-0`. **No nested cards**: related facts inside a card are separated by `divide-y` or spacing, at most a faint `skyblue-pale` tint. `CardHeader` gives a card a title, optional description and right-aligned actions. `PageHeader` gives a page its title, context line and page-level actions.

### Lists
A set of like items (accounts, comments, notifications, units, redemptions, photo slots) is **one** divided panel (`divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface`, rows `px-5 py-3`–`py-3.5`), never a stack of separate cards. Rank or sequence numbers are plain muted numerals, not tinted discs.

### Detail records
Fields are label over value: `text-meta text-muted` label, `text-sm font-medium text-ink` value, in a two-column grid. No icon per field when the field has a label; an icon stands in for a label only in compact lists, and then it is muted. Case numbers are monospace: ink at title size when they are the page's subject, muted `meta` above the incident title otherwise. Detail pages put the role's next action first: in a sticky right column on desktop (`lg:sticky lg:top-[4.5rem]`), and as a sticky panel above the bottom bar on a phone.

### Stat bar (`StatBar` / `StatItem`)
Key figures share one bordered bar with hairlines between them (2×2 on a phone), never N separate tiles. Labels carry a muted icon; the number and its icon turn red only when they count something waiting on this role.

### Case queues (`CaseQueue`, `QueueSection`)
Cases are rows in one panel with a column header on wide screens: severity · case number over incident type · place (or patient) · status with the handling unit · elapsed over clock time · the role's next action. The whole row opens the case; rows tint on hover. A section's count chip turns red when the queue is waiting on this role. Order: unassessed, most severe, longest waiting.

### Badges
`rounded-md`, 12px semibold, tinted background with a matching hairline. At most two per row.
- **StatusBadge**: a colored dot plus the label (red while reporting, amber while finding a team, blue while help is under way, green when done). Static: no spinning icons or pulses in lists.
- **SeverityBadge**: icon plus label, so levels are distinguishable without color; level 1 is solid red.
- **VehicleLevelBadge**: CLS / ALS / BLS as a monospace code.

### Forms (`Input`, `Textarea`, `Select`, `SearchableSelect`, `RadioCard`, `SegmentedControl`, `Checkbox`)
- 40px controls, `input` stroke, 8px corners, 3px primary focus halo. Text is 16px on phones (iOS won't zoom) and 14px from `sm`.
- Label above in `label` weight; required marked with a red asterisk; hint in `meta`; errors in red with an icon (`role="alert"`), never color alone.
- **Missing on submit:** a submit button stays pressable while incomplete. Pressing it plays the error sound and jumps to the first missing field (`revealMissingField`, src/lib/formErrors.ts).
- `RadioCard` and the `card` SegmentedControl select with a 1px primary ring and a faint tint; the `pill` SegmentedControl is a recessed track with the selected segment raised.

### Dialogs (`Dialog`, `ConfirmationModal`, `InfoModal`)
Use for decisions that must interrupt or a short focused task, never by default. A bottom sheet on a phone, centered from `sm`. Header (title and optional description), body, and a footer on `surface-alt` with actions right-aligned, primary last. Escape and the scrim close a dismissible dialog; focus moves in on open and returns on close. Overlays that manage their own lifecycle reuse `DIALOG_SCRIM` / `DIALOG_PANEL`.

### Navigation
Sidebar and drawer items are 36-40px rows: muted icon and ink label; selected is an `accent` tint with primary text. The public top bar marks the current page with a 2px primary underline on the bar's bottom edge. Account actions live in one dropdown menu.

### States (`LoadingState`, `EmptyState`, `ErrorState`, `SuccessState`)
Loading is an inline spinner and one line of text. Empty is a dashed panel with a muted icon, title, description and optional action. Error is a neutral panel with a red icon and a retry. No icon tiles.

### Toasts
Top right on desktop, bottom on a phone; a surface with overlay elevation and a status-colored icon. `role="alert"` for errors, `status` otherwise.

### Docked call
1669's live call docks on the left of a wide screen (`--call-dock-w`: 340-460px, 30vw) with the page beside it; the sidebar gives way and the menu opens from the top bar. A page with a multi-column layout at `lg` adds `docked:` variants (`html[data-call-docked] &`) to stay single-column beside the dock. Call screens are dark, full-bleed video: gradients and blur there exist only to keep controls legible over video.

### Emergency call control (`EmergencyContactCircle`)
The one round, red, shadowed control on the public pages: 216-288px, a faint red ring, darkening on hover. Nothing else imitates it.

## Motion

- 150-220ms, `cubic-bezier(0.16, 1, 0.3, 1)`; opacity plus at most 4px of travel.
- Allowed: dialog and menu entrance, toasts, a new incoming call or notification arriving, a live-state ring (`animate-pulse-glow`, tinted by `--pulse`; red controls set `[--pulse:var(--color-emergency)]`).
- Not allowed: page-load staggers, scroll reveals, ambient or decorative loops, hover lifts.
- `prefers-reduced-motion` collapses all animation (index.css).

## Sound
Every sound is synthesized in src/lib/sounds.ts (no audio files). Each kind has its own voice, so it can be told apart without looking at the screen:
- **Interface** (the user can switch these off in Settings): a tiny dry tick on every press of a control, a two-note rising chime for success, a low hollow falling "uh-uh" for an error or missing information, and a double bell for a warning.
- **Case alerts** (always on): the more urgent the case, the more it sounds like an alarm. Severity 1 is rising sweeps plus a fast hi-lo, 2 is hi-lo, 3 is a triple beep and a bell, 4 is two bells, 5 is one soft bell. A case not yet triaged gets a hi-lo alarm topped with a bell. A rescue team declining a case is a falling, hollow three-note phrase with two low pulses. A rescue team proposing a different severity is three rising bells, opened by a short hi-lo when the proposal is level 1-2. A patient on the way to a hospital is a rising bell arpeggio. An alert keeps sounding every 10 s, for up to 5 minutes, until someone acknowledges it.
- **Calls** (always on): an incoming call is a lively marimba phrase; a caller waiting hears a soft ringback; connecting and ending each have a two-note chime. Nothing rings into a call already in progress.

## Do's and Don'ts

### Do
- **Do** build structure with borders, spacing and type before reaching for a shadow or a tint.
- **Do** keep one primary action per view; repeat actions in outline or ghost.
- **Do** use `-ink` status colors for text on light surfaces, and `bg-primary-fill` behind white text.
- **Do** keep icons that only label text muted; brand blue is for interaction and selection.
- **Do** show a page's title once: the top bar names the page, and an in-page heading adds something (a case number, a more specific task) or is left out.
- **Do** design each page around its task: a queue scans rows, a detail record reads top to bottom in sections, a form is one column with one primary action.
- **Do** cap content width at every viewport, including ultrawide.

### Don't
- **Don't** add animated or gradient backgrounds, glows, glass, blur or floating decoration.
- **Don't** put a small label or pill above a heading.
- **Don't** nest a bordered box inside a card, or stack N single-stat tiles where one `StatBar` says it.
- **Don't** use pill-shaped buttons or 2px borders; selection is a 1px ring.
- **Don't** use solid red for repeated row actions; use `danger-outline`.
- **Don't** stack three or more badges on one element.
- **Don't** animate on page load or on scroll.
- **Don't** put an icon in front of every card or section heading.
- **Don't** set `overflow-x: hidden` on `body` (it breaks every `position: sticky`); index.css uses `clip`.

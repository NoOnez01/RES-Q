import { playUiSound } from './sounds'

// Somewhere to type first; failing that (a row of choice cards), a button.
const TYPEABLE = 'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
const PRESSABLE = 'button:not([disabled]), [tabindex]:not([tabindex="-1"])'

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

/** The first field marked missing, else the first required one left empty. */
function firstMissing(scope: ParentNode): HTMLElement | null {
  const marked = scope.querySelector<HTMLElement>('[data-field-error]')
  if (marked) return marked
  for (const el of scope.querySelectorAll<Control>('[aria-required="true"]')) {
    if (!el.disabled && !el.value.trim()) return el
  }
  return null
}

/**
 * A form that can't go on because something important is missing: sound
 * it, then take the person to the first missing field -- scrolled into
 * view, cursor in it -- rather than leaving them to hunt for the red text.
 *
 * Fields mark themselves missing with `data-field-error`: FieldShell does
 * this for every Input, Textarea, Select and SearchableSelect given an
 * `error`; a custom group (a row of choice cards) sets it itself. A form
 * that only says what's missing in a toast still gets taken to its first
 * empty required field. Looks inside the dialog or form the submit button
 * belongs to, so a form in a dialog never jumps to the page behind it.
 */
export function revealMissingField(): void {
  playUiSound('error')
  const from = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const scope: ParentNode = from?.closest('[role="dialog"], [role="alertdialog"], form') ?? document
  // After React has painted the errors this submit just set.
  requestAnimationFrame(() => {
    const field = firstMissing(scope)
    if (!field) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    field.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
    const control = field.matches(TYPEABLE)
      ? field
      : (field.querySelector<HTMLElement>(TYPEABLE) ?? field.querySelector<HTMLElement>(PRESSABLE))
    control?.focus({ preventScroll: true })
  })
}

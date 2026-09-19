import { useStore } from './store'

/**
 * English dictionary keyed by the original Thai source string -- so call
 * sites just wrap the existing Thai literal in `t(...)` instead of inventing
 * a key name (`t('settings.title')`) for every one of the hundreds of
 * strings across the app. Thai is therefore always the fallback: a string
 * missing from this map (not yet translated, or a value coming straight
 * from user/DB data) simply renders as-is instead of throwing or showing a
 * placeholder.
 */
export const en: Record<string, string> = {}

/** Registers translations, e.g. `registerTranslations({ 'ตั้งค่า': 'Settings' })`.
 * Pages/components call this once at module scope so the dictionary builds
 * up from wherever `t(...)` is actually used, instead of one giant file. */
export function registerTranslations(entries: Record<string, string>): void {
  Object.assign(en, entries)
}

/** `{name}`-style placeholders in the Thai source get substituted with the
 * same values in the English string, so interpolated strings translate too
 * (e.g. `t('เคส {n} เรียบร้อยแล้ว', { n: caseNumber })`). */
function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text
  let out = text
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{${key}}`).join(String(value))
  }
  return out
}

export function translate(language: 'th' | 'en', text: string, vars?: Record<string, string | number>): string {
  const source = language === 'en' ? (en[text] ?? text) : text
  return interpolate(source, vars)
}

/** Reactive translator for use inside React components/hooks -- re-renders
 * automatically when the user switches language in Settings. */
export function useT() {
  const language = useStore((s) => s.language)
  return (text: string, vars?: Record<string, string | number>) => translate(language, text, vars)
}

/** Non-reactive translator for one-off use outside React (e.g. a toast
 * fired from a Zustand action) -- reads the language at call time instead
 * of subscribing, since there's no component to re-render. */
export function t(text: string, vars?: Record<string, string | number>): string {
  return translate(useStore.getState().language, text, vars)
}

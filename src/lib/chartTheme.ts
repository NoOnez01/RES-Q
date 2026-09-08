/** Shared recharts color/style tokens, pulled from DESIGN.md's palette so
 * charts read as part of the same system rather than a library's defaults
 * dropped in verbatim -- recharts ships blues/greens/purples that don't
 * match this app's calm-blue-plus-rationed-red language at all. */
export const CHART_COLORS = {
  primary: '#1E3A8A',
  primaryBright: '#2563EB',
  navy: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  emergency: '#D92D20',
  warning: '#F79009',
  moderate: '#F5C542',
  success: '#12B76A',
  skyblueLight: '#EFF6FF',
} as const

/** Same 1 (worst/most severe) -> 5 (best/least severe) ladder used
 * everywhere else severity appears (SeverityBadge, the assessment form's
 * SEVERITY_OPTIONS) -- red at the critical end, green at the calm end. */
export const SEVERITY_CHART_COLORS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: CHART_COLORS.emergency,
  2: CHART_COLORS.warning,
  3: CHART_COLORS.moderate,
  4: CHART_COLORS.primary,
  5: CHART_COLORS.success,
}

export const CHART_TICK_STYLE = { fontSize: 12, fill: CHART_COLORS.muted, fontFamily: 'inherit' }

export const CHART_TOOLTIP_STYLE = {
  borderRadius: 8,
  border: `1px solid ${CHART_COLORS.border}`,
  boxShadow: '0 1px 3px rgba(15,23,42,.08), 0 1px 2px rgba(15,23,42,.06)',
  fontSize: 13,
  fontFamily: 'inherit',
}

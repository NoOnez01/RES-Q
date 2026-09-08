/** Shared recharts color/style tokens, pulled from DESIGN.md's palette so
 * charts read as part of the same system rather than a library's defaults
 * dropped in verbatim -- recharts ships blues/greens/purples that don't
 * match this app's calm-blue-plus-rationed-red language at all. */
export const CHART_COLORS = {
  primary: '#0B6EBD',
  primaryBright: '#1479C9',
  navy: '#12304A',
  muted: '#667085',
  border: '#D9E7F2',
  emergency: '#D92D20',
  warning: '#F79009',
  moderate: '#F5C542',
  success: '#12B76A',
  skyblueLight: '#EAF6FF',
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
  borderRadius: 12,
  border: `1px solid ${CHART_COLORS.border}`,
  boxShadow: '0 8px 24px rgba(18,48,74,.10), 0 2px 6px rgba(18,48,74,.06)',
  fontSize: 13,
  fontFamily: 'inherit',
}

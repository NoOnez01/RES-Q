// Per .claude/skills/blue-ui-redesign: no floating/glowing/blurred ambient
// decoration anywhere in the app -- clear layout and typography carry each
// page instead. This component is kept (rather than deleted) purely so
// every existing <AnimatedBackground variant="..." /> call site across the
// app doesn't need to be touched; it now always renders nothing.
export type BackgroundVariant = 'home' | 'auth' | 'emergency' | 'dashboard' | 'map' | 'howto' | 'call' | 'hospital'

export function AnimatedBackground(_props: { variant: BackgroundVariant }) {
  return null
}

export function InteractiveMapGrid({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-fx-layer ${className}`} aria-hidden="true">
      <div className="bg-fx absolute inset-0 bg-grid-lines opacity-40 animate-grid-drift" />
      <svg className="absolute inset-0 size-full opacity-30" preserveAspectRatio="none">
        <line x1="8%" y1="0" x2="8%" y2="100%" stroke="#0B6EBD" strokeWidth="2" />
        <line x1="0" y1="22%" x2="100%" y2="22%" stroke="#0B6EBD" strokeWidth="2" />
        <line x1="62%" y1="0" x2="62%" y2="100%" stroke="#12304A" strokeWidth="1.5" />
        <line x1="0" y1="74%" x2="100%" y2="74%" stroke="#12304A" strokeWidth="1.5" />
        <line
          className="bg-fx animate-dash-flow"
          x1="8%"
          y1="22%"
          x2="62%"
          y2="74%"
          stroke="#1479C9"
          strokeWidth="2"
          strokeDasharray="6 6"
        />
        <circle cx="8%" cy="22%" r="4" fill="#0B6EBD" />
        <circle cx="62%" cy="74%" r="4" fill="#12304A" />
      </svg>
    </div>
  )
}

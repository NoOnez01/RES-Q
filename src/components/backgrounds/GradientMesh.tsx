export function GradientMesh({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-fx-layer ${className}`} aria-hidden="true">
      <div
        className="bg-fx absolute -left-1/4 -top-1/3 h-[70%] w-[70%] rounded-full opacity-60 blur-3xl animate-mesh-breathe"
        style={{ background: 'radial-gradient(circle, rgba(20,121,201,0.35) 0%, transparent 70%)' }}
      />
      <div
        className="bg-fx absolute -right-1/4 top-0 h-[60%] w-[60%] rounded-full opacity-50 blur-3xl animate-mesh-breathe"
        style={{ background: 'radial-gradient(circle, rgba(11,110,189,0.28) 0%, transparent 70%)', animationDelay: '2s' }}
      />
      <div
        className="bg-fx absolute bottom-[-20%] left-1/3 h-[55%] w-[55%] rounded-full opacity-40 blur-3xl animate-mesh-breathe"
        style={{ background: 'radial-gradient(circle, rgba(18,48,74,0.18) 0%, transparent 70%)', animationDelay: '4s' }}
      />
    </div>
  )
}

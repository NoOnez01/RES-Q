import clsx from 'clsx'
import { Building2, BedDouble, Navigation, PhoneCall, CheckCircle2 } from 'lucide-react'
import type { Hospital } from '@/lib/types'

export function HospitalSelector({
  hospitals,
  selectedId,
  onSelect,
}: {
  hospitals: Hospital[]
  selectedId?: string
  onSelect: (h: Hospital) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {hospitals.map((h) => {
        const selected = h.id === selectedId
        return (
          <button
            key={h.id}
            onClick={() => onSelect(h)}
            className={clsx(
              'relative flex flex-col gap-3 rounded-2xl border-2 bg-white p-4 text-left transition-all hover:shadow-card-lg',
              selected ? 'border-primary bg-skyblue-light' : 'border-border hover:border-primary/50',
            )}
          >
            {selected && (
              <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-primary text-white">
                <CheckCircle2 className="size-4" />
              </span>
            )}
            <div className="flex items-start gap-3 pr-8">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-navy leading-snug">{h.name}</p>
                <p className="text-xs text-muted mt-0.5">{h.location.address}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span
                className={clsx(
                  'rounded-full px-2.5 py-1 font-semibold',
                  h.erAvailable ? 'bg-success/10 text-success' : 'bg-muted/10 text-muted',
                )}
              >
                {h.erAvailable ? 'ห้องฉุกเฉินพร้อมรับ' : 'ห้องฉุกเฉินเต็ม'}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-skyblue-pale px-2.5 py-1 font-semibold text-primary">
                <BedDouble className="size-3.5" /> เตียงว่าง {h.bedsAvailable}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-skyblue-pale px-2.5 py-1 font-semibold text-primary">
                <Navigation className="size-3.5" /> {h.distanceKm.toFixed(1)} กม. · {h.etaMin} นาที
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {h.specialties.map((s) => (
                <span key={s} className="rounded-full bg-bg px-2 py-0.5 text-[11px] text-muted border border-border">
                  {s}
                </span>
              ))}
            </div>

            <p className="flex items-center gap-1.5 text-xs text-muted">
              <PhoneCall className="size-3.5" /> {h.phone}
            </p>
          </button>
        )
      })}
    </div>
  )
}

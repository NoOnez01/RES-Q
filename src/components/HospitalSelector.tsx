import { useState } from 'react'
import clsx from 'clsx'
import { Building2, BedDouble, Navigation, PhoneCall, CheckCircle2, Search, AlertTriangle } from 'lucide-react'
import type { Hospital } from '@/lib/types'
import type { RankedHospital } from '@/lib/hospitalRisk'
import { RiskBadge, RiskReasons } from './HospitalRisk'
import { Input } from './ui/Field'
import { EmptyState } from './States'
import { ConfirmationModal } from './ConfirmationModal'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  'ค้นหาโรงพยาบาลด้วยชื่อ...': 'Search hospitals by name...',
  ค้นหาโรงพยาบาล: 'Search hospitals',
  ไม่พบโรงพยาบาลที่ค้นหา: 'No matching hospital found',
  ลองค้นหาด้วยชื่ออื่น: 'Try a different search term',
  เหมาะสมที่สุด: 'Best match',
  ห้องฉุกเฉินพร้อมรับผู้ป่วย: 'ER ready for patients',
  ห้องฉุกเฉินเต็ม: 'ER full',
  'เตียงว่าง {n}': '{n} beds available',
  '{km} กม. · {eta} นาที': '{km} km · {eta} min',
  ประมาณการ: 'estimated',
  โรงพยาบาลนี้: 'this hospital',
  'ขณะนี้ห้องฉุกเฉินของ{name}เต็ม ต้องการเลือกโรงพยาบาลนี้หรือไม่': "{name}'s emergency room is currently full. Confirm you still want to select this hospital?",
  ยืนยันเลือกโรงพยาบาลนี้: 'Confirm this hospital',
  เลือกโรงพยาบาลอื่น: 'Choose another hospital',
})

export function HospitalSelector({
  hospitals,
  selectedId,
  recommendedId,
  assessments,
  onSelect,
}: {
  hospitals: Hospital[]
  selectedId?: string
  /** The top-ranked hospital (ER available, then nearest) -- rendered as a
   * bigger, full-width, spotlighted card instead of an equal-size tile. */
  recommendedId?: string
  /** Risk and travel from this incident, per hospital id -- when there's a
   * case to assess against (lib/hospitalRisk.ts). */
  assessments?: Record<string, RankedHospital>
  onSelect: (h: Hospital) => void
}) {
  // Some rescuers/reporters already know exactly which hospital they want
  // (e.g. the patient's regular hospital) rather than taking the top
  // recommendation -- this lets them jump straight to it by name instead
  // of scanning the whole list.
  const [query, setQuery] = useState('')
  const filtered = query.trim()
    ? hospitals.filter((h) => h.name.toLowerCase().includes(query.trim().toLowerCase()))
    : hospitals

  // A full ER is sometimes still the right call (nearest/only option in a
  // genuine emergency), so this warns rather than blocks -- but selecting
  // one was previously a single accidental tap away from an available
  // hospital's card, with nothing to confirm the choice was intentional.
  const [pendingFullErHospital, setPendingFullErHospital] = useState<Hospital | null>(null)
  const t = useT()

  function handleCardClick(h: Hospital) {
    if (!h.erAvailable) {
      setPendingFullErHospital(h)
      return
    }
    onSelect(h)
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder={t('ค้นหาโรงพยาบาลด้วยชื่อ...')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="!py-2.5"
        aria-label={t('ค้นหาโรงพยาบาล')}
      />
      {filtered.length === 0 ? (
        <EmptyState icon={<Search className="size-6" />} title={t('ไม่พบโรงพยาบาลที่ค้นหา')} description={t('ลองค้นหาด้วยชื่ออื่น')} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((h) => {
            const selected = h.id === selectedId
            const isTop = h.id === recommendedId
            const assessed = assessments?.[h.id]
            // From this incident when assessed; else the hospital's stored figures.
            const km = assessed?.travel.distanceKm ?? h.distanceKm
            const eta = assessed?.travel.etaMin ?? h.etaMin
            return (
              <button
                key={h.id}
                onClick={() => handleCardClick(h)}
                className={clsx(
                  'relative flex flex-col gap-3 rounded-2xl border-2 bg-surface text-left transition-all hover:shadow-card-lg',
                  selected ? 'border-primary bg-skyblue-light' : 'border-border hover:border-primary/50',
                  isTop ? 'p-5 shadow-card-lg sm:col-span-2 sm:p-6' : 'p-4',
                )}
              >
                {selected && (
                  <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-primary text-white">
                    <CheckCircle2 className="size-4" />
                  </span>
                )}
                {(isTop || assessed) && (
                  <div className="flex flex-wrap items-center gap-2 pr-8">
                    {isTop && (
                      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white">
                        {t('เหมาะสมที่สุด')}
                      </span>
                    )}
                    {assessed && <RiskBadge level={assessed.risk.level} />}
                  </div>
                )}
                <div className="flex items-start gap-3 pr-8">
                  <div
                    className={clsx(
                      'flex shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary',
                      isTop ? 'size-12' : 'size-10',
                    )}
                  >
                    <Building2 className={isTop ? 'size-6' : 'size-5'} />
                  </div>
                  <div className="min-w-0">
                    <p className={clsx('font-bold text-ink leading-snug', isTop && 'text-lg')}>{h.name}</p>
                    <p className="text-xs text-muted mt-0.5">{h.location.address}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  {/* When assessed, the reasons below say it -- and what a full ER means. */}
                  {!assessed && (
                    <span
                      className={clsx(
                        'rounded-full px-2.5 py-1 font-semibold',
                        h.erAvailable ? 'bg-success/10 text-success' : 'bg-muted/10 text-muted',
                      )}
                    >
                      {h.erAvailable ? t('ห้องฉุกเฉินพร้อมรับผู้ป่วย') : t('ห้องฉุกเฉินเต็ม')}
                    </span>
                  )}
                  <span className="flex items-center gap-1 rounded-full bg-skyblue-pale px-2.5 py-1 font-semibold text-primary">
                    <BedDouble className="size-3.5" /> {t('เตียงว่าง {n}', { n: h.bedsAvailable })}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-skyblue-pale px-2.5 py-1 font-semibold text-primary">
                    <Navigation className="size-3.5" /> {t('{km} กม. · {eta} นาที', { km: km.toFixed(1), eta })}
                    {assessed?.travel.source === 'estimate' && <span className="font-normal opacity-80">· {t('ประมาณการ')}</span>}
                  </span>
                </div>

                {assessed && <RiskReasons reasons={assessed.risk.reasons} limit={isTop ? undefined : 3} />}

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
      )}

      <ConfirmationModal
        open={!!pendingFullErHospital}
        title={t('ห้องฉุกเฉินเต็ม')}
        message={t('ขณะนี้ห้องฉุกเฉินของ{name}เต็ม ต้องการเลือกโรงพยาบาลนี้หรือไม่', {
          name: pendingFullErHospital?.name ?? t('โรงพยาบาลนี้'),
        })}
        confirmLabel={t('ยืนยันเลือกโรงพยาบาลนี้')}
        cancelLabel={t('เลือกโรงพยาบาลอื่น')}
        tone="danger"
        icon={<AlertTriangle className="size-5" />}
        onConfirm={() => {
          if (pendingFullErHospital) onSelect(pendingFullErHospital)
          setPendingFullErHospital(null)
        }}
        onCancel={() => setPendingFullErHospital(null)}
      />
    </div>
  )
}

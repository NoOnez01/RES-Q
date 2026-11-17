import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { Search, MapPin, Building2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Input, Select, SearchableSelect } from '@/components/ui/Field'
import { LoadingState, EmptyState, ErrorState } from '@/components/States'
import { VehicleLevelBadge, VEHICLE_LEVEL_SELECTED_CLASSES } from '@/components/VehicleLevelBadge'
import { useStore } from '@/lib/store'
import { fetchAllIdemUnits, estimateUnitDistanceKm, unitHasLevel, STAFF_CERTIFICATION_FIELDS, type IdemUnit } from '@/lib/idemUnits'
import { VEHICLE_LEVEL_RANK, type VehicleLevel } from '@/lib/types'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  'ระยะทางโดยประมาณระดับจังหวัด': '(province-level estimate)',
  ไม่มีข้อมูลรถพยาบาล: 'No ambulance data',
  'กม.': 'km',
  'ค้นหาหน่วยปฏิบัติการ (NDEMS)': 'Search units (NDEMS)',
  ค้นหาหน่วยปฏิบัติการทั่วประเทศ: 'Search units nationwide',
  'ทำเนียบหน่วยปฏิบัติการจากระบบ NDEMS ค้นหาด้วยชื่อหรือรหัส กรองตามจังหวัดหรือระดับรถ และเรียงตามระยะทางโดยประมาณจากเหตุที่เลือก':
    'Unit directory from the NDEMS system — search by name or code, filter by province or vehicle level, and sort by estimated distance from the selected case',
  'ค้นหาด้วยชื่อหน่วย รหัสหน่วย หรือจังหวัด': 'Search by unit name, unit code, or province',
  'กรองตามระดับรถ (เลือกได้หลายระดับ)': 'Filter by vehicle level (multiple allowed)',
  'กรองตามจังหวัด (ไม่บังคับ)': 'Filter by province (optional)',
  พิมพ์ชื่อจังหวัดเพื่อค้นหา: 'Type a province name to search',
  ไม่พบจังหวัดที่ค้นหา: 'No matching province found',
  ทุกจังหวัด: 'All provinces',
  'คำนวณระยะทางโดยประมาณจากเหตุ (ไม่บังคับ)': 'Estimate distance from a case (optional)',
  ยังไม่มีเหตุที่มีข้อมูลตำแหน่งสำหรับอ้างอิง: 'No case with a location to reference yet',
  'ไม่ระบุ (เรียงตามชื่อหน่วย)': 'Unspecified (sort by unit name)',
  'กำลังโหลดทำเนียบหน่วยปฏิบัติการ...': 'Loading the unit directory...',
  โหลดข้อมูลไม่สำเร็จ: 'Failed to load data',
  'ไม่สามารถโหลดทำเนียบหน่วยปฏิบัติการได้ กรุณาลองใหม่อีกครั้ง': 'Could not load the unit directory. Please try again.',
  ไม่พบหน่วยปฏิบัติการที่ค้นหา: 'No matching units found',
  กรุณาปรับคำค้นหาหรือตัวกรองระดับรถ: 'Try adjusting your search or vehicle-level filter',
  'พบ {n} หน่วย': 'Found {n} units',
  '(แสดง {n} หน่วยแรก)': '(showing the first {n})',
})

const RESULT_LIMIT = 60

/** One unit as a directory row: who and where, what it can send, who
 * crews it, and how far it is. Columns from lg; stacked below. */
function UnitRow({ unit, distanceKm }: { unit: IdemUnit; distanceKm: number | null }) {
  const staffCerts = STAFF_CERTIFICATION_FIELDS.map((f) => ({ ...f, count: unit[f.key] as number | null })).filter(
    (f) => f.count && f.count > 0,
  )
  const levels = (['CLS', 'ALS', 'BLS'] as VehicleLevel[]).filter((lvl) => unitHasLevel(unit, lvl))
  const t = useT()

  return (
    <li className="grid gap-x-6 gap-y-2 px-5 py-3.5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_8rem_minmax(0,1.4fr)_5rem] lg:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{unit.unitName || unit.unitCode}</p>
        <p className="font-mono text-[11px] text-muted">{unit.unitCode}</p>
      </div>
      <p className="flex min-w-0 items-center gap-1.5 text-small text-ink/80">
        <MapPin className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
        <span className="truncate">{unit.province || '—'}</span>
      </p>
      <div className="flex flex-wrap gap-1">
        {levels.length > 0 ? (
          levels.map((lvl) => <VehicleLevelBadge key={lvl} level={lvl} />)
        ) : (
          <span className="text-meta text-muted">{t('ไม่มีข้อมูลรถพยาบาล')}</span>
        )}
      </div>
      <p className="flex min-w-0 flex-wrap gap-x-3 gap-y-0.5 text-meta text-muted">
        {staffCerts.length > 0 ? (
          staffCerts.map((f) => (
            <span key={f.label}>
              {f.label} <span className="font-semibold tabular-nums text-ink">{f.count}</span>
            </span>
          ))
        ) : (
          <span>—</span>
        )}
      </p>
      <p className="text-sm tabular-nums text-ink lg:text-right" title={distanceKm !== null ? t('ระยะทางโดยประมาณระดับจังหวัด') : undefined}>
        {distanceKm !== null ? (
          <>
            ~{distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} <span className="text-meta text-muted">{t('กม.')}</span>
          </>
        ) : (
          <span className="text-muted">—</span>
        )}
      </p>
    </li>
  )
}

export default function DispatchUnitSearch() {
  const [searchParams] = useSearchParams()
  const cases = useStore((s) => s.cases)

  const [units, setUnits] = useState<IdemUnit[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [loading, setLoading] = useState(true)

  const [query, setQuery] = useState('')
  const [levelFilters, setLevelFilters] = useState<Set<VehicleLevel>>(new Set())
  const [provinceFilter, setProvinceFilter] = useState('')
  const [referenceCaseId, setReferenceCaseId] = useState(searchParams.get('caseId') ?? '')
  const t = useT()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(false)
    fetchAllIdemUnits()
      .then((data) => {
        if (!cancelled) setUnits(data)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const provinceOptions = useMemo(() => {
    if (!units) return []
    const distinct = [...new Set(units.map((u) => u.province).filter((p): p is string => !!p))]
    return distinct.sort((a, b) => a.localeCompare(b, 'th'))
  }, [units])

  const casesWithLocation = useMemo(
    () =>
      Object.values(cases)
        .filter((c) => c.location && c.status !== 'completed')
        .sort((a, b) => b.createdAt - a.createdAt),
    [cases],
  )

  const referenceLocation = casesWithLocation.find((c) => c.id === referenceCaseId)?.location ?? null

  function toggleLevel(level: VehicleLevel) {
    setLevelFilters((prev) => {
      const next = new Set(prev)
      if (next.has(level)) next.delete(level)
      else next.add(level)
      return next
    })
  }

  const results = useMemo(() => {
    if (!units) return []
    const trimmedQuery = query.trim().toLowerCase()
    let list = units.filter((u) => {
      if (provinceFilter && u.province !== provinceFilter) return false
      if (levelFilters.size > 0 && ![...levelFilters].some((lvl) => unitHasLevel(u, lvl))) return false
      if (!trimmedQuery) return true
      return (
        u.unitName?.toLowerCase().includes(trimmedQuery) ||
        u.unitCode.toLowerCase().includes(trimmedQuery) ||
        u.province?.toLowerCase().includes(trimmedQuery)
      )
    })

    if (referenceLocation) {
      const withDistance = list.map((u) => ({ unit: u, distanceKm: estimateUnitDistanceKm(u, referenceLocation) }))
      withDistance.sort((a, b) => {
        if (a.distanceKm === null && b.distanceKm === null) return 0
        if (a.distanceKm === null) return 1
        if (b.distanceKm === null) return -1
        return a.distanceKm - b.distanceKm
      })
      return withDistance
    }

    list = [...list].sort((a, b) => (a.unitName ?? a.unitCode).localeCompare(b.unitName ?? b.unitCode, 'th'))
    return list.map((u) => ({ unit: u, distanceKm: null as number | null }))
  }, [units, query, levelFilters, provinceFilter, referenceLocation])

  const visibleResults = results.slice(0, RESULT_LIMIT)

  return (
    <AppShell variant="dashboard" title={t('ค้นหาหน่วยปฏิบัติการ (NDEMS)')}>
      <div className="relative">
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-title text-ink">{t('ค้นหาหน่วยปฏิบัติการทั่วประเทศ')}</h1>
            <p className="mt-1 max-w-3xl text-small text-muted">
              {t('ทำเนียบหน่วยปฏิบัติการจากระบบ NDEMS ค้นหาด้วยชื่อหรือรหัส กรองตามจังหวัดหรือระดับรถ และเรียงตามระยะทางโดยประมาณจากเหตุที่เลือก')}
            </p>
          </div>

          <Card className="flex flex-col gap-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('ค้นหาด้วยชื่อหน่วย รหัสหน่วย หรือจังหวัด')}
                className="pl-9"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] md:items-start">
              <div className="flex flex-col gap-1.5">
                <p className="text-label text-ink">{t('กรองตามระดับรถ (เลือกได้หลายระดับ)')}</p>
                <div role="group" className="inline-flex h-10 rounded-lg border border-input bg-surface-alt p-0.5">
                  {VEHICLE_LEVEL_RANK.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      aria-pressed={levelFilters.has(lvl)}
                      onClick={() => toggleLevel(lvl)}
                      className={clsx(
                        'min-w-14 flex-1 rounded-md px-3 font-mono text-[13px] font-semibold tracking-wide transition-colors',
                        levelFilters.has(lvl)
                          ? clsx('border bg-surface shadow-card', VEHICLE_LEVEL_SELECTED_CLASSES[lvl])
                          : 'text-muted hover:text-ink',
                      )}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <SearchableSelect
                label={t('กรองตามจังหวัด (ไม่บังคับ)')}
                value={provinceFilter}
                onChange={setProvinceFilter}
                placeholder={t('พิมพ์ชื่อจังหวัดเพื่อค้นหา')}
                emptyLabel={t('ไม่พบจังหวัดที่ค้นหา')}
                options={[{ value: '', label: t('ทุกจังหวัด') }, ...provinceOptions.map((p) => ({ value: p, label: p }))]}
              />

              <Select
                label={t('คำนวณระยะทางโดยประมาณจากเหตุ (ไม่บังคับ)')}
                value={referenceCaseId}
                onChange={(e) => setReferenceCaseId(e.target.value)}
                hint={casesWithLocation.length === 0 ? t('ยังไม่มีเหตุที่มีข้อมูลตำแหน่งสำหรับอ้างอิง') : undefined}
              >
                <option value="">{t('ไม่ระบุ (เรียงตามชื่อหน่วย)')}</option>
                {casesWithLocation.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.caseNumber} — {c.location?.address}
                  </option>
                ))}
              </Select>
            </div>
          </Card>

          {loading ? (
            <LoadingState label={t('กำลังโหลดทำเนียบหน่วยปฏิบัติการ...')} />
          ) : loadError ? (
            <ErrorState
              title={t('โหลดข้อมูลไม่สำเร็จ')}
              description={t('ไม่สามารถโหลดทำเนียบหน่วยปฏิบัติการได้ กรุณาลองใหม่อีกครั้ง')}
              onRetry={() => window.location.reload()}
            />
          ) : results.length === 0 ? (
            <EmptyState
              icon={<Building2 className="size-6" />}
              title={t('ไม่พบหน่วยปฏิบัติการที่ค้นหา')}
              description={t('กรุณาปรับคำค้นหาหรือตัวกรองระดับรถ')}
            />
          ) : (
            <>
              <p className="text-meta text-muted">
                {t('พบ {n} หน่วย', { n: results.length.toLocaleString('th-TH') })}
                {results.length > RESULT_LIMIT && ` ${t('(แสดง {n} หน่วยแรก)', { n: RESULT_LIMIT })}`}
              </p>
              <ul className="-mt-2 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                {visibleResults.map(({ unit, distanceKm }) => (
                  <UnitRow key={unit.unitCode} unit={unit} distanceKm={distanceKm} />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}

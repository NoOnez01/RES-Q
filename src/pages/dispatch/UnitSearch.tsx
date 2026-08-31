import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { Search, MapPin, Users, Building2, Navigation as NavigationIcon } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Input, Select, SearchableSelect } from '@/components/ui/Field'
import { LoadingState, EmptyState, ErrorState } from '@/components/States'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { VehicleLevelBadge, VEHICLE_LEVEL_SELECTED_CLASSES } from '@/components/VehicleLevelBadge'
import { useStore } from '@/lib/store'
import { fetchAllIdemUnits, estimateUnitDistanceKm, unitHasLevel, STAFF_CERTIFICATION_FIELDS, type IdemUnit } from '@/lib/idemUnits'
import { VEHICLE_LEVEL_RANK, type VehicleLevel } from '@/lib/types'

const RESULT_LIMIT = 60

function UnitCard({ unit, distanceKm }: { unit: IdemUnit; distanceKm: number | null }) {
  const staffCerts = STAFF_CERTIFICATION_FIELDS.map((f) => ({ ...f, count: unit[f.key] as number | null })).filter(
    (f) => f.count && f.count > 0,
  )

  return (
    <Card className="flex flex-col gap-3 animate-fade-in-up">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-navy">{unit.unitName || unit.unitCode}</p>
          <p className="text-xs text-muted">{unit.unitCode}</p>
        </div>
        {distanceKm !== null && (
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-skyblue-light px-2.5 py-1 text-xs font-bold text-primary">
            <NavigationIcon className="size-3" />~{distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} กม.
          </div>
        )}
      </div>

      {unit.province && (
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <MapPin className="size-3.5 shrink-0" />
          {unit.province}
          {distanceKm !== null && <span className="text-muted/70">(ระยะทางโดยประมาณระดับจังหวัด)</span>}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {(['CLS', 'ALS', 'BLS'] as VehicleLevel[])
          .filter((lvl) => unitHasLevel(unit, lvl))
          .map((lvl) => (
            <VehicleLevelBadge key={lvl} level={lvl} />
          ))}
        {!unitHasLevel(unit, 'CLS') && !unitHasLevel(unit, 'ALS') && !unitHasLevel(unit, 'BLS') && (
          <span className="text-xs text-muted">ไม่มีข้อมูลรถพยาบาล</span>
        )}
      </div>

      {staffCerts.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border pt-2.5 text-xs text-muted">
          <Users className="size-3.5 shrink-0 translate-y-0.5 text-primary" />
          {staffCerts.map((f) => (
            <span key={f.label}>
              {f.label} <span className="font-bold text-navy">{f.count}</span>
            </span>
          ))}
        </div>
      )}
    </Card>
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
    <AppShell variant="dashboard" title="ค้นหาหน่วยปฏิบัติการ (NDEMS)">
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10 flex flex-col gap-5">
          <div>
            <h1 className="text-xl font-bold text-navy">ค้นหาหน่วยปฏิบัติการทั่วประเทศ</h1>
            <p className="mt-1.5 text-sm text-muted">
              ทำเนียบหน่วยปฏิบัติการจากระบบ NDEMS — ค้นหาด้วยชื่อหรือรหัส กรองตามจังหวัดหรือระดับรถ
              และเรียงตามระยะทางโดยประมาณจากเคสที่เลือก
            </p>
          </div>

          <Card className="flex flex-col gap-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาด้วยชื่อหน่วย รหัสหน่วย หรือจังหวัด"
                className="pl-11"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-navy">กรองตามระดับรถ (เลือกได้หลายระดับ)</p>
              <div className="flex gap-2">
                {VEHICLE_LEVEL_RANK.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => toggleLevel(lvl)}
                    className={clsx(
                      'flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition-colors',
                      levelFilters.has(lvl)
                        ? VEHICLE_LEVEL_SELECTED_CLASSES[lvl]
                        : 'border-border bg-white text-muted hover:border-primary/40',
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <SearchableSelect
              label="กรองตามจังหวัด (ไม่บังคับ)"
              value={provinceFilter}
              onChange={setProvinceFilter}
              placeholder="พิมพ์ชื่อจังหวัดเพื่อค้นหา"
              emptyLabel="ไม่พบจังหวัดที่ค้นหา"
              options={[{ value: '', label: 'ทุกจังหวัด' }, ...provinceOptions.map((p) => ({ value: p, label: p }))]}
            />

            <Select
              label="คำนวณระยะทางโดยประมาณจากเคส (ไม่บังคับ)"
              value={referenceCaseId}
              onChange={(e) => setReferenceCaseId(e.target.value)}
              hint={casesWithLocation.length === 0 ? 'ยังไม่มีเคสที่มีตำแหน่งให้อ้างอิง' : undefined}
            >
              <option value="">ไม่ระบุ (เรียงตามชื่อหน่วย)</option>
              {casesWithLocation.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber} — {c.location?.address}
                </option>
              ))}
            </Select>
          </Card>

          {loading ? (
            <LoadingState label="กำลังโหลดทำเนียบหน่วยปฏิบัติการ..." />
          ) : loadError ? (
            <ErrorState
              title="โหลดข้อมูลไม่สำเร็จ"
              description="ไม่สามารถโหลดทำเนียบหน่วยปฏิบัติการจาก Supabase ได้ กรุณาลองใหม่อีกครั้ง"
              onRetry={() => window.location.reload()}
            />
          ) : results.length === 0 ? (
            <EmptyState
              icon={<Building2 className="size-6" />}
              title="ไม่พบหน่วยปฏิบัติการที่ค้นหา"
              description="ลองปรับคำค้นหาหรือตัวกรองระดับรถ"
            />
          ) : (
            <>
              <p className="text-xs text-muted">
                พบ {results.length.toLocaleString('th-TH')} หน่วย
                {results.length > RESULT_LIMIT && ` — แสดง ${RESULT_LIMIT} หน่วยแรก`}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleResults.map(({ unit, distanceKm }) => (
                  <UnitCard key={unit.unitCode} unit={unit} distanceKm={distanceKm} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}

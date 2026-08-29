import clsx from 'clsx'
import type { VehicleLevel } from '@/lib/types'
import { VEHICLE_LEVEL_LABEL } from '@/lib/types'

const TONE: Record<VehicleLevel, string> = {
  CLS: 'bg-emergency/10 text-emergency-dark border-emergency/30',
  ALS: 'bg-primary/10 text-primary border-primary/30',
  BLS: 'bg-muted/10 text-muted border-border',
}

/** Selected-state classes for a level toggle/segmented-control button --
 * same color language as the badge (CLS red, ALS blue, BLS gray) so picking
 * CLS reads as "the critical tier," not just another equally-weighted
 * option. Exported for the level pickers in dispatch/CaseDetail.tsx and
 * ManageOrgs.tsx's vehicle form. */
export const VEHICLE_LEVEL_SELECTED_CLASSES: Record<VehicleLevel, string> = {
  CLS: 'border-emergency bg-emergency/10 text-emergency-dark',
  ALS: 'border-primary bg-primary/10 text-primary',
  BLS: 'border-navy bg-navy/5 text-navy',
}

/** Missing level defaults to 'BLS' -- the same lowest/safest assumption
 * used everywhere else a vehicle might predate the level column. */
export function VehicleLevelBadge({ level, className }: { level?: VehicleLevel; className?: string }) {
  const resolved = level ?? 'BLS'
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap',
        TONE[resolved],
        className,
      )}
    >
      {VEHICLE_LEVEL_LABEL[resolved]}
    </span>
  )
}

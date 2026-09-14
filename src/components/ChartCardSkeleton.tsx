import { Card } from './ui/Card'

/** Loading placeholder for a lazy-loaded chart card -- matches
 * SeverityDistributionChart's rough footprint so its Suspense fallback
 * doesn't cause a layout jump once the chart itself finishes loading. */
export function ChartCardSkeleton() {
  return (
    <Card className="flex flex-col gap-3">
      <div className="h-5 w-48 animate-pulse rounded bg-skyblue-light" />
      <div className="h-52 animate-pulse rounded-xl bg-skyblue-pale" />
    </Card>
  )
}

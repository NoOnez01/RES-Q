import { useEffect, useMemo, useRef, useState } from 'react'
import { watchPosition, toGeoLocation, type Coords } from './geolocation'
import { fetchRoute, routeProgress, type RouteProgress, type RouteResult, type VehicleStart } from './routing'
import { haversineKm } from './utils'
import { closuresKey, useRoadClosures } from './roadClosures'
import type { GeoLocation } from './types'

export interface LiveRouteState {
  /** Real road route + ETA to `target`, from whichever origin is active. */
  route: RouteResult | null
  /** GPS mode: what's left of `route` from where the vehicle is now --
   * drawn from the vehicle, with the distance and time still to go. */
  progress: RouteProgress | null
  /** The device's live GPS fix, once `gpsMode` has one. */
  gpsPos: Coords | null
  /** Untranslated message from the last GeolocationError, if watching
   * failed -- translate with `t()` at render (see GeolocationError in
   * lib/geolocation.ts for the possible messages). */
  gpsErrorMessage: string | null
}

// Off the route by more than this (or the fix's own accuracy radius, when
// that's worse) means the driver has left it -- plan again from here.
const OFF_ROUTE_M = 35
const OFF_ROUTE_MAX_M = 80
// Even on route, re-plan this often for fresh traffic.
const REFRESH_MS = 120_000
// After a failed attempt, try again no sooner than this.
const RETRY_MS = 15_000
// The GPS's own heading is only trusted while actually moving; otherwise
// it's the direction from a fix at least this far back.
const HEADING_MIN_SPEED_MPS = 2
const HEADING_MIN_MOVE_M = 15

function bearingDeg(a: Coords, b: Coords): number {
  const rad = Math.PI / 180
  const y = Math.sin((b.lng - a.lng) * rad) * Math.cos(b.lat * rad)
  const x = Math.cos(a.lat * rad) * Math.sin(b.lat * rad) - Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((b.lng - a.lng) * rad)
  return (Math.atan2(y, x) / rad + 360) % 360
}

interface Plan {
  targetKey: string
  closures: string
  gpsMode: boolean
  origin: Coords
  at: number
  ok: boolean
}

/**
 * Tracks a route to `target` from either a fixed `simulatedOrigin` or, when
 * `gpsMode` is on, the device's real live GPS position.
 *
 * With GPS, the route follows the vehicle rather than being re-requested
 * on every fix: what's drawn is the part still ahead of it (`progress`),
 * and a new route is planned only when the vehicle leaves the current one,
 * the destination or road closures change, or it's been a couple of minutes
 * (fresh traffic). A route that's still being worked out is never thrown
 * away because the vehicle moved -- on a phone a route with live traffic
 * can take several seconds, time enough to drive 100 m, and cancelling it
 * each time meant no new route ever arrived while driving. It finishes and
 * shows; if the vehicle has meanwhile left it, the next plan starts from
 * the newest position straight away. Plans from a moving vehicle carry its
 * heading and GPS accuracy, so the route sets off the way it's facing on
 * the road it's actually on.
 *
 * `rerouteThresholdKm` still governs the simulated (fixed-origin) mode.
 */
export function useLiveRoute({
  gpsMode,
  active,
  simulatedOrigin,
  target,
  rerouteThresholdKm,
}: {
  /** Use the device's real GPS position as the origin instead of `simulatedOrigin`. */
  gpsMode: boolean
  /** Master on/off switch -- when false, clears all state and stops watching. */
  active: boolean
  simulatedOrigin: GeoLocation | null
  target: GeoLocation | null
  rerouteThresholdKm: number
}): LiveRouteState {
  const [gpsPos, setGpsPos] = useState<Coords | null>(null)
  // Untranslated -- see GeolocationError in lib/geolocation.ts -- so this
  // effect never needs `t` (a new closure every render from useT()) in its
  // deps, which would otherwise tear down and recreate the actual
  // navigator.geolocation subscription on every single GPS fix.
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null)
  const [route, setRoute] = useState<RouteResult | null>(null)
  // A reported/cleared road closure changes the best route even when the
  // vehicle hasn't moved, so it re-plans on that too.
  const closures = closuresKey(useRoadClosures())
  const recentFixesRef = useRef<Coords[]>([])
  const planRef = useRef<Plan | null>(null)
  const inFlightRef = useRef<AbortController | null>(null)
  const wantReplanRef = useRef(false)
  const routeRef = useRef<RouteResult | null>(null)

  const routeOrigin: Coords | null = gpsMode ? gpsPos : simulatedOrigin
  const targetKey = target ? `${target.lat},${target.lng}` : ''
  // Read by the async continuations below, which must act on the newest
  // values rather than the ones captured when a request started.
  const latestRef = useRef({ routeOrigin, target, targetKey, closures, gpsMode, rerouteThresholdKm })
  latestRef.current = { routeOrigin, target, targetKey, closures, gpsMode, rerouteThresholdKm }

  useEffect(() => {
    if (!gpsMode || !active) {
      setGpsPos(null)
      setGpsErrorMessage(null)
      recentFixesRef.current = []
      return
    }
    setGpsErrorMessage(null)
    const stop = watchPosition(
      (pos) => {
        recentFixesRef.current = [...recentFixesRef.current.slice(-9), pos]
        setGpsPos(pos)
        setGpsErrorMessage(null)
      },
      (err) => setGpsErrorMessage(err.message),
    )
    return stop
  }, [gpsMode, active])

  /** Which way the vehicle is going: the GPS's own heading while moving,
   * else the direction from a fix far enough back to mean something. */
  function headingOf(pos: Coords): number | undefined {
    if (pos.heading !== undefined && (pos.speed ?? 0) >= HEADING_MIN_SPEED_MPS) return pos.heading
    const back = [...recentFixesRef.current].reverse().find((f) => haversineKm(f, pos) * 1000 >= HEADING_MIN_MOVE_M)
    return back ? bearingDeg(back, pos) : undefined
  }

  function needsPlan(): boolean {
    const { routeOrigin: origin, targetKey: key, closures: cl, gpsMode: gps, rerouteThresholdKm: threshold } = latestRef.current
    if (!origin) return false
    const plan = planRef.current
    if (!plan || plan.targetKey !== key || plan.closures !== cl || plan.gpsMode !== gps) return true
    if (!plan.ok) return Date.now() - plan.at > RETRY_MS
    if (!gps) return haversineKm(plan.origin, origin) >= threshold
    const current = routeRef.current
    if (!current) return false
    const tolerance = Math.min(OFF_ROUTE_MAX_M, Math.max(OFF_ROUTE_M, origin.accuracy ?? 0))
    // Only once it has actually moved since planning -- a route that doesn't
    // start right at the vehicle (a fallback service's) mustn't re-plan in
    // a loop while it's parked.
    const moved = haversineKm(plan.origin, origin) * 1000
    if (moved > tolerance && routeProgress(current, origin).offRouteM > tolerance) return true
    return Date.now() - plan.at > REFRESH_MS && haversineKm(plan.origin, origin) * 1000 > 50
  }

  function plan() {
    if (inFlightRef.current) {
      // Let the route being worked out finish -- then plan again from here.
      wantReplanRef.current = true
      return
    }
    const { routeOrigin: origin, target: dest, targetKey: key, closures: cl, gpsMode: gps } = latestRef.current
    if (!origin || !dest) return
    const controller = new AbortController()
    inFlightRef.current = controller
    wantReplanRef.current = false
    const thisPlan: Plan = { targetKey: key, closures: cl, gpsMode: gps, origin, at: Date.now(), ok: false }
    planRef.current = thisPlan
    const vehicle: VehicleStart | undefined = gps ? { heading: headingOf(origin), accuracy: origin.accuracy } : undefined
    void fetchRoute(toGeoLocation(origin), dest, controller.signal, vehicle).then((r) => {
      if (inFlightRef.current !== controller) return // cancelled: new destination, or stopped
      inFlightRef.current = null
      thisPlan.at = Date.now()
      thisPlan.ok = !!r
      // A failed re-plan keeps showing the last good route.
      if (r || !routeRef.current) {
        routeRef.current = r
        setRoute(r)
      }
      // The vehicle kept moving while this was worked out: if it has
      // already left the new route, plan again from where it is now.
      wantReplanRef.current = false
      if (needsPlan()) plan()
    })
  }

  function cancelInFlight() {
    inFlightRef.current?.abort()
    inFlightRef.current = null
    wantReplanRef.current = false
  }

  useEffect(() => {
    if (!active || !routeOrigin || !target) {
      cancelInFlight()
      planRef.current = null
      routeRef.current = null
      setRoute(null)
      return
    }
    const current = planRef.current
    // A new destination, closure set or origin mode makes the route being
    // worked out pointless -- drop it (and the old route) and start over.
    if (current && (current.targetKey !== targetKey || current.closures !== closures || current.gpsMode !== gpsMode)) {
      cancelInFlight()
      if (current.targetKey !== targetKey || current.gpsMode !== gpsMode) {
        routeRef.current = null
        setRoute(null)
      }
    }
    if (needsPlan()) plan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, routeOrigin?.lat, routeOrigin?.lng, targetKey, closures, gpsMode, rerouteThresholdKm])

  // Unmount-only cleanup: a request still in flight is abandoned, and its
  // plan mustn't count as done -- otherwise a remount that keeps these refs
  // (React StrictMode's dev double-mount) never requests again and is left
  // with no route at all.
  useEffect(() => {
    return () => {
      cancelInFlight()
      planRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const progress = useMemo(() => (gpsMode && route && gpsPos ? routeProgress(route, gpsPos) : null), [gpsMode, route, gpsPos])

  return { route, progress, gpsPos, gpsErrorMessage }
}

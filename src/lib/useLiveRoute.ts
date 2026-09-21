import { useEffect, useRef, useState } from 'react'
import { watchPosition, toGeoLocation, type Coords } from './geolocation'
import { fetchRoute, type RouteResult } from './routing'
import { haversineKm } from './utils'
import type { GeoLocation } from './types'

export interface LiveRouteState {
  /** Real road route + ETA to `target`, from whichever origin is active. */
  route: RouteResult | null
  /** The device's live GPS fix, once `gpsMode` has one. */
  gpsPos: Coords | null
  /** Untranslated message from the last GeolocationError, if watching
   * failed -- translate with `t()` at render (see GeolocationError in
   * lib/geolocation.ts for the possible messages). */
  gpsErrorMessage: string | null
}

/**
 * Tracks a route to `target` from either a fixed `simulatedOrigin` or, when
 * `gpsMode` is on, the device's real live GPS position -- re-fetching the
 * route only once the active origin has moved past `rerouteThresholdKm`,
 * not on every raw GPS fix (which can arrive many times a second).
 *
 * Applies each response via a monotonic request id, *and* aborts the
 * previous in-flight request (via lib/routing.ts's reference-counted
 * cancellation) at the exact moment a new one actually supersedes it --
 * deliberately not via this effect's own cleanup function, which would
 * fire on every single GPS fix (most of which don't cross the reroute
 * threshold and so don't start a new request at all). Tying cancellation
 * to that would abort a request that's still the one we want, right after
 * starting it.
 *
 * Extracted out of Navigation.tsx (the first consumer) as its own hook
 * rather than page-local state, since "route from wherever I actually am
 * right now" vs "route from a fixed point" is a natural seam for any other
 * live-tracking screen (e.g. a dispatch-side view) to reuse later.
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
  const lastRouteOriginRef = useRef<Coords | null>(null)
  const routeRequestIdRef = useRef(0)
  const activeControllerRef = useRef<AbortController | null>(null)

  const routeOrigin: Coords | null = gpsMode ? gpsPos : simulatedOrigin

  useEffect(() => {
    if (!gpsMode || !active) {
      setGpsPos(null)
      setGpsErrorMessage(null)
      return
    }
    setGpsErrorMessage(null)
    const stop = watchPosition(
      (pos) => {
        setGpsPos(pos)
        setGpsErrorMessage(null)
      },
      (err) => setGpsErrorMessage(err.message),
    )
    return stop
  }, [gpsMode, active])

  useEffect(() => {
    if (!active || !routeOrigin || !target) {
      setRoute(null)
      lastRouteOriginRef.current = null
      activeControllerRef.current?.abort()
      activeControllerRef.current = null
      return
    }
    const last = lastRouteOriginRef.current
    if (last && haversineKm(last, routeOrigin) < rerouteThresholdKm) return
    lastRouteOriginRef.current = routeOrigin

    // A genuinely new request supersedes whatever was previously in
    // flight -- abort that one now, right as it's actually being replaced
    // (see the hook doc comment for why this isn't done via effect
    // cleanup instead).
    activeControllerRef.current?.abort()
    const controller = new AbortController()
    activeControllerRef.current = controller

    const requestId = ++routeRequestIdRef.current
    void fetchRoute(toGeoLocation(routeOrigin), target, controller.signal).then((r) => {
      if (routeRequestIdRef.current === requestId) setRoute(r)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, routeOrigin?.lat, routeOrigin?.lng, target?.lat, target?.lng, rerouteThresholdKm])

  // Unmount-only cleanup -- separate from the per-run logic above so a
  // component unmounting mid-request still cancels it, without that
  // cleanup function also firing (and wrongly aborting a still-wanted
  // request) on every ordinary re-run of the effect above.
  useEffect(() => {
    return () => {
      activeControllerRef.current?.abort()
    }
  }, [])

  return { route, gpsPos, gpsErrorMessage }
}

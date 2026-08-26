import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

let nextId = 1

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

/** Requests the OS notification permission — call once at app startup. */
export async function initNativeNotifications(): Promise<void> {
  if (!isNativeApp()) return
  try {
    await LocalNotifications.requestPermissions()
  } catch {
    // permission prompt failing/denied shouldn't block the app
  }
}

/**
 * Shows a real system notification popup (lock screen / notification shade),
 * not just the in-app toast — this is what makes an alert visible while the
 * phone is in someone's pocket or the app is backgrounded. Always makes a
 * sound, same as the web app's alert tones.
 */
export async function showNativeNotification(title: string, body: string): Promise<void> {
  if (!isNativeApp()) return
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: nextId++,
          title,
          body,
          sound: 'default',
        },
      ],
    })
  } catch {
    // best-effort; the in-app toast/sound already covers foreground alerting
  }
}

// Stable string -> positive-int id, so repeat calls for the same alert key
// hit LocalNotifications' update-in-place behavior instead of stacking a new
// notification every tick.
const loopIds = new Map<string, number>()
function idForKey(key: string): number {
  let id = loopIds.get(key)
  if (id) return id
  id = nextId++
  loopIds.set(key, id)
  return id
}

/**
 * The web app's alert loop re-dings every few seconds until someone acts on
 * a pending case; this is the same idea for a real device — re-posts the
 * notification (with sound) for as long as the caller keeps calling it, and
 * `cancelLoopingNotification` clears it the moment the case is handled.
 */
export async function showLoopingNativeNotification(key: string, title: string, body: string): Promise<void> {
  if (!isNativeApp()) return
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: idForKey(key),
          title,
          body,
          sound: 'default',
        },
      ],
    })
  } catch {
    // best-effort
  }
}

export async function cancelLoopingNotification(key: string): Promise<void> {
  if (!isNativeApp()) return
  const id = loopIds.get(key)
  if (!id) return
  loopIds.delete(key)
  try {
    await LocalNotifications.cancel({ notifications: [{ id }] })
  } catch {
    // best-effort
  }
}

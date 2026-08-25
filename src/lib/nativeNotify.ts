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
 * phone is in someone's pocket or the app is backgrounded.
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
        },
      ],
    })
  } catch {
    // best-effort; the in-app toast/sound already covers foreground alerting
  }
}

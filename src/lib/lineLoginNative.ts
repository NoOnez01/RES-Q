import { registerPlugin } from '@capacitor/core'

interface LineLoginNativePlugin {
  /** Hands off to the LINE app itself (app-to-app login) via
   * LineLoginPlugin.java -- resolves with the raw ID token JWT string, or
   * rejects if the user cancels or the login otherwise fails. Web has no
   * implementation; callers must check isNativeApp() first. */
  login(options: { channelId: string }): Promise<{ idToken: string }>
}

export const LineLoginNative = registerPlugin<LineLoginNativePlugin>('LineLogin')

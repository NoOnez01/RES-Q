/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** LINE Login channel ID -- public (goes in the authorize URL, like an
   * OAuth client id anywhere else), unlike the channel *secret*, which only
   * ever lives server-side in the line-login-exchange Edge Function. */
  readonly VITE_LINE_LOGIN_CHANNEL_ID?: string
  /** Longdo Map API key (https://map.longdo.com/console) -- optional; used
   * for Thailand-specific, traffic-aware routing (see lib/routing.ts).
   * Longdo's map/route keys are designed for direct client-side use (like
   * Google Maps' browser key), not a server secret, so it's fine to bundle
   * this the same way as the other VITE_ vars above. Routing silently falls
   * back to OSRM (no live traffic, but free and keyless) when unset. */
  readonly VITE_LONGDO_MAP_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Document Picture-in-Picture API -- not yet in TS's bundled lib.dom.d.ts as
// of TS 5.6. Chromium-only (Chrome/Edge); feature-detect with
// `'documentPictureInPicture' in window` before use, since Safari/Firefox
// have no equivalent global at all.
interface DocumentPictureInPicture extends EventTarget {
  requestWindow(options?: { width?: number; height?: number; disallowReturnToOpener?: boolean }): Promise<Window>
  readonly window: Window | null
}

interface Window {
  documentPictureInPicture?: DocumentPictureInPicture
}

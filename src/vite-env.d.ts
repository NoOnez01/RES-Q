/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
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

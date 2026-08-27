import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'

const GITHUB_REPO = 'NoOnez01/RES-Q'

export interface AppUpdateInfo {
  version: string
  downloadUrl: string
}

/** Loose semver-ish compare -- good enough for our own "X.Y" / "X.Y.Z" tags,
 * not a general-purpose semver parser (no pre-release/build metadata). */
function isNewer(latest: string, current: string): boolean {
  const a = latest.split('.').map((n) => parseInt(n, 10) || 0)
  const b = current.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x !== y) return x > y
  }
  return false
}

/**
 * Real silent auto-update on Android needs the Play Store, which this app
 * isn't published to. This is the practical middle ground for a sideloaded
 * APK: check the repo's GitHub Releases for a newer tag on launch, and if
 * there's a matching .apk asset, hand back its direct download link so the
 * UI can prompt the user -- opening it lets the system browser/download
 * manager take over and Android's normal "install unknown app" flow handles
 * the rest. Only meaningful on a native Android build; no-ops everywhere
 * else (web, iOS, desktop).
 */
export async function checkForAppUpdate(): Promise<AppUpdateInfo | null> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return null

  try {
    const info = await App.getInfo()
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
    if (!res.ok) return null
    const release = (await res.json()) as { tag_name?: string; assets?: { name: string; browser_download_url: string }[] }
    const latestVersion = release.tag_name?.replace(/^v/, '')
    if (!latestVersion || !isNewer(latestVersion, info.version)) return null

    const apkAsset = release.assets?.find((a) => a.name.toLowerCase().endsWith('.apk'))
    if (!apkAsset) return null

    return { version: latestVersion, downloadUrl: apkAsset.browser_download_url }
  } catch {
    // Offline, rate-limited, no release published yet, etc. -- none of
    // these should ever block or disrupt using the app itself.
    return null
  }
}

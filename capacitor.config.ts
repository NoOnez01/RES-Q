import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.resq.app',
  appName: 'ResQ',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Without this, tapping "sign in with LINE/Google" navigates the
    // WebView to a host outside the app's own origin (localhost), and
    // Capacitor's Bridge.launchIntent() kicks any such navigation out to the
    // external system browser instead of loading it in-app (see
    // node_modules/@capacitor/android .../Bridge.java). That breaks the
    // whole OAuth round-trip: the provider's final redirect back to
    // https://localhost/... only resolves inside this app's own WebView,
    // not from an external browser, so the login callback never arrives.
    // Listing these hosts keeps the whole flow inside the app's WebView.
    allowNavigation: [
      'access.line.me',
      '*.line.me',
      'accounts.google.com',
      '*.google.com',
      'bdcovkvtpkhjtyjpbfta.supabase.co',
    ],
  },
  plugins: {
    LocalNotifications: {
      // Android requires a plain white silhouette here (it tints/masks the
      // icon itself), separate from the full-color app icon. See
      // android/app/src/main/res/drawable-*/ic_stat_resq.png. iOS shows the
      // app's own icon automatically -- no equivalent setting needed there.
      smallIcon: 'ic_stat_resq',
      iconColor: '#1E75F4',
    },
  },
}

export default config

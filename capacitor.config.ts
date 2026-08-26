import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.resq.app',
  appName: 'ResQ',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
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

import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.resq.app',
  appName: 'ResQ',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  // GitHub Pages project sites serve from /<repo-name>/, not the domain
  // root -- the deploy workflow sets GH_PAGES_BASE for that build only.
  // Capacitor (native app) and local dev both serve from an actual root, so
  // they fall back to '/'. react-router's basename (main.tsx) reads this
  // same value via import.meta.env.BASE_URL, so both asset URLs and route
  // matching stay consistent with wherever the app is actually mounted.
  base: process.env.GH_PAGES_BASE || '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          leaflet: ['leaflet', 'react-leaflet'],
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'],
        },
      },
    },
  },
})

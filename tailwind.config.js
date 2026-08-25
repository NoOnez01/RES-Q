/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B6EBD',
          bright: '#1479C9',
        },
        navy: '#12304A',
        skyblue: {
          light: '#EAF6FF',
          pale: '#F4FAFE',
        },
        bg: '#F6FAFD',
        border: '#D9E7F2',
        muted: '#667085',
        emergency: {
          DEFAULT: '#D92D20',
          dark: '#B42318',
        },
        warning: '#F79009',
        moderate: '#F5C542',
        success: '#12B76A',
      },
      fontFamily: {
        sans: ['"Noto Sans Thai"', '"Noto Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.75rem',
      },
      boxShadow: {
        card: '0 2px 8px 0 rgba(18, 48, 74, 0.06), 0 1px 2px 0 rgba(18, 48, 74, 0.04)',
        'card-lg': '0 8px 24px 0 rgba(18, 48, 74, 0.10), 0 2px 6px 0 rgba(18, 48, 74, 0.06)',
        'red-glow': '0 0 0 8px rgba(217, 45, 32, 0.10), 0 12px 32px 0 rgba(217, 45, 32, 0.35)',
        'red-glow-lg': '0 0 0 14px rgba(217, 45, 32, 0.12), 0 20px 48px 0 rgba(217, 45, 32, 0.40)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(217, 45, 32, 0.35), 0 12px 32px 0 rgba(217, 45, 32, 0.30)' },
          '50%': { boxShadow: '0 0 0 18px rgba(217, 45, 32, 0), 0 12px 32px 0 rgba(217, 45, 32, 0.30)' },
        },
        'fade-in': {
          from: { opacity: 0, transform: 'translateY(4px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        'fade-in-up': {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: 0, transform: 'scale(0.96)' },
          to: { opacity: 1, transform: 'scale(1)' },
        },
        'toast-in': {
          from: { opacity: 0, transform: 'translateY(-8px) scale(0.98)' },
          to: { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'spin-reverse': {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' },
        },
        'ping-slow': {
          '75%, 100%': { transform: 'scale(1.6)', opacity: 0 },
        },
        'float-a': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(14px, -18px) scale(1.05)' },
        },
        'float-b': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-18px, 14px) scale(0.96)' },
        },
        'float-c': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(10px, 16px)' },
        },
        'grid-drift': {
          from: { backgroundPosition: '0 0' },
          to: { backgroundPosition: '48px 48px' },
        },
        'wave-drift': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'mesh-breathe': {
          '0%, 100%': { opacity: 0.55, transform: 'scale(1)' },
          '50%': { opacity: 0.85, transform: 'scale(1.04)' },
        },
        'glow-breathe': {
          '0%, 100%': { opacity: 0.35 },
          '50%': { opacity: 0.65 },
        },
        'particle-float': {
          '0%': { transform: 'translateY(0) scale(1)', opacity: 0 },
          '10%': { opacity: 0.8 },
          '90%': { opacity: 0.5 },
          '100%': { transform: 'translateY(-120px) scale(0.6)', opacity: 0 },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-10%)', opacity: 0 },
          '10%': { opacity: 1 },
          '90%': { opacity: 1 },
          '100%': { transform: 'translateY(110%)', opacity: 0 },
        },
        'dash-flow': {
          to: { strokeDashoffset: -40 },
        },
        heartbeat: {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(1.35)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'count-pop': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.18)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
        'fade-in': 'fade-in 0.25s ease-out',
        'fade-in-up': 'fade-in-up 0.35s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'toast-in': 'toast-in 0.25s ease-out',
        'spin-slow': 'spin 1.4s linear infinite',
        'ping-slow': 'ping-slow 2.2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'orbit-slow': 'spin 50s linear infinite',
        'orbit-slower': 'spin-reverse 70s linear infinite',
        'float-a': 'float-a 14s ease-in-out infinite',
        'float-b': 'float-b 17s ease-in-out infinite',
        'float-c': 'float-c 11s ease-in-out infinite',
        'grid-drift': 'grid-drift 9s linear infinite',
        'wave-drift': 'wave-drift 16s linear infinite',
        'mesh-breathe': 'mesh-breathe 10s ease-in-out infinite',
        'glow-breathe': 'glow-breathe 6s ease-in-out infinite',
        'particle-float': 'particle-float 8s ease-in-out infinite',
        'scan-line': 'scan-line 3.2s ease-in-out infinite',
        'dash-flow': 'dash-flow 1.4s linear infinite',
        heartbeat: 'heartbeat 1.8s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
        'count-pop': 'count-pop 0.4s ease-out',
      },
    },
  },
  plugins: [],
}

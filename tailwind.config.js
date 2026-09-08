/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Blue-cyan-white system (see .claude/skills/blue-ui-redesign) --
        // primary/navy/skyblue/bg/border/muted keep their existing NAMES so
        // every className referencing them (bg-primary, text-navy,
        // bg-skyblue-light, ...) across the whole app repaints automatically;
        // only the VALUES moved to the flatter blue-900/slate palette.
        // emergency/warning/moderate/success are deliberately untouched --
        // severity/status color-coding is a triage signal, not decoration.
        primary: {
          DEFAULT: '#1E3A8A',
          bright: '#2563EB',
        },
        navy: '#0F172A',
        skyblue: {
          light: '#EFF6FF',
          pale: '#F8FAFC',
        },
        bg: '#FFFFFF',
        border: '#E2E8F0',
        muted: '#64748B',
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
        // Overriding Tailwind's own xl/2xl/3xl (not just the custom xl2/xl3
        // below) is what flattens every rounded-xl/2xl/3xl class already
        // written across ~50 files, app-wide, without touching any of them.
        xl: '0.5rem',
        '2xl': '0.5rem',
        '3xl': '0.5rem',
        xl2: '0.5rem',
        xl3: '0.5rem',
      },
      boxShadow: {
        // Flatter, border-first shadows -- these two custom tokens are the
        // ONLY box-shadow classes used anywhere in the app (no raw
        // shadow-lg/xl/2xl exist), so this alone removes the "deep shadow"
        // pattern everywhere a <Card> or <Button> is rendered.
        card: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        'card-lg': '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px 0 rgba(15, 23, 42, 0.06)',
        // Kept as a tight ring + short shadow (not a soft blurred "glow")
        // around the emergency color, which stays untouched per above.
        'red-glow': '0 0 0 3px rgba(217, 45, 32, 0.15), 0 2px 6px 0 rgba(217, 45, 32, 0.25)',
        'red-glow-lg': '0 0 0 4px rgba(217, 45, 32, 0.18), 0 4px 10px 0 rgba(217, 45, 32, 0.28)',
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

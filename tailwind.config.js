/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Every color resolves through a CSS variable (index.css holds the
        // light and dark values), so a theme switch swaps variables instead
        // of classNames. `rgb(var(...) / <alpha-value>)` keeps opacity
        // modifiers like bg-surface/90 working.
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          bright: 'rgb(var(--color-primary-bright) / <alpha-value>)',
          foreground: 'rgb(var(--color-primary-foreground) / <alpha-value>)',
          // Background of filled controls carrying white text.
          fill: 'rgb(var(--color-primary-fill) / <alpha-value>)',
          'fill-hover': 'rgb(var(--color-primary-fill-hover) / <alpha-value>)',
        },
        // Fixed dark navy: scrims, call backgrounds -- stays dark in both themes.
        navy: 'rgb(var(--color-navy) / <alpha-value>)',
        // Foreground text. Same light value as navy, but inverts in dark mode.
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        foreground: 'rgb(var(--color-ink) / <alpha-value>)',
        // Hover and selected tints. Kept under their historic names because
        // ~100 call sites use them; `accent` is the semantic alias.
        skyblue: {
          light: 'rgb(var(--color-skyblue-light) / <alpha-value>)',
          pale: 'rgb(var(--color-skyblue-pale) / <alpha-value>)',
        },
        accent: 'rgb(var(--color-skyblue-light) / <alpha-value>)',
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        // Form-control stroke: one step stronger than a hairline divider.
        input: 'rgb(var(--color-input) / <alpha-value>)',
        ring: 'rgb(var(--color-primary) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        emergency: {
          DEFAULT: 'rgb(var(--color-emergency) / <alpha-value>)',
          dark: 'rgb(var(--color-emergency-dark) / <alpha-value>)',
        },
        destructive: 'rgb(var(--color-emergency) / <alpha-value>)',
        info: 'rgb(var(--color-primary) / <alpha-value>)',
        // Status fills keep the brand values; `-ink` is the same hue dark
        // enough to read as text on a light surface (4.5:1).
        warning: {
          DEFAULT: 'rgb(var(--color-warning) / <alpha-value>)',
          ink: 'rgb(var(--color-warning-ink) / <alpha-value>)',
        },
        moderate: {
          DEFAULT: 'rgb(var(--color-moderate) / <alpha-value>)',
          ink: 'rgb(var(--color-moderate-ink) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--color-success) / <alpha-value>)',
          ink: 'rgb(var(--color-success-ink) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          alt: 'rgb(var(--color-surface-alt) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans Thai"', '"Noto Sans"', 'system-ui', 'sans-serif'],
      },
      // Type scale. Thai stacks vowels and tone marks above and below the
      // line, so leading never drops under ~1.35 even on headings.
      fontSize: {
        display: ['1.875rem', { lineHeight: '2.5rem', fontWeight: '700' }],
        title: ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        heading: ['1rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        subheading: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '600' }],
        body: ['0.9375rem', { lineHeight: '1.5rem' }],
        small: ['0.8125rem', { lineHeight: '1.25rem' }],
        label: ['0.8125rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        meta: ['0.75rem', { lineHeight: '1rem' }],
      },
      // A tight, enterprise radius scale. Tailwind's own steps are redefined
      // so every existing rounded-* call site moves with it: controls sit at
      // 6-8px, panels at 10-12px, and only avatars, dots and the emergency
      // call control stay fully round.
      borderRadius: {
        sm: '0.1875rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.375rem',
        xl: '0.5rem',
        '2xl': '0.625rem',
        '3xl': '0.75rem',
      },
      // Borders carry structure; shadows are only for things that float.
      boxShadow: {
        card: '0 1px 2px 0 rgb(16 24 40 / 0.04)',
        'card-lg': '0 4px 12px -2px rgb(16 24 40 / 0.10), 0 2px 4px -2px rgb(16 24 40 / 0.05)',
        overlay: '0 24px 48px -12px rgb(16 24 40 / 0.22), 0 4px 10px -4px rgb(16 24 40 / 0.08)',
        // The emergency call control is the one element allowed a colored shadow.
        'red-glow': '0 1px 2px 0 rgb(180 35 24 / 0.25), 0 10px 24px -8px rgb(217 45 32 / 0.45)',
        'red-glow-lg': '0 1px 2px 0 rgb(180 35 24 / 0.25), 0 16px 32px -10px rgb(217 45 32 / 0.5)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        // A soft ring for a live state. Tinted by --pulse (an RGB triplet,
        // primary by default); red controls set [--pulse:var(--color-emergency)].
        'pulse-glow': {
          '0%': { boxShadow: '0 0 0 0 rgb(var(--pulse, var(--color-primary)) / 0.35)' },
          '70%, 100%': { boxShadow: '0 0 0 8px rgb(var(--pulse, var(--color-primary)) / 0)' },
        },
        'fade-in': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        // Content entering the page: a short fade, barely any travel.
        'fade-in-up': {
          from: { opacity: 0, transform: 'translateY(4px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: 0, transform: 'scale(0.98) translateY(4px)' },
          to: { opacity: 1, transform: 'scale(1) translateY(0)' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'toast-in': {
          from: { opacity: 0, transform: 'translateY(-6px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'ping-slow': {
          '75%, 100%': { transform: 'scale(1.8)', opacity: 0 },
        },
        'count-pop': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.16, 1, 0.3, 1) infinite',
        'fade-in': 'fade-in 0.15s ease-out',
        'fade-in-up': 'fade-in-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slide-in-left 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        'toast-in': 'toast-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'spin-slow': 'spin 1s linear infinite',
        'ping-slow': 'ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'count-pop': 'count-pop 0.3s ease-out',
      },
    },
  },
  plugins: [
    // `docked:` -- while 1669's call is docked beside the page on a wide
    // screen (CallScreen), the page has that much less width than the
    // viewport breakpoints think.
    ({ addVariant }) => addVariant('docked', 'html[data-call-docked] &'),
  ],
}

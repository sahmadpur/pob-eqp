import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Admiralty palette — refined institutional tones
        ink: {
          DEFAULT: '#0a1d3a',
          50: '#f4f6fa',
          100: '#e6ebf3',
          200: '#c4cee0',
          300: '#94a4c2',
          400: '#5d749c',
          500: '#3a517a',
          600: '#243a5e',
          700: '#152a47',
          800: '#0a1d3a',
          900: '#04122a',
        },
        parchment: {
          DEFAULT: '#f6f3ec',
          50: '#fdfcf9',
          100: '#f9f6f0',
          200: '#f2ede1',
          300: '#e8dfca',
          400: '#d6c8a3',
        },
        brass: {
          DEFAULT: '#b08740',
          50: '#fbf6ec',
          100: '#f4e7c9',
          200: '#e7cf91',
          300: '#d4b15c',
          400: '#c19847',
          500: '#b08740',
          600: '#8c6a31',
          700: '#6b5126',
        },
        sea: {
          DEFAULT: '#3f7d6b',
          50: '#eff6f3',
          100: '#d6e8e0',
          500: '#3f7d6b',
          600: '#2f6354',
          700: '#244a3f',
        },
        wine: {
          DEFAULT: '#a83232',
          50: '#fbeded',
          100: '#f4cdcd',
          500: '#a83232',
          600: '#882424',
        },
        // Legacy POB brand colors (kept for backwards compatibility — new code uses ink/brass/sea)
        pob: {
          blue: '#0a1d3a',
          'blue-light': '#243a5e',
          navy: '#04122a',
          teal: '#3f7d6b',
          amber: '#b08740',
          red: '#a83232',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        eyebrow: '0.18em',
      },
      boxShadow: {
        admiralty: '0 1px 0 0 rgba(10, 29, 58, 0.04), 0 8px 24px -16px rgba(10, 29, 58, 0.18)',
        'admiralty-lg':
          '0 1px 0 0 rgba(10, 29, 58, 0.06), 0 24px 48px -28px rgba(10, 29, 58, 0.28)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-up': 'fade-up 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'fade-in': 'fade-in 0.5s ease-out both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;

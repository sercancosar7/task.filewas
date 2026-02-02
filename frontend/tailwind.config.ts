import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ==========================================
           Ana Renkler (CSS Variables - hex values)
           ========================================== */
        background: 'var(--background)',
        foreground: {
          DEFAULT: 'var(--foreground)',
          /* Foreground varyasyonlari (color-mix ile) */
          '1.5': 'var(--foreground-1-5)',
          '2': 'var(--foreground-2)',
          '5': 'var(--foreground-5)',
          '7': 'var(--foreground-7)',
          '10': 'var(--foreground-10)',
          '30': 'var(--foreground-30)',
          '40': 'var(--foreground-40)',
          '60': 'var(--foreground-60)',
          '95': 'var(--foreground-95)',
        },

        /* ==========================================
           Card & Popover
           ========================================== */
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },

        /* ==========================================
           Primary & Secondary
           ========================================== */
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },

        /* ==========================================
           Muted
           ========================================== */
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },

        /* ==========================================
           Accent (Violet)
           ========================================== */
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--primary-foreground)',
          '10': 'var(--accent-10)',
          '15': 'var(--accent-15)',
        },

        /* ==========================================
           Status Renkleri
           ========================================== */
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--primary-foreground)',
          '10': 'var(--destructive-10)',
          '15': 'var(--destructive-15)',
        },
        success: {
          DEFAULT: 'var(--success)',
          foreground: 'var(--primary-foreground)',
          '10': 'var(--success-10)',
          '15': 'var(--success-15)',
        },
        info: {
          DEFAULT: 'var(--info)',
          foreground: 'var(--primary-foreground)',
          '10': 'var(--info-10)',
          '15': 'var(--info-15)',
        },

        /* ==========================================
           Border, Input, Ring
           ========================================== */
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',

        /* ==========================================
           Sidebar (Craft Agents specific)
           ========================================== */
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
          hover: 'var(--sidebar-hover)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
        ],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }], // 10px - badges
        'small': ['0.6875rem', { lineHeight: '1rem' }],  // 11px - small text
        'body': ['0.9375rem', { lineHeight: '1.5' }],    // 15px - body text
        'code': ['0.8125rem', { lineHeight: '1.4' }],    // 13px - code text
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
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'spinner-grid': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        shimmer: 'shimmer 2s linear infinite',
        'spinner-grid': 'spinner-grid 1s ease-in-out infinite',
      },
      boxShadow: {
        thin: 'var(--shadow-thin)',
        minimal: 'var(--shadow-minimal)',
        middle: 'var(--shadow-middle)',
        strong: 'var(--shadow-strong)',
        'modal-small': 'var(--shadow-modal-small)',
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
      },
      zIndex: {
        panel: '50',
        modal: '200',
        overlay: '300',
        'floating-menu': '400',
        splash: '600',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config

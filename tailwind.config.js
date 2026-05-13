/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // BusTrack brand palette — bold, transit-official feel
        bus: {
          50:  '#FFF3E0',
          100: '#FFE0B2',
          200: '#FFCC80',
          300: '#FFB74D',
          400: '#FFA726',
          500: '#FF9800', // primary orange — Argentine bus culture
          600: '#FB8C00',
          700: '#F57C00',
          800: '#E65100',
          900: '#BF360C',
        },
        night: {
          50:  '#ECEFF1',
          100: '#CFD8DC',
          200: '#B0BEC5',
          300: '#90A4AE',
          400: '#78909C',
          500: '#607D8B',
          600: '#546E7A',
          700: '#455A64',
          800: '#37474F',
          900: '#263238', // dark map background
          950: '#1A2327',
        },
        moving: '#22C55E',   // bus in motion — green
        stopped: '#EF4444',  // bus stopped / not moving — red
        approaching: '#F59E0B', // bus approaching stop
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        display: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'bus-pulse': 'busPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        busPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      backgroundImage: {
        'map-gradient': 'linear-gradient(180deg, #263238 0%, #1A2327 100%)',
      },
      boxShadow: {
        'bus-card': '0 4px 24px rgba(0,0,0,0.4), 0 1px 6px rgba(0,0,0,0.2)',
        'panel': '0 0 0 1px rgba(255,152,0,0.15), 0 8px 32px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
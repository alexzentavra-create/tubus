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
        // Amex Platinum / Titanium palette
        platinum: {
          50:  '#F8F9FA',
          100: '#ECEEF1',
          200: '#D8DCE3',
          300: '#C2C8D4',   // Amex Platinum surface
          400: '#B0B8C8',   // Amex Platinum mid
          500: '#9AA4B8',   // Core platinum
          600: '#8490A8',
          700: '#6B7A94',
          800: '#556278',
          900: '#3E4D62',
        },
        // True blacks — deep obsidian
        obsidian: {
          50:  '#E8E9EA',
          100: '#C5C7CB',
          200: '#9EA2A8',
          300: '#777D87',
          400: '#5A6170',
          500: '#3D4555',
          600: '#2D3444',
          700: '#1E2433',
          800: '#131921',   // card background
          900: '#0A0E14',   // true deep black
          950: '#060810',   // void
        },
        // Accent: cool neon silver — like the shimmer on Amex Platinum
        shimmer: {
          DEFAULT: '#C8D0DC',
          dim: '#8A95A8',
          bright: '#E2E8F0',
          neon: '#B8C8E0',  // the signature blue-silver neon
        },
        // Status
        go:   '#22D3A0',  // teal-green — premium feel over pure green
        halt: '#FF4D6A',  // warm red
        near: '#F0B429',  // amber
      },
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],       // sharp geometric — premium headlines
        body:    ['"DM Sans"', 'sans-serif'],     // refined readable body
        mono:    ['"DM Mono"', 'monospace'],      // clean data display
      },
      backgroundImage: {
        'platinum-gradient': 'linear-gradient(135deg, #C2C8D4 0%, #9AA4B8 40%, #B0B8C8 70%, #D8DCE3 100%)',
        'obsidian-gradient': 'linear-gradient(180deg, #131921 0%, #0A0E14 100%)',
        'card-shine': 'linear-gradient(135deg, rgba(200,208,220,0.08) 0%, rgba(200,208,220,0) 60%)',
        'glass-border': 'linear-gradient(135deg, rgba(200,208,220,0.2), rgba(200,208,220,0.05))',
        'neon-line': 'linear-gradient(90deg, transparent, #B8C8E0, transparent)',
      },
      boxShadow: {
        'glass':      '0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,208,220,0.08)',
        'glass-lg':   '0 8px 48px rgba(0,0,0,0.8), inset 0 1px 0 rgba(200,208,220,0.1)',
        'platinum':   '0 0 40px rgba(184,200,224,0.12), 0 2px 8px rgba(0,0,0,0.6)',
        'neon-ring':  '0 0 0 1px rgba(184,200,224,0.2), 0 0 20px rgba(184,200,224,0.08)',
        'btn':        '0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)',
        'btn-hover':  '0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
      },
      animation: {
        'shimmer':     'shimmer 3s ease-in-out infinite',
        'pulse-neon':  'pulseNeon 2s ease-in-out infinite',
        'float':       'float 6s ease-in-out infinite',
        'slide-up':    'slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in':     'fadeIn 0.3s ease-out',
        'scan-line':   'scanLine 4s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        pulseNeon: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(184,200,224,0.3)', opacity: '0.8' },
          '50%': { boxShadow: '0 0 24px rgba(184,200,224,0.6)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scanLine: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
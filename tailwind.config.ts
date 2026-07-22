import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        tw: {
          black:  '#0A0A0A',
          dark:   '#111111',
          card:   '#1A1A1A',
          border: '#2A2A2A',
          red:    '#E50914',
          redHover: '#FF1A1A',
          white:  '#FFFFFF',
          gray:   '#888888',
          light:  '#CCCCCC',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Impact', 'Arial Black', 'sans-serif'],
        body:    ['var(--font-body)',    'Inter',  'system-ui',   'sans-serif'],
      },
      backgroundImage: {
        'star-swirl': "url('/star-swirl.svg')",
        'tw-gradient': 'radial-gradient(ellipse at center, #1a0000 0%, #0A0A0A 70%)',
      },
      animation: {
        'spin-slow':   'spin 20s linear infinite',
        'pulse-red':   'pulse-red 2s ease-in-out infinite',
        'float':       'float 6s ease-in-out infinite',
        'slide-up':    'slideUp 0.6s ease-out forwards',
        'fade-in':     'fadeIn 0.8s ease-out forwards',
        'shimmer':     'shimmer 2s infinite',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(229,9,20,0.4)' },
          '50%':       { boxShadow: '0 0 0 12px rgba(229,9,20,0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-12px)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(40px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

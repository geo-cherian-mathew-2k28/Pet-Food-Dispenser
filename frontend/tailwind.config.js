/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cat: {
          50:  '#fff8f0',
          100: '#fff0dc',
          200: '#ffd99e',
          300: '#ffbe5c',
          400: '#ffa026',
          500: '#f07c00',
          600: '#c95e00',
          700: '#a04500',
          800: '#7a3000',
          900: '#4d1d00',
        },
        sage: {
          50:  '#f3f7f4',
          100: '#e1ece4',
          200: '#bdd5c4',
          300: '#91b89e',
          400: '#5f9672',
          500: '#3d7754',
          600: '#2a5e3f',
          700: '#1e472e',
          800: '#14301f',
          900: '#0a1d12',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        card: '0 2px 16px rgba(0,0,0,0.08)',
        'card-hover': '0 4px 24px rgba(0,0,0,0.14)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
      animation: {
        'pulse-dot': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

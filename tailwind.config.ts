import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        nova: {
          bg: '#0d0a17',
          surface: '#1a1525',
          border: '#2a2040',
          accent: '#a855f7',
          'accent-light': '#6366f1',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          text: '#e2e8f0',
          muted: '#64748b',
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'typing': 'typing 1.4s steps(3) infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'ring-pulse': 'ring-pulse 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(168, 85, 247, 0.6)' },
        },
        'typing': {
          '0%': { content: '"."' },
          '33%': { content: '".."' },
          '66%': { content: '"..."' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'ring-pulse': {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

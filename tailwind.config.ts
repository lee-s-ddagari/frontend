import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#EEF2F3',
        'surface-alt': '#E2E8EA',
        ink: '#1B2A33',
        'ink-muted': '#5A6B74',
        safe: '#2F7D8C',
        caution: '#B08A1E',
        warning: '#B8602A',
        danger: '#6E2F2F',
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
